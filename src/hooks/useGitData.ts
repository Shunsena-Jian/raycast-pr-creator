import { useState, useEffect, useCallback } from "react";
import { runPythonScript } from "../utils/shell";
import { showToast, Toast } from "@raycast/api";

export interface GitData {
  currentBranch: string;
  remoteBranches: string[];
  contributors: string[];
  suggestedTickets: string[];
  suggestedTitle: string;
  personalizedReviewers: string[];
  defaultTargetBranch?: string;
  error?: string;
}

function isGitData(value: unknown): value is GitData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  // Check for valid GitData structure - use defensive checks for arrays
  const currentBranch = obj.currentBranch;
  const remoteBranches = obj.remoteBranches;
  const contributors = obj.contributors;
  const suggestedTickets = obj.suggestedTickets;
  const suggestedTitle = obj.suggestedTitle;
  const personalizedReviewers = obj.personalizedReviewers;

  return (
    typeof currentBranch === "string" &&
    Array.isArray(remoteBranches) &&
    Array.isArray(contributors) &&
    Array.isArray(suggestedTickets) &&
    typeof suggestedTitle === "string" &&
    Array.isArray(personalizedReviewers) &&
    (obj.defaultTargetBranch === undefined ||
      typeof obj.defaultTargetBranch === "string")
  );
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

interface SaveReviewersResult {
  success: boolean;
}

function isSaveReviewersResult(value: unknown): value is SaveReviewersResult {
  return typeof value === "object" && value !== null && "success" in value;
}

export function useGitData(repoPath?: string): {
  data: GitData | null;
  isLoading: boolean;
  error: string | null;
  saveReviewers: (reviewers: string[]) => Promise<boolean>;
  refresh: () => void;
} {
  const [data, setData] = useState<GitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (fetchRemote = false) => {
      if (!repoPath) return;

      setIsLoading(true);
      setError(null);

      try {
        const args = ["--get-data"];
        if (fetchRemote) {
          args.push("--fetch");
        }
        const result = await runPythonScript(args, repoPath);

        if (isErrorResponse(result)) {
          setError(result.error);
        } else if (isGitData(result)) {
          setData(result);
        } else {
          setError("Invalid response from git data");
        }
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch git data",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath],
  );

  useEffect(() => {
    fetchData(false); // Initial load: no fetch for speed
  }, [fetchData]);

  const saveReviewers = useCallback(
    async (reviewers: string[]): Promise<boolean> => {
      if (!repoPath) return false;
      try {
        const args = ["--save-reviewers"];
        reviewers.forEach((r) => args.push("--reviewers", r));
        const result = await runPythonScript(args, repoPath);
        if (isSaveReviewersResult(result) && result.success) {
          // Update state locally instead of full re-fetch
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  personalizedReviewers: reviewers,
                }
              : null,
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error("Failed to save reviewers:", err);
        return false;
      }
    },
    [repoPath],
  );

  return {
    data,
    isLoading,
    error,
    saveReviewers,
    refresh: () => fetchData(true),
  };
}
