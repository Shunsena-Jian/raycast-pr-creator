import { useState, useEffect, useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";

export interface Preferences {
  projectsDirectory: string;
}

export function useRepos() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    try {
      const prefs = getPreferenceValues<Preferences>();
      setPreferences(prefs);
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  }, []);

  return useMemo(() => {
    if (!preferences?.projectsDirectory) return [];

    const baseDir = preferences.projectsDirectory.replace(
      "~",
      process.env.HOME || "",
    );

    try {
      if (!fs.existsSync(baseDir)) return [];

      return fs
        .readdirSync(baseDir)
        .filter((file) => {
          const fullPath = path.join(baseDir, file);
          try {
            return (
              fs.statSync(fullPath).isDirectory() &&
              fs.existsSync(path.join(fullPath, ".git"))
            );
          } catch (e) {
            return false;
          }
        })
        .map((file) => ({
          name: file,
          path: path.join(baseDir, file),
        }));
    } catch (e) {
      console.error("Failed to read repositories:", e);
      return [];
    }
  }, [preferences?.projectsDirectory]);
}
