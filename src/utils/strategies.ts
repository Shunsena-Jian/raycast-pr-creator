export interface StrategyRecommendation {
  name: string;
  source: string;
  targets: string[];
}

export interface Stage {
  title: string;
  recommendation: StrategyRecommendation;
}

export const STAGING_PATTERN = /release\/\d+\.\d+\.\d+$/;
export const ALPHA_PATTERN = /release\/\d+\.\d+\.\d+-a$/;
export const BETA_PATTERN = /release\/\d+\.\d+\.\d+-b$/;

/**
 * Determines release stages based on naming conventions:
 * - release/x.y.z (Staging)
 * - release/x.y.z-a (Alpha)
 * - release/x.y.z-b (Beta)
 */
export function getReleaseStages(
  currentBranch: string,
  remoteBranches: string[],
): Stage[] {
  const releaseBranches = remoteBranches
    .filter((b) => STAGING_PATTERN.test(b))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const alphaBranches = remoteBranches
    .filter((b) => ALPHA_PATTERN.test(b))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const betaBranches = remoteBranches
    .filter((b) => BETA_PATTERN.test(b))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const stages: Stage[] = [];

  // 1. Feature/Bugfix -> Develop & Staging (Latest staging)
  if (releaseBranches.length > 0) {
    const latestRB = releaseBranches[0];
    stages.push({
      title: `Feature -> Develop & ${latestRB}`,
      recommendation: {
        name: "Release: Feature",
        source: currentBranch,
        targets: ["develop", latestRB],
      },
    });
  } else {
    stages.push({
      title: "Feature -> Develop (No release branch found)",
      recommendation: {
        name: "Release: Feature",
        source: currentBranch,
        targets: ["develop"],
      },
    });
  }

  // 2. Staging -> Alpha
  releaseBranches.forEach((rb) => {
    stages.push({
      title: `${rb} -> ${rb}-a (Alpha)`,
      recommendation: {
        name: "Release: Staging->Alpha",
        source: rb,
        targets: [`${rb}-a`],
      },
    });
  });

  // 3. Alpha -> Beta
  alphaBranches.forEach((ab) => {
    stages.push({
      title: `${ab} -> ${ab.replace("-a", "-b")} (Beta)`,
      recommendation: {
        name: "Release: Alpha->Beta",
        source: ab,
        targets: [ab.replace("-a", "-b")],
      },
    });
  });

  // 4. Beta -> Live
  betaBranches.forEach((bb) => {
    const liveBranch = remoteBranches.includes("main")
      ? "main"
      : remoteBranches.includes("master")
        ? "master"
        : "main";

    stages.push({
      title: `${bb} -> ${liveBranch} (Live)`,
      recommendation: {
        name: "Release: Beta->Live",
        source: bb,
        targets: [liveBranch],
      },
    });
  });

  return stages;
}

/**
 * Shared logic for determining standard propagation targets for parent hotfixes
 */
function getParentHotfixTargets(remoteBranches: string[]): string[] {
  const sortedBranches = [...remoteBranches].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  const releaseBranch = sortedBranches.find((b) => STAGING_PATTERN.test(b));
  const alphaBranch = sortedBranches.find((b) => ALPHA_PATTERN.test(b));
  const betaBranch = sortedBranches.find((b) => BETA_PATTERN.test(b));

  const targets = ["develop"];
  if (releaseBranch) targets.push(releaseBranch);
  if (alphaBranch) targets.push(alphaBranch);
  if (betaBranch) targets.push(betaBranch);

  const liveBranch = remoteBranches.includes("main")
    ? "main"
    : remoteBranches.includes("master")
      ? "master"
      : "main";
  targets.push(liveBranch);

  return Array.from(new Set(targets));
}

/**
 * Determines child hotfix stages (Child -> Parent)
 */
export function getChildHotfixStages(
  currentBranch: string,
  remoteBranches: string[],
): Stage[] {
  const hotfixBranches = remoteBranches.filter((b) => b.startsWith("hotfix/"));
  const childHotfixes = hotfixBranches.filter((b) =>
    b.replace("hotfix/", "").includes("-"),
  );

  const stages: Stage[] = [];

  // Add current branch if it's a child hotfix
  if (
    currentBranch.startsWith("hotfix/") &&
    currentBranch.replace("hotfix/", "").includes("-")
  ) {
    const parent = currentBranch.split("-")[0];
    stages.push({
      title: `Current: ${currentBranch} -> ${parent}`,
      recommendation: {
        name: "Hotfix: Current Child",
        source: currentBranch,
        targets: [parent],
      },
    });
  }

  // Add other available child hotfixes
  childHotfixes.forEach((ch) => {
    // Avoid duplication if it's already added as current
    if (ch === currentBranch) return;

    const parent = ch.split("-")[0];
    stages.push({
      title: `${ch} -> ${parent}`,
      recommendation: {
        name: `Hotfix: Child (${ch})`,
        source: ch,
        targets: [parent],
      },
    });
  });

  return stages;
}

/**
 * Determines parent hotfix stages (Parent -> All)
 */
export function getParentHotfixStages(
  currentBranch: string,
  remoteBranches: string[],
): Stage[] {
  const hotfixBranches = remoteBranches.filter((b) => b.startsWith("hotfix/"));
  const parentHotfixes = hotfixBranches.filter(
    (b) => !b.replace("hotfix/", "").includes("-"),
  );

  const stages: Stage[] = [];

  // 1. Detect parent from current branch if it's a hotfix (child or parent)
  if (currentBranch.startsWith("hotfix/")) {
    const detectedParent = currentBranch.split("-")[0];
    stages.push({
      title: `Parent: ${detectedParent} -> All Branches (Propagate)`,
      recommendation: {
        name: "Hotfix: Detected Parent->All",
        source: detectedParent,
        targets: getParentHotfixTargets(remoteBranches),
      },
    });
  }

  // 2. Add other available parent hotfixes
  parentHotfixes.forEach((ph) => {
    // Avoid duplication
    const detectedParent = currentBranch.startsWith("hotfix/")
      ? currentBranch.split("-")[0]
      : null;
    if (ph === detectedParent) return;

    stages.push({
      title: `${ph} -> All Branches (Propagate)`,
      recommendation: {
        name: `Hotfix: Parent (${ph})`,
        source: ph,
        targets: getParentHotfixTargets(remoteBranches),
      },
    });
  });

  return stages;
}
