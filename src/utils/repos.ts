import { LocalStorage } from "@raycast/api";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

export const SELECTED_REPO_STORAGE_KEY = "selected_repo_path";
export const RECENT_REPO_PATHS_STORAGE_KEY = "recent_repo_paths";
const MAX_RECENT_REPO_PATHS = 10;

export type RepoSource = "projects" | "recent";

export interface Repo {
  name: string;
  path: string;
  source: RepoSource;
}

function parseRepoPaths(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function serializeRepoPaths(repoPaths: string[]): string {
  return JSON.stringify(repoPaths);
}

function expandHomeDirectory(value: string): string {
  const home = process.env.HOME;

  if (!home) {
    return value;
  }

  if (value === "~") {
    return home;
  }

  if (value.startsWith("~/")) {
    return path.join(home, value.slice(2));
  }

  return value;
}

export function normalizeRepoPath(repoPath: string): string {
  return path.resolve(expandHomeDirectory(repoPath));
}

async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(repoPath);
    if (!stat.isDirectory()) {
      return false;
    }
    return existsSync(path.join(repoPath, ".git"));
  } catch {
    return false;
  }
}

async function readProjectRepos(projectsDirectory: string): Promise<Repo[]> {
  const baseDir = normalizeRepoPath(projectsDirectory);

  try {
    if (!existsSync(baseDir)) {
      return [];
    }

    const files = await fs.readdir(baseDir);
    const repos: Repo[] = [];

    for (const file of files) {
      const fullPath = path.join(baseDir, file);

      try {
        if (await isGitRepository(fullPath)) {
          repos.push({
            name: file,
            path: fullPath,
            source: "projects",
          });
        }
      } catch {
        // Ignore individual repo errors and continue scanning.
      }
    }

    return repos;
  } catch {
    return [];
  }
}

async function dedupeRecentRepos(
  recentRepoPaths: string[],
  projectRepos: Repo[],
): Promise<Repo[]> {
  const seenPaths = new Set(
    projectRepos.map((repo) => normalizeRepoPath(repo.path)),
  );
  const recentRepos: Repo[] = [];

  for (const repoPath of recentRepoPaths) {
    const normalizedPath = normalizeRepoPath(repoPath);
    if (seenPaths.has(normalizedPath)) {
      continue;
    }

    if (!(await isGitRepository(normalizedPath))) {
      continue;
    }

    recentRepos.push({
      name: path.basename(normalizedPath),
      path: normalizedPath,
      source: "recent",
    });
    seenPaths.add(normalizedPath);

    if (recentRepos.length >= MAX_RECENT_REPO_PATHS) {
      break;
    }
  }

  return recentRepos;
}

export async function getRepos(
  projectsDirectory: string,
  recentRepoPaths: string[],
): Promise<Repo[]> {
  const projectRepos = await readProjectRepos(projectsDirectory);
  const recentRepos = await dedupeRecentRepos(recentRepoPaths, projectRepos);

  return [...recentRepos, ...projectRepos];
}

export async function rememberRepoPath(repoPath: string): Promise<boolean> {
  const normalizedPath = normalizeRepoPath(repoPath);

  if (!(await isGitRepository(normalizedPath))) {
    return false;
  }

  const currentValue = await LocalStorage.getItem<string>(
    RECENT_REPO_PATHS_STORAGE_KEY,
  );
  const currentRecentRepoPaths = parseRepoPaths(currentValue);

  const nextRecentRepoPaths: string[] = [normalizedPath];

  for (const recentPath of currentRecentRepoPaths) {
    const normalizedRecentPath = normalizeRepoPath(recentPath);
    if (!nextRecentRepoPaths.includes(normalizedRecentPath)) {
      nextRecentRepoPaths.push(normalizedRecentPath);
    }

    if (nextRecentRepoPaths.length >= MAX_RECENT_REPO_PATHS) {
      break;
    }
  }

  await LocalStorage.setItem(SELECTED_REPO_STORAGE_KEY, normalizedPath);
  await LocalStorage.setItem(
    RECENT_REPO_PATHS_STORAGE_KEY,
    serializeRepoPaths(nextRecentRepoPaths),
  );
  return true;
}
