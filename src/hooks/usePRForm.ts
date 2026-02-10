import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { showToast, Toast, open } from "@raycast/api";
import { runPythonScript } from "../utils/shell";
import { GitData } from "./useGitData";
import { StrategyRecommendation } from "../utils/strategies";

export interface PRFormValues {
  source: string;
  targets: string[];
  jiraDetails: string;
  titleExtension: string;
  description: string;
  reviewers: string[];
}

interface UsePRFormProps {
  selectedRepoPath: string | null;
  data: GitData | null;
  setPreview: (preview: { title: string; body: string } | null) => void;
  recommendation?: StrategyRecommendation | null;
}

export function usePRForm({
  selectedRepoPath,
  data,
  setPreview,
  recommendation,
}: UsePRFormProps) {
  // --- Form States ---
  const [sourceBranch, setSourceBranch] = useState(
    recommendation?.source || "",
  );
  const [targetBranches, setTargetBranches] = useState<string[]>(
    recommendation?.targets || [],
  );
  const [jiraDetails, setJiraDetails] = useState("");
  const [titleExtension, setTitleExtension] = useState("");
  const [description, setDescription] = useState("");
  const [reviewers, setReviewers] = useState<string[]>([]);

  // --- UI/Search States ---
  const [targetSearchText, setTargetSearchText] = useState("");
  const [reviewerSearchText, setReviewerSearchText] = useState("");

  // --- Refs ---
  const isDescriptionDirty = useRef(false);

  // --- Effects ---

  // Sync data when repo data or recommendation changes
  useEffect(() => {
    if (!data) return;

    if (recommendation) {
      setSourceBranch(recommendation.source);
      setTargetBranches(recommendation.targets);
    } else {
      setSourceBranch(data.currentBranch);
      // Default target branch logic
      if (targetBranches.length === 0 && data.remoteBranches?.length > 0) {
        const defaultTarget =
          data.remoteBranches.find(
            (b) => b === "main" || b === "master" || b === "develop",
          ) || data.remoteBranches[0];
        setTargetBranches([defaultTarget]);
      }
    }

    setJiraDetails((data.suggestedTickets || []).join("\n"));
    setTitleExtension("");
  }, [data, recommendation]);

  // Fetch initial description when branches are set
  useEffect(() => {
    if (
      selectedRepoPath &&
      sourceBranch &&
      targetBranches.length > 0 &&
      !isDescriptionDirty.current
    ) {
      fetchInitialDescription();
    }
  }, [selectedRepoPath, sourceBranch, targetBranches]);

  // --- Actions ---

  const fetchInitialDescription = useCallback(async () => {
    if (!selectedRepoPath) return;
    try {
      const result = await runPythonScript(
        [
          "--get-description",
          "--source",
          sourceBranch,
          "--target",
          targetBranches[0],
        ],
        selectedRepoPath,
      );
      if (result?.description) {
        setDescription(result.description);
      }
    } catch (e) {
      console.error("Failed to fetch initial description:", e);
    }
  }, [selectedRepoPath, sourceBranch, targetBranches]);

  const handleSubmit = useCallback(
    async (values: PRFormValues) => {
      if (!values.targets || values.targets.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Target branch is required",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Pull Request(s)...",
      });

      try {
        const args: string[] = ["--headless"];
        args.push("--source", values.source);
        values.targets.forEach((t: string) => {
          args.push("--target", t);
        });

        if (values.titleExtension) args.push("--title", values.titleExtension);
        if (values.description) args.push("--body", values.description);

        const tickets = values.jiraDetails
          .split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        tickets.forEach((item: string) => args.push("--tickets", item));

        if (values.reviewers) {
          values.reviewers.forEach((r: string) => args.push("--reviewers", r));
        }

        const result = await runPythonScript(
          args,
          selectedRepoPath || undefined,
        );

        if (result.success) {
          const successResults = result.results.filter((r: any) => r.url);
          const failedResults = result.results.filter((r: any) => r.error);
          const skippedResults = result.results.filter((r: any) => r.skipped);

          if (successResults.length > 0) {
            toast.style = Toast.Style.Success;
            toast.title = "PR(s) created successfully!";
            toast.message = `Created ${successResults.length} PR(s)`;
            successResults.forEach((r: any) => open(r.url));

            toast.primaryAction = {
              title: "Open PRs",
              onAction: () => successResults.forEach((r: any) => open(r.url)),
            };

            // Reset form
            setSourceBranch(data?.currentBranch || "");
            setTargetBranches([]);
            setJiraDetails("");
            setTitleExtension("");
            setDescription("");
            setReviewers([]);
            setPreview(null);
            isDescriptionDirty.current = false;
          } else if (failedResults.length > 0) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to create PR";
            toast.message = failedResults
              .map((r: any) => `${r.target}: ${r.error}`)
              .join("\n");
          } else if (skippedResults.length > 0) {
            toast.style = Toast.Style.Success;
            toast.title = "Action Complete";
            toast.message = skippedResults
              .map((r: any) => `${r.target}: ${r.reason}`)
              .join("\n");
          }
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create PR";
        toast.message = String(error);
      }
    },
    [selectedRepoPath, data, setPreview],
  );

  // --- Derived State ---

  const allSourceOptions = useMemo(() => {
    const branches = [...(data?.remoteBranches || [])];
    if (data?.currentBranch && !branches.includes(data.currentBranch)) {
      branches.unshift(data.currentBranch);
    }
    return branches;
  }, [data]);

  const allTargetOptions = useMemo(
    () =>
      Array.from(new Set([...(data?.remoteBranches || []), ...targetBranches])),
    [data, targetBranches],
  );

  const allReviewerOptions = useMemo(
    () => Array.from(new Set([...(data?.contributors || []), ...reviewers])),
    [data, reviewers],
  );

  return {
    sourceBranch,
    setSourceBranch,
    targetBranches,
    setTargetBranches,
    jiraDetails,
    setJiraDetails,
    titleExtension,
    setTitleExtension,
    description,
    setDescription,
    reviewers,
    setReviewers,
    targetSearchText,
    setTargetSearchText,
    reviewerSearchText,
    setReviewerSearchText,
    isDescriptionDirty,
    allSourceOptions,
    allTargetOptions,
    allReviewerOptions,
    handleSubmit,
  };
}
