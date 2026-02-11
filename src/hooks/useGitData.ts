import { useState, useEffect } from "react";
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

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!repoPath) {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await runPythonScript(["--get-data"], repoPath);
        if (!isMounted) return;

        if (result.error) {
          setError(result.error);
        } else {
          setData(result as GitData);
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMessage = String(err);
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch git data",
          message: errorMessage,
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [repoPath]);

  const saveReviewers = async (reviewers: string[]) => {
    if (!repoPath) return false;
    try {
      const args = ["--save-reviewers"];
      reviewers.forEach((r) => args.push("--reviewers", r));
      const result = await runPythonScript(args, repoPath);
      if (result.success) {
        // Refresh data
        const freshData = await runPythonScript(["--get-data"], repoPath);
        setData(freshData as GitData);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to save reviewers:", err);
      return false;
    }
  };

  return { data, isLoading, error, saveReviewers };
}
