import { createHash } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { pythonEnvironmentRoot } from "./prepared-python.mjs";
import { verifySdkSourceSnapshot } from "./sdk-source-record.mjs";

// Documentation and environment discovery, not a Tool registry or an executor.
// The host owns file editing, processes, permissions, cancellation and jobs.
export const SDK_CATALOG = ".agents/sdk-libraries.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const relativeProject = (id) => id === "quantum-algorithms" ? "examples/quantum-algorithms" : `.agents/skills/${id}`;
export const sdkSourceRoot = (root, id, environment = process.env) => path.join(path.resolve(root, environment.OPENQUANTUM_SDK_SOURCE_ROOT || ".openquantum/sdk-sources"), id);
export const nativeSdkRoot = (root, id, environment = process.env) => path.join(path.resolve(root, environment.OPENQUANTUM_NATIVE_SDK_ROOT || ".openquantum/sdk-native"), id);

export async function readSdkLibraries(root) {
  const catalog = JSON.parse(await fs.readFile(path.join(root, SDK_CATALOG), "utf8"));
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.libraries)) throw new Error("Unsupported SDK catalog");
  const ids = new Set();
  for (const entry of catalog.libraries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id)) throw new Error("Invalid or duplicate SDK id");
    if (!["python", "julia", "native"].includes(entry.language) || !Array.isArray(entry.modules)) throw new Error(`Invalid SDK entry: ${entry.id}`);
    if (entry.pythonVersion && !/^3\.\d+$/.test(entry.pythonVersion)) throw new Error(`Invalid Python version: ${entry.id}`);
    if (entry.nativeProject && (entry.language !== "native" || ![entry.nativeProject.manifest, entry.nativeProject.lock].every(name => /^[a-z][a-z0-9.-]*\.json$/.test(name)))) throw new Error(`Invalid native project files: ${entry.id}`);
    ids.add(entry.id);
  }
  return catalog.libraries;
}

export async function sdkInventory(root) {
  const libraries = await readSdkLibraries(root);
  const policy = parseYaml(await fs.readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  const byId = new Map(policy.packages.map((entry) => [entry.id, entry]));
  const entries = await Promise.all(libraries.map(async (library) => {
    const directory = relativeProject(library.id);
    const julia = library.language === "julia";
    const native = Boolean(library.nativeProject);
    const manifestPath = `${directory}/${native ? library.nativeProject.manifest : julia ? "Project.toml" : "pyproject.toml"}`;
    const lockPath = `${directory}/${native ? library.nativeProject.lock : julia ? "Manifest.toml" : "uv.lock"}`;
    const [manifestBytes, lockBytes] = await Promise.all([fs.readFile(path.join(root, manifestPath)), fs.readFile(path.join(root, lockPath))]);
    const manifest = native ? JSON.parse(manifestBytes) : parseToml(manifestBytes.toString());
    const lock = native ? JSON.parse(lockBytes) : parseToml(lockBytes.toString());
    if (native && (manifest.schemaVersion !== 1 || lock.schemaVersion !== 1 || !Array.isArray(lock.sources))) throw new Error(`Unsupported native SDK lock: ${library.id}`);
    if (native && (!/^[a-z][a-z0-9-]*$/.test(manifest.executable) || !/^[a-z][a-z0-9-]*$/.test(manifest.target))) throw new Error(`Invalid native executable: ${library.id}`);
    const capability = byId.get(library.id);
    if (!capability) throw new Error(`SDK has no capability: ${library.id}`);
    const providers = capability.execution?.mcpServers ?? [];
    return {
      ...library,
      project: directory,
      manifest: { path: manifestPath, sha256: sha256(manifestBytes) },
      lock: { path: lockPath, sha256: sha256(lockBytes) },
      ...(native ? { nativeExecutable: manifest.executable } : {}),
      requiresPython: manifest.project?.["requires-python"] ?? null,
      dependencies: native ? lock.sources.map(item => `${item.name}@${item.revision}`) : julia ? manifest.deps : manifest.project.dependencies,
      dependencyGroups: manifest["dependency-groups"] ?? {},
      lockedPackages: native ? lock.sources.map(item => ({ name: item.name, version: item.revision, source: { git: item.repository } }))
        : julia ? Object.entries(lock.deps).flatMap(([name, versions]) => versions.map((item) => ({ name, version: item.version ?? null })))
        : lock.package.map((item) => ({ name: item.name, version: item.version ?? null, source: item.source })),
      convenienceTools: [...(capability.execution?.nativeTools ?? []).filter(tool => !["bash", "pwsh"].includes(tool.name)).map((tool) => tool.name), ...providers.flatMap((server) => server.tools.map((tool) => tool.name))],
      hostWorkflow: "quantum-sdk-workbench",
      providers: providers.map((server) => ({ name: server.name, activation: server.activation })),
      apiAccess: library.language === "native" ? "native-source" : "host-code",
      executionVerified: "not_checked",
      scientificValidation: "not_evaluated",
    };
  }));
  return {
    schemaVersion: 1,
    libraries: entries,
    otherCapabilities: policy.packages.filter((entry) => !libraries.some((library) => library.id === entry.id)).map((entry) => ({
      id: entry.id,
      kind: entry.execution?.mcpServers?.some((server) => server.source === "external") ? "external-mcp"
        : entry.execution?.nativeTools?.length ? "native-implementation" : "reference-workflow",
      providers: (entry.execution?.mcpServers ?? []).map((server) => ({ name: server.name, source: server.source, activation: server.activation })),
    })),
  };
}

async function preparedState(command, marker, lockSha256) {
  const actual = await fs.readFile(marker, "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; });
  if (actual === null) return "not_prepared";
  if (actual.trim() !== lockSha256) return "stale";
  try { await fs.access(command, process.platform === "win32" ? constants.F_OK : constants.X_OK); }
  catch (error) { if (["ENOENT", "EACCES"].includes(error.code)) return "not_prepared"; throw error; }
  return "prepared";
}

export async function describeSdk(root, id, { environment = process.env } = {}) {
  // Resolve only reviewed catalog IDs, never arbitrary caller paths or modules.
  const inventory = await sdkInventory(root);
  const entry = inventory.libraries.find((library) => library.id === id);
  if (!entry) throw new Error(`Unknown SDK id: ${id}`);
  const project = path.join(root, entry.project);
  const setup = { command: process.execPath, args: [path.join(root, "scripts/setup-sdk.mjs"), id], cwd: root, effect: "workspace-write-and-download" };
  let interpreter = null;
  let state = "not_checked";
  if (entry.language === "python") {
    const directory = id === "quantum-algorithms" && !environment.OPENQUANTUM_PYTHON_ENV_ROOT ? path.join(project, ".venv") : pythonEnvironmentRoot(root, id, environment);
    interpreter = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    state = await preparedState(interpreter, path.join(directory, "openquantum-lock.sha256"), entry.lock.sha256);
  } else if (entry.language === "julia") {
    interpreter = environment.OPENQUANTUM_JULIA || "julia";
    // Julia's Pkg owns its depot and build state; a manifest alone is not readiness.
    state = "requires_julia_check";
  } else {
    state = "requires_native_build_check";
  }
  let nativeBuild = null;
  if (entry.nativeProject) {
    const directory = nativeSdkRoot(root, id, environment);
    const record = await fs.readFile(path.join(directory, "openquantum-native.json"), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const executable = path.join(directory, "bin", entry.nativeExecutable + (process.platform === "win32" ? ".exe" : ""));
    const bytes = await fs.readFile(executable).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const executableSha256 = bytes ? sha256(bytes) : null;
    const executableAccess = await fs.access(executable, process.platform === "win32" ? constants.F_OK : constants.X_OK).then(() => true, error => { if (["ENOENT", "EACCES"].includes(error.code)) return false; throw error; });
    const ready = record?.dependencyLockSha256 === entry.lock.sha256 && record.manifestSha256 === entry.manifest.sha256 && record.platform === process.platform && record.arch === process.arch && executableAccess && bytes && sha256(bytes) === record.executableSha256;
    nativeBuild = { directory, executable, executableSha256, state: ready ? "prepared" : "requires_native_build_check" };
    state = nativeBuild.state;
  }
  let sourceProject = null;
  if (entry.sourceProject) {
    const directory = sdkSourceRoot(root, id, environment);
    const record = await fs.readFile(path.join(directory, "openquantum-source.json"), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    let ready = record?.revision === entry.sourceProject.revision && record.repository === entry.sourceProject.repository && Object.keys(record.files ?? {}).length > 0;
    if (ready) ready = await verifySdkSourceSnapshot(directory, record);
    sourceProject = { ...entry.sourceProject, directory, state: ready ? "prepared" : "not_prepared" };
    if (!ready && state === "prepared") state = "source_not_prepared";
  }
  let nativeDependency = null;
  if (id === "qpanda-qubo" && process.platform === "darwin") {
    const directory = nativeSdkRoot(root, "qpanda-qubo", environment);
    const record = await fs.readFile(path.join(directory, "native.json"), "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const library = path.join(directory, "fmt/lib/libfmt.11.dylib");
    const bytes = await fs.readFile(library).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    const ready = record?.revision === "40626af88bd7df9a5fb80be7b25ac85b122d6c21" && record.arch === process.arch && bytes && sha256(bytes) === record.sha256;
    nativeDependency = { library, revision: record?.revision ?? null, sha256: record?.sha256 ?? null, state: ready ? "prepared" : "not_prepared" };
    if (!ready && state === "prepared") state = "native_not_prepared";
  }
  return {
    ...entry, project, environmentState: state, setup,
    ...(sourceProject ? { sourceProject } : {}),
    ...(nativeDependency ? { nativeDependency } : {}),
    ...(nativeBuild ? { nativeBuild } : {}),
    run: interpreter ? { command: interpreter, args: entry.language === "julia" ? ["--startup-file=no", `--project=${project}`, "<absolute-script.jl>"] : ["-B", "<absolute-script.py>"], cwd: "<user-workspace>", effect: "depends-on-script", resourceLimits: "host-and-user-budget",
      ...(entry.language === "julia" && environment.OPENQUANTUM_JULIA_DEPOT_PATH ? { environment: { JULIA_DEPOT_PATH: environment.OPENQUANTUM_JULIA_DEPOT_PATH } } : {}) }
      : nativeBuild ? { command: nativeBuild.executable, args: ["<reviewed-cli-arguments>"], cwd: "<user-workspace>", effect: "depends-on-command", resourceLimits: "host-and-user-budget" } : null,
    documentation: entry.language === "python" ? entry.bootstrap
      ? { mode: "in-script-after-bootstrap", note: "Use help(module) and inspect.signature after prepare_sdk in the saved script; plain python -m pydoc bypasses required loader compatibility." }
      : { command: interpreter, args: ["-m", "pydoc", "<module-from-modules>"], note: "Read the installed version's public API; this may import the selected module." } : null,
    source: entry.nativeProject ? sdkSourceRoot(root, id, environment) : entry.language === "native" ? path.join(environment.OPENQUANTUM_QDMI_HOME || path.join(root, ".openquantum/qdmi"), "source") : null,
    bootstrap: entry.bootstrap ? { path: path.join(root, "src/lib/sdk_bootstrap.py"), function: "prepare_sdk", argument: id, reason: entry.bootstrap } : null,
    readinessMeaning: "prepared verifies dependency markers and interpreter or native binary integrity, not API or scientific acceptance",
  };
}

export async function sdkCli(root, args, options) {
  if (!args.length || args[0] === "list") {
    if (args.length > 1) throw new Error("Use list, inventory, or inspect <sdk-id>");
    return readSdkLibraries(root);
  }
  if (args[0] === "inventory" && args.length === 1) return sdkInventory(root);
  if (args[0] === "inspect" && args.length === 2) return describeSdk(root, args[1], options);
  throw new Error("Use list, inventory, or inspect <sdk-id>");
}
