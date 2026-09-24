import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "examples/quantum-algorithms");
const python = path.join(directory, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python)) throw new Error("Prepare the open SDK examples first: npm run capability:algorithms:setup");
mkdirSync(path.join(root, ".openquantum"), { recursive: true });
const env = { ...process.env, OPENBLAS_NUM_THREADS: "1", OMP_NUM_THREADS: "1", NUMBA_NUM_THREADS: "1",
  OPENQUANTUM_REAL_ALGORITHMS: "1", OPENQUANTUM_ALGORITHM_EVIDENCE: path.join(root, ".openquantum/unitarylab-all-algorithms.json") };
for (const [command, args] of [
  [python, [path.join(directory, "test_algorithms.py")]],
  [process.execPath, ["--test", "tests/harness-open-algorithms.test.mjs"]],
]) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
