import { LocalStorage } from "@raycast/api";
import { useCallback } from "react";
import { SelectRepoView } from "./components/views/SelectRepoView";

const REPO_PATH_KEY = "selected_repo_path";

export default function Command() {
  const handleRepoSelect = useCallback(async (repoPath: string) => {
    await LocalStorage.setItem(REPO_PATH_KEY, repoPath);
  }, []);

  return <SelectRepoView onSelect={handleRepoSelect} />;
}
