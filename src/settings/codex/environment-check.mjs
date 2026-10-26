import fs from "node:fs/promises";
import path from "node:path";
import { describeSdk } from "../../lib/sdk-access.mjs";
import { pythonEnvironmentRoot } from "../../lib/prepared-python.mjs";
import { runSetupCommand } from "../../lib/setup-process.mjs";
import { digest } from "./storage.mjs";
import { inspectExternalEnvironment } from "../../../runtime/chatgpt/external/check.mjs";
import { algorithmGroupArgs, algorithmModules } from "../../lib/algorithm-environment.mjs";

export async function validateDriverConfiguration(file) {
  const bytes = await fs.readFile(file);
  if (bytes.length > 65536) throw new Error("QDMI 驱动清单过大");
  let config;
  try { config = JSON.parse(bytes); } catch { throw new Error("QDMI 驱动清单不是有效 JSON"); }
  if (config.interfaceVersion !== "1.3.3" || !["example", "configured"].includes(config.driverKind) || !config.driver
      || Object.keys(config).some(key => !["interfaceVersion", "driverKind", "driver", "deviceLibraries", "configuration", "exampleLifecycle", "emptyToken", "sourceCommit"].includes(key))) throw new Error("需要已审阅的 QDMI 1.3.3 驱动清单");
  if (config.deviceLibraries && (!Array.isArray(config.deviceLibraries) || config.deviceLibraries.length > 64)) throw new Error("QDMI 设备库清单无效");
  for (const key of ["emptyToken", "exampleLifecycle"]) if (config[key] !== undefined && typeof config[key] !== "boolean") throw new Error("QDMI 驱动选项无效");
  const paths = [file], markers = [{ path: file, sha256: digest(bytes) }];
  for (const entry of [config.driver, ...(config.deviceLibraries ?? []), ...(config.configuration ? [config.configuration] : [])]) {
    if (!entry || typeof entry.path !== "string" || !path.isAbsolute(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256) || Object.keys(entry).some(key => !["path", "sha256"].includes(key))) throw new Error("QDMI 清单需要绝对文件路径和 SHA-256 摘要");
    const stat = await fs.stat(entry.path);
    if (!stat.isFile() || stat.size > 256 * 1024 * 1024 || digest(await fs.readFile(entry.path)) !== entry.sha256) throw new Error("QDMI 文件不存在、过大或摘要不一致，请重新审阅驱动配置");
    paths.push(entry.path);
    markers.push({ path: entry.path, sha256: entry.sha256 });
  }
  return { paths, markers, kind: config.driverKind, sha256: digest(bytes) };
}

export async function inspectEnvironment(manager, id, record, signal, onOutput) {
  const entry = await manager.entry(id);
  if (entry.external) return inspectExternalEnvironment(manager, id, record, signal);
  const env = { ...manager.environment, ...manager.values(id, record), PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1" };
  let paths = [], markers = [], details = [], optionalSimulation = false;
  let python, algorithmGroups;
  if (id === "qdmi-device") {
    const config = env.OPENQUANTUM_QDMI_CONFIG || path.join(env.OPENQUANTUM_QDMI_HOME, "driver.json");
    const verified = await validateDriverConfiguration(config);
    paths = verified.paths;
    markers.push(...verified.markers);
    details.push(verified.kind === "example" ? "官方示例驱动已校验；返回模拟设备信息" : "驱动文件摘要已校验；实际设备连接尚未验证");
    python = path.join(pythonEnvironmentRoot(manager.root, id, env), process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  } else {
    const described = await describeSdk(manager.root, id, { environment: env, ...(id === "quantum-algorithms" ? { selection: algorithmGroupArgs(record.job?.groups) } : {}) });
    algorithmGroups = described.availableGroups;
    if (entry.language === "julia") {
      await runSetupCommand(env.OPENQUANTUM_JULIA || "julia", ["--startup-file=no", `--project=${described.project}`, "-e", entry.modules.map(name => `Base.require(Main, Symbol(${JSON.stringify(name)}))`).join("; ")], { cwd: manager.root, env: { ...env, JULIA_DEPOT_PATH: env.OPENQUANTUM_JULIA_DEPOT_PATH }, signal, capture: true, onOutput, timeoutMs: 90000 });
      paths.push(path.join(described.project, "Manifest.toml"));
    } else if (described.environmentState !== "prepared") throw new Error("运行环境缺失或与固定依赖不一致，请先安装或修复环境");
    if (entry.language === "python") python = described.run.command;
    if (described.nativeBuild) {
      paths.push(described.nativeBuild.executable);
      markers.push({ path: described.nativeBuild.executable, sha256: described.nativeBuild.executableSha256 });
    }
  }
  if (python) {
    const project = id === "quantum-algorithms" ? path.join(manager.root, "examples/quantum-algorithms") : path.join(manager.root, ".agents/skills", id);
    let marker = path.join(path.dirname(path.dirname(python)), "openquantum-lock.sha256");
    const lock = await fs.readFile(path.join(project, "uv.lock"));
    if (id === "quantum-algorithms") {
      const grouped = path.join(path.dirname(marker), "openquantum-groups.json");
      // Capture and validate the same receipt bytes that the check will retain.
      if (await fs.access(grouped).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; })) marker = grouped;
    }
    const markerBytes = await fs.readFile(marker);
    if (marker.endsWith("openquantum-groups.json")) {
      const receipt = JSON.parse(markerBytes);
      if (receipt.schemaVersion !== 1 || receipt.lockSha256 !== digest(lock)
        || JSON.stringify(receipt.groups) !== JSON.stringify(algorithmGroups)) throw new Error("运行环境依赖组已变化，请重新检查");
    } else if (markerBytes.toString("utf8").trim() !== digest(lock)) throw new Error("运行环境依赖标记不一致，请重新安装");
    markers.push({ path: marker, sha256: digest(markerBytes) });
    const modules = id === "quantum-algorithms" ? algorithmModules(algorithmGroups) : entry.modules;
    const program = ["import sys, importlib", `sys.path.insert(0, ${JSON.stringify(path.join(manager.root, "src/lib"))})`,
      ...(entry.bootstrap ? ["from sdk_bootstrap import prepare_sdk", `prepare_sdk(${JSON.stringify(id)})`] : []),
      ...modules.map(name => `importlib.import_module(${JSON.stringify(name)})`), "print('OPENQUANTUM_ENVIRONMENT_OK')"].join("\n");
    // macOS loader bootstrap must be able to re-exec a saved script.
    await fs.mkdir(path.join(manager.directory, "checks"), { recursive: true, mode: 0o700 });
    const temporary = await fs.mkdtemp(path.join(manager.directory, "checks", `${id}-`));
    let output;
    try {
      const file = path.join(temporary, "openquantum_environment_probe.py");
      await fs.writeFile(file, program, { mode: 0o600 });
      output = await runSetupCommand(python, ["-B", file], { cwd: manager.root, env, signal, capture: true, onOutput, timeoutMs: 90000 });
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
    if (!output.includes("OPENQUANTUM_ENVIRONMENT_OK")) throw new Error("运行环境检查没有返回确认结果");
    paths.push(python, marker);
    details.push("固定依赖与模块加载已检查；实际计算结果需在调用后确认");
    if (id === "netqasm-network") {
      const simulation = record.configuration.simulationPython || python;
      const program = "import importlib, importlib.metadata as m\nassert m.version('squidasm') == '0.13.6'\n" +
        ["netsquid", "netqasm", "netsquid-netbuilder", "netsquid-magic", "pydynaa"].map(name => `m.version(${JSON.stringify(name)})`).join("\n") +
        "\nimportlib.import_module('netsquid')\nimportlib.import_module('squidasm.sim.stack.program')\nprint('OPENQUANTUM_SIMULATION_OK')";
      try {
        const output = await runSetupCommand(simulation, ["-B", "-c", program], { cwd: manager.root, env, signal, capture: true, timeoutMs: 90000 });
        optionalSimulation = output.includes("OPENQUANTUM_SIMULATION_OK");
      } catch { signal?.throwIfAborted(); }
      details.push(optionalSimulation ? "可选 SquidASM / NetSquid 仿真依赖已检测" : "公开编译功能可用；可选 SquidASM / NetSquid 仿真环境未配置");
      if (optionalSimulation) paths.push(simulation);
    }
  }
  signal?.throwIfAborted();
  return { ready: true, fingerprint: await manager.fingerprint(id, record.configuration), checkedAt: new Date().toISOString(), paths, markers, details, optionalSimulation };
}
