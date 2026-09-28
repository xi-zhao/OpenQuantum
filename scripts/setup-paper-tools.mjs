import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const ids = ["sqd-chemistry", "tjm-dynamics", "ldpc-decoding", "flow-vqe", "tenpy-ground-state", "randomized-measurements"];
const supported = ["fieldqkit-hardware", "qpanda-qubo", "quantum-circuit-verification", "qec-memory-experiment", "fatqat-workbench", "tyxonq-workbench", "quantum-information-audit", "qbraid-conversion", "qdmi-device", ...ids, "hamiltonian-simulation", "qcut-knitting", "compact-optimization", "openqarp-excited-states", "cqlib-kernel", "flagquantum-workbench", "mitiq-error-mitigation", "dynamiqs-dynamics", "clifft-sampling", "oqupy-dynamics", "deltakit-qec", "pyzx-optimization", "graphix-mbqc", "symmer-tapering", "paulie-algebra"];
supported.push("bloqade-analog");
supported.push(
  "pennylane-differentiable", "deepquantum-differentiable", "tensorcircuit-differentiable", "mindquantum-differentiable",
  "pytket-compilation", "ocean-optimization", "kaiwu-qubo", "pyquil-simulation", "spinqit-simulation", "qutrunk-simulation",
  "perceval-photonics", "iqm-circuit-workbench", "alicebob-cat-circuits", "pulser-dynamics", "qoolqit-workbench",
  "ionq-programs", "superstaq-compilation",
);
supported.push(
  "qsteed-compilation",
  "quairkit-information",
  "qcompute-simulation",
  "qibo-simulation",
  "qrisp-arithmetic",
  "lightworks-photonics",
  "braket-simulation",
  "quri-parts-estimation",
  "qdk-resource-estimation",
  "qualtran-resources",
  "openfermion-mapping",
  "mqt-ddsim",
  "mqt-qmap",
  "classiq-synthesis",
  "qctrl-workbench",
  "qua-programs",
  "laboneq-control",
  "qcarchive-query",
  "cudaq-simulation",
  "netqasm-network"
);
// These SDKs publish different Python ABIs; keep their environments isolated.
supported.push(
  "simqn-network", "qcover-optimization", "vqnet-learning", "pychemiq-chemistry",
  "qblox-scheduling", "qililab-control", "guppy-programs", "oqc-qat",
  "mrmustard-optics", "merlin-learning", "mimiq-simulation", "myqlm-simulation",
  "aqt-workbench", "oqc-cloud", "quantuminspire-cloud",
);
const pythonVersions = {
  "mrmustard-optics": "3.11",
  "qcover-optimization": "3.10",
  "pychemiq-chemistry": "3.10",
  "qcompute-simulation": "3.10",
  "netqasm-network": "3.10",
  "mindquantum-differentiable": "3.11",
  "spinqit-simulation": "3.10",
  "qutrunk-simulation": "3.10",
};
const selected = process.argv.slice(2);
const allowedEnvironment = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"];
const environment = Object.fromEntries(allowedEnvironment.filter(key => process.env[key]).map(key => [key, process.env[key]]));
if (selected.some((id) => !supported.includes(id))) throw new Error(`Expected capability ids from: ${supported.join(", ")}`);
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
for (const id of selected.length ? selected : ids) {
  if (id === "cudaq-simulation" && !(process.platform === "linux" || (process.platform === "darwin" && process.arch === "arm64"))) throw new Error("CUDA-Q 0.16.0 requires Linux or Apple Silicon macOS; prepare it on a supported host");
  if (id === "mimiq-simulation" && !((process.platform === "darwin" && process.arch === "arm64") || (["linux", "win32"].includes(process.platform) && process.arch === "x64"))) throw new Error("MIMIQ Exaqt 0.3.0 requires Apple Silicon macOS, Linux x64 (glibc >= 2.34), or Windows x64; other native targets are not published");
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
    : ["sync", "--frozen", "--no-dev", "--project", skillRoot, "--python", pythonVersions[id] ?? "3.12"], {
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
