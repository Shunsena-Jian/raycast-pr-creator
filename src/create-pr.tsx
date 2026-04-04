import { useCallback } from "react";
import { SelectRepoView } from "./components/views/SelectRepoView";
import { rememberRepoPath } from "./utils/repos";

export default function Command() {
  const handleRepoSelect = useCallback(async (repoPath: string) => {
    return await rememberRepoPath(repoPath);
  }, []);

  return <SelectRepoView onSelect={handleRepoSelect} />;
}
