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
  error?: string;
}

export function useGitData(repoPath?: string) {
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

        if (result.error) {
          setError(result.error);
        } else {
          setData(result as GitData);
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

  const saveReviewers = async (reviewers: string[]) => {
    if (!repoPath) return false;
    try {
      const args = ["--save-reviewers"];
      reviewers.forEach((r) => args.push("--reviewers", r));
      const result = await runPythonScript(args, repoPath);
      if (result.success) {
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
  };

  return {
    data,
    isLoading,
    error,
    saveReviewers,
    refresh: () => fetchData(true),
  };
}
