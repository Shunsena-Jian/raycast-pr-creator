import { useState, useEffect } from "react";
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

  // Automatic Preview Update (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRepoPath && sourceBranch && targetBranches.length > 0) {
        updatePreview();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    selectedRepoPath,
    sourceBranch,
    targetBranches,
    jiraDetails,
    titleExtension,
    description,
  ]);

  async function updatePreview() {
    if (!selectedRepoPath) return;
    setIsRefreshing(true);
    try {
      const jiraItems = jiraDetails
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const args = ["--get-preview", "--source", sourceBranch];
      targetBranches.forEach((t) => {
        args.push("--target");
        args.push(t);
      });
      jiraItems.forEach((j) => {
        args.push("--tickets");
        args.push(j);
      });
      if (titleExtension) {
        args.push("--title");
        args.push(titleExtension);
      }
      if (description) {
        args.push("--body");
        args.push(description);
      }

      const result = await runPythonScript(args, selectedRepoPath);
      setPreview(result);
    } catch (e) {
      console.error("Preview failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  }

  return {
    isRefreshing,
    updatePreview,
  };
}
