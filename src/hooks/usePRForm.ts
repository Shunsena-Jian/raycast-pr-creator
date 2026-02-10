import { useState, useRef, useEffect, useMemo } from "react";
import { showToast, Toast, open } from "@raycast/api";
import { runPythonScript } from "../utils/shell";
import { GitData } from "./useGitData";

interface UsePRFormProps {
  selectedRepoPath: string | null;
  data: GitData | null;
  setPreview: (preview: { title: string; body: string } | null) => void;
}

export function usePRForm({
  selectedRepoPath,
  data,
  setPreview,
}: UsePRFormProps) {
  // Form States
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranches, setTargetBranches] = useState<string[]>([]);
  const [jiraDetails, setJiraDetails] = useState("");
  const [titleExtension, setTitleExtension] = useState("");
  const [description, setDescription] = useState("");
  const [reviewers, setReviewers] = useState<string[]>([]);

  // Search states for dynamic "Add" items
  const [targetSearchText, setTargetSearchText] = useState("");
  const [reviewerSearchText, setReviewerSearchText] = useState("");

  // Tracks if user has manually edited description to avoid overwriting it
  const isDescriptionDirty = useRef(false);

  // Sync initial data when repo data is fetched
  useEffect(() => {
    if (data) {
      setSourceBranch(data.currentBranch);
      setJiraDetails((data.suggestedTickets || []).join("\n"));
      setTitleExtension(data.suggestedTitle || "");
      // Pick first remote branch as default target if none selected
      if (targetBranches.length === 0 && data.remoteBranches?.length > 0) {
        const defaultTarget =
          data.remoteBranches.find(
            (b) => b === "main" || b === "master" || b === "develop",
          ) || data.remoteBranches[0];
        setTargetBranches([defaultTarget]);
      }
    }
  }, [data]);

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

  async function fetchInitialDescription() {
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
      if (result.description) {
        setDescription(result.description);
      }
    } catch (e) {
      console.error("Failed to fetch initial description:", e);
    }
  }

  // Ensure current branch is in the source options
  const allSourceOptions = useMemo(() => {
    const branches = [...(data?.remoteBranches || [])];
    if (data?.currentBranch && !branches.includes(data.currentBranch)) {
      branches.unshift(data.currentBranch);
    }
    return branches;
  }, [data?.remoteBranches, data?.currentBranch]);

  // Combine fetched remote branches with any custom ones user added
  const allTargetOptions = Array.from(
    new Set([...(data?.remoteBranches || []), ...targetBranches]),
  );
  // Combine fetched contributors with any custom reviewers user added
  const allReviewerOptions = Array.from(
    new Set([...(data?.contributors || []), ...reviewers]),
  );

  async function handleSubmit(values: any) {
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
        args.push("--target");
        args.push(t);
      });
      if (values.titleExtension) {
        args.push("--title");
        args.push(values.titleExtension);
      }
      if (values.description) {
        args.push("--body");
        args.push(values.description);
      }

      const tickets = values.jiraDetails
        .split(/[\n,]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      tickets.forEach((item: string) => {
        args.push("--tickets");
        args.push(item);
      });

      if (values.reviewers) {
        values.reviewers.forEach((r: string) => {
          args.push("--reviewers");
          args.push(r);
        });
      }

      const result = await runPythonScript(args, selectedRepoPath || undefined);

      if (result.success) {
        const successResults = result.results.filter((r: any) => r.url);
        const skippedResults = result.results.filter((r: any) => r.skipped);
        const failedResults = result.results.filter((r: any) => r.error);

        if (successResults.length > 0) {
          toast.style = Toast.Style.Success;
          toast.title = "PR(s) created successfully!";
          toast.message = `Created ${successResults.length} PR(s)`;
          successResults.forEach((r: any) => {
            open(r.url);
          });

          toast.primaryAction = {
            title: "Open PRs",
            onAction: () => {
              successResults.forEach((r: any) => {
                open(r.url);
              });
            },
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
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Done";
          toast.message = "No new PRs were needed.";
        }
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create PR";
      toast.message = String(error);
    }
  }

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
