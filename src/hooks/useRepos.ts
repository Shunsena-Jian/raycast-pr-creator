import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getRepos,
  readRecentRepoPaths,
  Repo,
  subscribeRepoChanges,
} from "../utils/repos";

export interface Preferences {
  projectsDirectory: string;
}

export function useRepos(): {
  repos: Repo[];
  isLoading: boolean;
} {
  const preferences = getPreferenceValues<Preferences>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return subscribeRepoChanges(() => {
      setRevision((current) => current + 1);
    });
  }, []);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (projectsDir: string): Promise<Repo[]> => {
      const recentRepoPaths = await readRecentRepoPaths();
      return await getRepos(projectsDir, recentRepoPaths);
    },
    [preferences.projectsDirectory],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (revision === 0) {
      return;
    }

    void revalidate();
  }, [revalidate, revision]);

  return { repos: data || [], isLoading };
}
