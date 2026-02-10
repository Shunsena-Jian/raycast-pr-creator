import { useState, useEffect } from "react";
import { runPythonScript } from "../utils/shell";
import { showToast, Toast } from "@raycast/api";

export interface GitData {
  currentBranch: string;
  remoteBranches: string[];
  contributors: string[];
  suggestedTickets: string[];
  suggestedTitle: string;
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

  return { data, isLoading, error };
}
