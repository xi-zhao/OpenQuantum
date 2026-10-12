import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function assertInstalledPythonFiles(python, options = {}) {
  const check = spawnSync(python, ["-I", "-B", fileURLToPath(new URL("./check_python_install.py", import.meta.url))], {
    ...options, encoding: "utf8", timeout: 120000, maxBuffer: 1024 * 1024,
  });
  if (check.error || check.status !== 0) {
    throw new Error(`Python installation is incomplete; repair the reported packages with frozen uv sync --reinstall, then rerun setup. ${check.error?.message ?? (check.stdout || check.stderr || `exit ${check.status}`)}`);
  }
  const result = JSON.parse(check.stdout);
  if (!Array.isArray(result.incomplete) || result.incomplete.length) throw new Error("Python installed-file check did not succeed");
}
