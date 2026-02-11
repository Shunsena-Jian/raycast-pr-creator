import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface Preferences {
  projectsDirectory: string;
}

export interface Repo {
  name: string;
  path: string;
}

export function useRepos() {
  const preferences = getPreferenceValues<Preferences>();

  const { data, isLoading } = useCachedPromise(
    async (projectsDir: string): Promise<Repo[]> => {
      const baseDir = projectsDir.replace("~", process.env.HOME || "");

      try {
        if (!existsSync(baseDir)) return [];

        const files = await fs.readdir(baseDir);
        const repos: Repo[] = [];

        for (const file of files) {
          const fullPath = path.join(baseDir, file);
          try {
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory() && existsSync(path.join(fullPath, ".git"))) {
              repos.push({
                name: file,
                path: fullPath,
              });
            }
          } catch (e) {
            // Ignore individual stat errors
          }
        }
        return repos;
      } catch (e) {
        console.error("Failed to read repositories:", e);
        return [];
      }
    },
    [preferences.projectsDirectory],
  );

  return { repos: data || [], isLoading };
}
