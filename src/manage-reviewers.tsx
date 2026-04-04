import { useCallback } from "react";
import { ReviewerManagementView } from "./components/ReviewerManagementView";
import { rememberRepoPath } from "./utils/repos";

export default function Command() {
  const handleRepoSelect = useCallback(async (repoPath: string) => {
    return await rememberRepoPath(repoPath);
  }, []);

  return <ReviewerManagementView onSelectRepo={handleRepoSelect} />;
}
