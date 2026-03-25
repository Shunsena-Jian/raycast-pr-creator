import { useState, useEffect, useCallback } from "react";
import { runPythonScript } from "../utils/shell";

interface PreviewResult {
  title: string;
  body: string;
  suggestedReviewers?: string[];
}

interface UsePRPreviewProps {
  selectedRepoPath: string | null;
  sourceBranch: string;
  targetBranches: string[];
  jiraDetails: string;
  titleExtension: string;
  description: string;
  setPreview: (preview: PreviewResult | null) => void;
}

function isPreviewResult(value: unknown): value is PreviewResult {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.title === "string" && typeof obj.body === "string";
}

export function usePRPreview({
  selectedRepoPath,
  sourceBranch,
  targetBranches,
  jiraDetails,
  titleExtension,
  description,
  setPreview,
}: UsePRPreviewProps): {
  isRefreshing: boolean;
  updatePreview: () => Promise<void>;
} {
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
      if (isPreviewResult(result)) {
        setPreview(result);
      } else {
        setPreview(null);
      }
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
