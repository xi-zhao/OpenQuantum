import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const ids = ["sqd-chemistry", "tjm-dynamics", "ldpc-decoding", "flow-vqe", "tenpy-ground-state", "randomized-measurements"];
const supported = ["fieldqkit-hardware", "qpanda-qubo", "quantum-circuit-verification", "qec-memory-experiment", "fatqat-workbench", "tyxonq-workbench", "quantum-information-audit", "qbraid-conversion", "qdmi-device", ...ids, "hamiltonian-simulation", "qcut-knitting", "compact-optimization", "openqarp-excited-states", "cqlib-kernel", "flagquantum-workbench", "mitiq-error-mitigation", "dynamiqs-dynamics", "clifft-sampling", "oqupy-dynamics", "deltakit-qec", "pyzx-optimization", "graphix-mbqc", "symmer-tapering", "paulie-algebra"];
const selected = process.argv.slice(2);
const allowedEnvironment = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"];
const environment = Object.fromEntries(allowedEnvironment.filter(key => process.env[key]).map(key => [key, process.env[key]]));
if (selected.some((id) => !supported.includes(id))) throw new Error(`Expected capability ids from: ${supported.join(", ")}`);
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
for (const id of selected.length ? selected : ids) {
  const skillRoot = path.join(root, ".agents/skills", id);
  const julia = id === "randomized-measurements";
  const lock = path.join(skillRoot, julia ? "Manifest.toml" : "uv.lock");
  const before = digest(lock);
  const environmentRoot = pythonEnvironmentRoot(root, id);
  const marker = path.join(environmentRoot, "openquantum-lock.sha256");
  // Never leave a previous success marker after a failed or interrupted sync.
  if (!julia) rmSync(marker, { force: true });
  console.log(`Preparing ${id} from its committed dependency lock`);
  const run = spawnSync(julia ? "julia" : "uv", julia
    ? ["--startup-file=no", `--project=${skillRoot}`, "-e", 'using Pkg; VERSION == v"1.12.7" || error("Use Julia 1.12.7 for this lock"); Pkg.instantiate(;allow_autoprecomp=false); Pkg.precompile(["JSON3", "RandomMeas"]); using JSON3, RandomMeas']
    : ["sync", "--frozen", "--no-dev", "--project", skillRoot, "--python", "3.12"], {
    cwd: root, stdio: "inherit", timeout: 1_800_000,
    env: { ...environment, UV_PROJECT_ENVIRONMENT: environmentRoot, CARGO_HOME: path.join(root, ".openquantum/cargo-cache"), JULIA_NUM_PRECOMPILE_TASKS: "2", JULIA_PKG_PRECOMPILE_AUTO: "0" },
  });
  if (run.error || run.status !== 0) throw new Error(`${id} setup failed: ${run.error?.message ?? run.status}`);
  if (digest(lock) !== before) throw new Error(`${id} dependency lock changed during setup; review before running tools`);
  if (!julia) {
    const python = path.join(environmentRoot, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    if (!existsSync(python)) throw new Error(`${id} setup did not produce Python`);
    const pending = `${marker}.${process.pid}.tmp`;
    writeFileSync(pending, before + "\n");
    renameSync(pending, marker);
  }
}
