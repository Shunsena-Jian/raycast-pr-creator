import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { environment } from "@raycast/api";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

function isValidDirectory(dirPath: string): boolean {
  try {
    return existsSync(dirPath);
  } catch {
    return false;
  }
}

export async function runPythonScript(
  args: string[],
  cwd?: string,
): Promise<unknown> {
  const scriptPath = path.join(environment.assetsPath, "pr_engine.py");
  const pythonExecutable = path.join(
    environment.assetsPath,
    "venv",
    "bin",
    "python3",
  );

  const finalArgs = [...args];
  const executionOptions: {
    cwd?: string;
    timeout: number;
    env: Record<string, string>;
    maxBuffer: number;
  } = {
    timeout: 120000,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}`,
    },
    maxBuffer: 10 * 1024 * 1024,
  };

  if (cwd) {
    if (!isValidDirectory(cwd)) {
      throw new Error(`Invalid working directory: ${cwd}`);
    }
    executionOptions.cwd = cwd;
    finalArgs.push(cwd);
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      pythonExecutable,
      [scriptPath, ...finalArgs],
      executionOptions,
    );
    if (stderr && !stdout) {
      console.warn("Python stderr:", stderr);
    }
    return JSON.parse(stdout);
  } catch (error: unknown) {
    console.error("Python Execution Error:", error);
    if (typeof error === "object" && error !== null && "stdout" in error) {
      const errWithStdout = error as { stdout?: string };
      try {
        return JSON.parse(errWithStdout.stdout || "");
      } catch (e) {
        console.warn("Failed to parse error stdout as JSON");
      }
    }
    throw error;
  }
}
