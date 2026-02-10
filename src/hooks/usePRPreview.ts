import { useState, useEffect, useCallback } from "react";
import { runPythonScript } from "../utils/shell";

interface UsePRPreviewProps {
  selectedRepoPath: string | null;
  sourceBranch: string;
  targetBranches: string[];
  jiraDetails: string;
  titleExtension: string;
  description: string;
  setPreview: (preview: { title: string; body: string } | null) => void;
}

export function usePRPreview({
  selectedRepoPath,
  sourceBranch,
  targetBranches,
  jiraDetails,
  titleExtension,
  description,
  setPreview,
}: UsePRPreviewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updatePreview = useCallback(async () => {
    if (!selectedRepoPath || !sourceBranch || targetBranches.length === 0)
      return;

    setIsRefreshing(true);
    try {
      const jiraItems = jiraDetails
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const args = ["--get-preview", "--source", sourceBranch];
      targetBranches.forEach((t) => args.push("--target", t));
      jiraItems.forEach((j) => args.push("--tickets", j));

      if (titleExtension) args.push("--title", titleExtension);
      if (description) args.push("--body", description);

      const result = await runPythonScript(args, selectedRepoPath);
      setPreview(result);
    } catch (e) {
      console.error("Preview failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    selectedRepoPath,
    sourceBranch,
    targetBranches,
    jiraDetails,
    titleExtension,
    description,
    setPreview,
  ]);

  // Automatic Preview Update (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 600); // Slightly longer debounce for better performance
    return () => clearTimeout(timer);
  }, [updatePreview]);

  return {
    isRefreshing,
    updatePreview,
  };
}
