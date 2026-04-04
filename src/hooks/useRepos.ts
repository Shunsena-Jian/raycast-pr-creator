import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { getRepos, RECENT_REPO_PATHS_STORAGE_KEY, Repo } from "../utils/repos";

export interface Preferences {
  projectsDirectory: string;
}

export function useRepos(): {
  repos: Repo[];
  isLoading: boolean;
} {
  const preferences = getPreferenceValues<Preferences>();
  const { value: recentRepoPathsValue } = useLocalStorage<string>(
    RECENT_REPO_PATHS_STORAGE_KEY,
    "[]",
  );
  const recentRepoPaths = (() => {
    if (!recentRepoPathsValue) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(recentRepoPathsValue);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  })();

  const { data, isLoading } = useCachedPromise(
    async (projectsDir: string, recentPaths: string[]): Promise<Repo[]> => {
      return await getRepos(projectsDir, recentPaths);
    },
    [preferences.projectsDirectory, recentRepoPaths],
    {
      keepPreviousData: true,
    },
  );

  return { repos: data || [], isLoading };
}
