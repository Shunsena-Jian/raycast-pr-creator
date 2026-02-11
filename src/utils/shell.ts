import { spawn } from "child_process";
import path from "path";
import { environment } from "@raycast/api";

export async function runPythonScript(
  args: string[],
  cwd?: string,
): Promise<any> {
  const scriptPath = path.join(environment.assetsPath, "pr_engine.py");
  const pythonExecutable = path.join(
    environment.assetsPath,
    "venv",
    "bin",
    "python3",
  );

  const finalArgs = [...args];
  if (cwd) {
    finalArgs.push(cwd);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [scriptPath, ...finalArgs], {
      cwd,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data;
    });

    child.stderr?.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    child.on("close", (code) => {
      if (stderr && code !== 0) {
        console.error(`Python script encountered errors (Code ${code}):\n${stderr}`);
      }

      if (!stdout && code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}`));
        } else {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      }
    });

    child.on("error", (err) => {
      console.error("Failed to start Python script:", err);
      reject(err);
    });
  });
}
