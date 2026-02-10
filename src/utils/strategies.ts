export interface StrategyRecommendation {
  name: string;
  source: string;
  targets: string[];
}

export interface Stage {
  title: string;
  recommendation: StrategyRecommendation;
}

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
  const releaseBranches = remoteBranches.filter(
    (b) => b.startsWith("release/") && !b.endsWith("-a") && !b.endsWith("-b"),
  );
  const alphaBranches = remoteBranches.filter((b) => b.endsWith("-a"));
  const betaBranches = remoteBranches.filter((b) => b.endsWith("-b"));

  const stages: Stage[] = [];

  // 1. Feature/Bugfix -> Develop & Staging
  releaseBranches.forEach((rb) => {
    stages.push({
      title: `Feature -> Develop & ${rb}`,
      recommendation: {
        name: "Release: Feature",
        source: currentBranch,
        targets: ["develop", rb],
      },
    });
  });

  if (releaseBranches.length === 0) {
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
 * Determines hotfix stages based on naming conventions:
 * - hotfix/x.y.z (Parent Hotfix)
 * - hotfix/x.y.z-foo (Child Hotfix)
 */
export function getHotfixStages(
  currentBranch: string,
  remoteBranches: string[],
): Stage[] {
  const hotfixBranches = remoteBranches.filter((b) => b.startsWith("hotfix/"));
  const parentHotfixes = hotfixBranches.filter(
    (b) => !b.replace("hotfix/", "").includes("-"),
  );
  const childHotfixes = hotfixBranches.filter((b) =>
    b.replace("hotfix/", "").includes("-"),
  );

  const stages: Stage[] = [];

  // 1. Child -> Parent
  childHotfixes.forEach((ch) => {
    const parent = ch.split("-")[0];
    stages.push({
      title: `${ch} -> ${parent}`,
      recommendation: {
        name: "Hotfix: Child",
        source: ch,
        targets: [parent],
      },
    });
  });

  // 2. Parent -> All Branches (Sync)
  parentHotfixes.forEach((ph) => {
    const releaseBranch = remoteBranches.find(
      (b) => b.startsWith("release/") && !b.endsWith("-a") && !b.endsWith("-b"),
    );
    const alphaBranch = remoteBranches.find((b) => b.endsWith("-a"));
    const betaBranch = remoteBranches.find((b) => b.endsWith("-b"));

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

    stages.push({
      title: `${ph} -> All Branches (Propagate)`,
      recommendation: {
        name: "Hotfix: Parent->All",
        source: ph,
        targets: Array.from(new Set(targets)),
      },
    });
  });

  return stages;
}
