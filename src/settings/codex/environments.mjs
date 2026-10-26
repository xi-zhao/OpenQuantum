import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readSdkLibraries, nativeSdkRoot } from "../../lib/sdk-access.mjs";
import { pythonEnvironmentRoot } from "../../lib/prepared-python.mjs";
import { algorithmEnvironmentRoot, algorithmPreparation, algorithmGroupArgs, algorithmSelection } from "../../lib/algorithm-environment.mjs";
import { atomicWrite, digest, readOptional, withLock } from "./storage.mjs";
import { runtimeRequirements } from "./runtime-catalog.mjs";
import { EXTERNAL_MCP, externalMcp, externalProject } from "../../../runtime/chatgpt/external/catalog.mjs";

export const RUNTIME_ENV_NAMES = ["OPENQUANTUM_PYTHON_ENV_ROOT", "OPENQUANTUM_NATIVE_SDK_ROOT", "OPENQUANTUM_SDK_SOURCE_ROOT", "OPENQUANTUM_QDMI_HOME", "OPENQUANTUM_JULIA_DEPOT_PATH", "OPENQUANTUM_JULIA", "OPENQUANTUM_NETQASM_SIMULATION_PYTHON", "OPENQUANTUM_QDMI_CONFIG"];
export const runningJob = job => ["starting", "running", "cancelling"].includes(job?.status);
const live = pid => {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
};
export const jobAlive = job => runningJob(job) && (job.pid ? live(job.pid) : Date.now() - Date.parse(job.startedAt) < 30000);
const safeEnv = source => Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "UV_LINK_MODE", "OPENQUANTUM_JULIA"].filter(key => source[key]).map(key => [key, source[key]]));
export function runtimeEnvironment(directory, source = process.env) {
  return { ...safeEnv(source),
    OPENQUANTUM_PYTHON_ENV_ROOT: source.OPENQUANTUM_PYTHON_ENV_ROOT || path.join(directory, "environments/python"),
    OPENQUANTUM_NATIVE_SDK_ROOT: source.OPENQUANTUM_NATIVE_SDK_ROOT || path.join(directory, "environments/native"),
    OPENQUANTUM_SDK_SOURCE_ROOT: source.OPENQUANTUM_SDK_SOURCE_ROOT || path.join(directory, "environments/sources"),
    OPENQUANTUM_QDMI_HOME: source.OPENQUANTUM_QDMI_HOME || path.join(directory, "environments/qdmi"),
    OPENQUANTUM_JULIA_DEPOT_PATH: source.OPENQUANTUM_JULIA_DEPOT_PATH || path.join(directory, "environments/julia"),
  };
}

// A bounded installation interface over the existing SDK installers. It owns
// only explicit installation receipts and leases, not a general job runtime.
export class Environments {
  constructor({ root, directory, environment = process.env, worker = fileURLToPath(new URL("./environment-worker.mjs", import.meta.url)), nodeExecutable = process.execPath }) {
    Object.assign(this, { root, directory, worker, nodeExecutable });
    this.environment = runtimeEnvironment(directory, environment);
    this.catalog = null;
    this.ownedJobs = new Map();
    this.closed = false;
    this.starts = new Set();
  }
  async entries() { return this.catalog ??= [...await readSdkLibraries(this.root), ...EXTERNAL_MCP.map(entry => ({ id: entry.environmentId, title: entry.title, language: "python", external: true }))]; }
  async entry(id) {
    const entry = (await this.entries()).find(item => item.id === id);
    if (!entry) throw new Error("未知运行环境，请刷新插件目录");
    return entry;
  }
  file(id) { return path.join(this.directory, "installations", `${id}.json`); }
  async read(id) {
    await this.entry(id);
    const raw = await readOptional(this.file(id));
    if (!raw) return { schemaVersion: 1, id, configuration: {}, leases: [] };
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error("环境记录损坏，请保留文件并检查插件安装"); }
    if (value.schemaVersion !== 1 || value.id !== id || !Array.isArray(value.leases) || !value.configuration || typeof value.configuration !== "object") throw new Error("环境记录版本不受支持");
    return value;
  }
  async write(id, value) { await atomicWrite(this.file(id), JSON.stringify(value, null, 2) + "\n"); }
  async fingerprint(id, configuration = {}) {
    const entry = await this.entry(id);
    const project = entry.external ? externalProject(this.root, id) : id === "quantum-algorithms" ? "examples/quantum-algorithms" : `.agents/skills/${id}`;
    const lock = entry.nativeProject?.lock ?? (entry.language === "julia" ? "Manifest.toml" : "uv.lock");
    const bytes = await fs.readFile(path.resolve(this.root, project, lock));
    const adapter = entry.external ? await Promise.all(["launch.py", "qpanda_tls.py", "qpanda_compat.py", "process.mjs"].map(async file => digest(await fs.readFile(path.join(this.root, "runtime/chatgpt/external", file))))) : [];
    if (entry.external) {
      adapter.push(digest(await fs.readFile(path.join(project, "tools.json"))));
      const source = await readOptional(path.join(project, "source.json"));
      if (source) adapter.push(digest(source));
    }
    return digest(JSON.stringify([id, process.platform, process.arch, digest(bytes), configuration,
      RUNTIME_ENV_NAMES.map(key => this.environment[key] ?? null), ...(entry.external ? [adapter] : [])]));
  }
  async installation(id, entry, configuration, groups = []) {
    // Only inspect files here. Opening settings never loads modules or starts MCP.
    const exists = (file, mode = constants.F_OK) => fs.access(file, mode).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
    try {
      if (id === "quantum-algorithms") {
        const lock = digest(await fs.readFile(path.join(this.root, "examples/quantum-algorithms/uv.lock")));
        const prepared = await algorithmPreparation(algorithmEnvironmentRoot(this.root, this.environment), lock, groups);
        if (prepared.state === "prepared") return "present";
        return prepared.state === "not_prepared" ? "missing" : "incomplete";
      }
      if (id === "qdmi-device") {
        const configured = configuration.driverConfiguration;
        if (!await exists(configured || path.join(this.environment.OPENQUANTUM_QDMI_HOME, "driver.json"), constants.R_OK)) return configured ? "configuration_missing" : "missing";
      }
      if (entry.language === "python" || id === "qdmi-device") {
        const directory = pythonEnvironmentRoot(this.root, id, this.environment);
        const executable = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
        const markerPath = path.join(directory, "openquantum-lock.sha256");
        const marker = await exists(markerPath) ? await readOptional(markerPath) : null;
        const present = await exists(executable, process.platform === "win32" ? constants.F_OK : constants.X_OK);
        if (!present && marker === null) return "missing";
        const project = entry.external ? externalProject(this.root, id) : id === "quantum-algorithms" ? "examples/quantum-algorithms" : `.agents/skills/${id}`;
        if (entry.external && externalMcp(id).id === "quantum_hardware" && !await exists(path.join(directory, "source/server.py"))) return "incomplete";
        return present && marker?.trim() === digest(await fs.readFile(path.resolve(this.root, project, "uv.lock"))) ? "present" : "incomplete";
      }
      if (entry.nativeProject) {
        const directory = nativeSdkRoot(this.root, id, this.environment);
        const project = path.join(this.root, ".agents/skills", id);
        const manifestBytes = await fs.readFile(path.join(project, entry.nativeProject.manifest));
        const manifest = JSON.parse(manifestBytes);
        const executable = path.join(directory, "bin", manifest.executable + (process.platform === "win32" ? ".exe" : ""));
        const raw = await readOptional(path.join(directory, "openquantum-native.json"));
        const present = await exists(executable, process.platform === "win32" ? constants.F_OK : constants.X_OK);
        if (!raw && !present) return "missing";
        let record;
        try { record = JSON.parse(raw); } catch { return "incomplete"; }
        if (!record || typeof record !== "object" || Array.isArray(record)) return "incomplete";
        return present && record.platform === process.platform && record.arch === process.arch
          && record.manifestSha256 === digest(manifestBytes)
          && record.dependencyLockSha256 === digest(await fs.readFile(path.join(project, entry.nativeProject.lock))) ? "present" : "incomplete";
      }
      return "unknown";
    } catch (error) {
      if (["EACCES", "EPERM"].includes(error.code)) return "unreadable";
      throw error;
    }
  }
  async status(id, { groups = [] } = {}) {
    if (id === "quantum-algorithms") groups = algorithmSelection(algorithmGroupArgs(groups));
    const entry = await this.entry(id), record = await this.read(id);
    const requirements = runtimeRequirements(id);
    requirements.prerequisite = entry.language === "julia" ? "安装前需准备本机 Julia。"
      : entry.language === "python" || id === "qdmi-device" ? "安装前需准备本机 uv；安装器会准备对应的固定 Python 版本。" : "安装前需准备 Git、CMake 和 C++ 工具链。";
    const fingerprint = await this.fingerprint(id, record.configuration);
    const job = record.job ? { id: record.job.id, operation: record.job.operation, status: record.job.status, phase: record.job.phase,
      startedAt: record.job.startedAt, finishedAt: record.job.finishedAt, message: record.job.message, synced: record.job.synced === true } : null;
    if (runningJob(job) && !jobAlive(record.job)) Object.assign(job, { status: "interrupted", message: "上次操作已中断，可以重新检查或重试安装。" });
    let state = !requirements.supported ? "unsupported_platform" : record.checkRequired ? "needs_check" : "not_installed";
    let check = record.check?.fingerprint === fingerprint ? record.check : null;
    if (check?.ready) {
      // An old receipt must not survive removal of the interpreter or marker.
      const paths = check.paths ?? [];
      const present = await Promise.all(paths.map(file => fs.access(file).then(() => true, () => false)));
      const markers = await Promise.all((check.markers ?? []).map(async marker => {
        try { return digest(await fs.readFile(marker.path)) === marker.sha256; } catch { return false; }
      }));
      if (present.every(Boolean) && markers.every(Boolean)) state = "ready";
      else check = null;
    }
    if (state !== "ready" && record.check) state = record.check.fingerprint === fingerprint ? "needs_check" : "outdated";
    if (!requirements.supported) state = "unsupported_platform";
    else if (job && runningJob(job)) state = job.status === "cancelling" ? "cancelling" : "preparing";
    else if (job?.status === "failed" || job?.status === "interrupted" || job?.status === "cancelled") state = job.status;
    const installation = await this.installation(id, entry, record.configuration, groups);
    if (state === "ready" && !["present", "unknown"].includes(installation)) { state = "needs_check"; check = null; }
    if (requirements.supported && !runningJob(job) && state !== "ready") {
      // A missing environment is a normal setup step, including after a user
      // checked for an existing installation. Keep the failed check as history.
      const installFailure = ["failed", "cancelled", "interrupted"].includes(state) && job?.operation !== "check";
      if (!installFailure && installation === "missing") state = "not_installed";
      else if (!installFailure && installation === "incomplete") state = "needs_repair";
      else if (state === "not_installed" && installation === "present") state = "needs_check";
      if (installation === "configuration_missing") state = "needs_configuration";
      if (installation === "unreadable") state = "unreadable";
    }
    const algorithm = id === "quantum-algorithms" ? await algorithmPreparation(algorithmEnvironmentRoot(this.root, this.environment),
      digest(await fs.readFile(path.join(this.root, "examples/quantum-algorithms/uv.lock"))), groups) : null;
    return { id, title: entry.title, state, requirements, ...(algorithm ? { availableGroups: algorithm.availableGroups } : {}), configuration: record.configuration,
      configurationRevision: digest(JSON.stringify(record.configuration)), fingerprint,
      ready: state === "ready", checkedAt: check?.checkedAt ?? null, checks: check?.details ?? [],
      optionalSimulation: check?.optionalSimulation ?? false, installation, job, conditions: entry.conditions ?? [] };
  }
  async snapshot(ids) { return Promise.all([...new Set(ids)].map(id => this.status(id))); }
  async configure(id, values, revision) {
    await this.entry(id);
    const fields = runtimeRequirements(id).fields;
    if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some(key => !fields.some(field => field.name === key))) throw new Error("运行环境配置字段无效");
    const configuration = {};
    for (const field of fields) {
      const value = values[field.name] ?? "";
      if (typeof value !== "string" || value.length > 4096 || /[\0\r\n]/.test(value)) throw new Error("配置路径格式无效");
      if (!value.trim()) continue;
      if (!path.isAbsolute(value.trim())) throw new Error("请填写本机绝对路径");
      const stat = await fs.stat(value.trim()).catch(() => null);
      if (!stat?.isFile()) throw new Error("配置指向的文件不存在或无法读取");
      await fs.access(value.trim(), field.name === "simulationPython" && process.platform !== "win32" ? constants.X_OK : constants.R_OK);
      configuration[field.name] = value.trim();
    }
    await withLock(this.file(id), async () => {
      const record = await this.read(id);
      if (revision !== digest(JSON.stringify(record.configuration))) throw new Error("环境配置已更新，请刷新后重试");
      if (jobAlive(record.job) || record.leases.some(lease => live(lease.pid))) throw new Error("环境正在安装、检查或执行任务，请稍后修改配置");
      record.configuration = configuration; record.checkRequired = true; delete record.check; delete record.job;
      await this.write(id, record);
    });
  }
  async start(id, operation, options = {}) {
    const pending = this.startOwned(id, operation, options);
    this.starts.add(pending);
    try { return await pending; } finally { this.starts.delete(pending); }
  }
  async startOwned(id, operation, { signal, onStarted, groups = [] } = {}) {
    groups = algorithmSelection(algorithmGroupArgs(groups));
    if (groups.length && id !== "quantum-algorithms") throw new Error("依赖组只适用于 quantum-algorithms");
    if (this.closed) throw new Error("环境准备入口已关闭");
    signal?.throwIfAborted();
    await this.entry(id);
    if (!["install", "check"].includes(operation)) throw new Error("未知环境操作");
    if (!runtimeRequirements(id).supported) throw new Error("此固定版本暂不支持当前操作系统或处理器");
    await withLock(this.file(id), async () => {
      const record = await this.read(id);
      if (this.closed) throw new Error("环境准备入口已关闭");
      signal?.throwIfAborted();
      if (jobAlive(record.job)) return;
      record.leases = record.leases.filter(lease => live(lease.pid));
      if (record.leases.length) throw new Error("该环境正在执行任务，请待任务结束后再安装或检查");
      record.job = { id: randomUUID(), operation, status: "starting", phase: "准备操作", startedAt: new Date().toISOString(), pid: null, ...(id === "quantum-algorithms" ? { groups } : {}) };
      delete record.check;
      await this.write(id, record);
      if (signal?.aborted) {
        Object.assign(record.job, { status: "cancelled", finishedAt: new Date().toISOString(), message: "准备请求已取消，未启动安装程序。" });
        await this.write(id, record); signal.throwIfAborted();
      }
      const child = spawn(this.nodeExecutable, [this.worker, id, record.job.id, this.directory], {
        cwd: this.root, env: this.environment, stdio: "ignore", detached: true, windowsHide: true,
      });
      const exited = new Promise(resolve => { child.once("exit", resolve); child.once("error", resolve); });
      try {
        await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
        record.job.pid = child.pid;
      } catch {
        Object.assign(record.job, { status: "failed", message: "无法启动环境安装程序，请检查本机 Node.js 和插件安装。", finishedAt: new Date().toISOString() });
      }
      child.unref();
      if (child.pid) {
        this.ownedJobs.set(id, { jobId: record.job.id, exited });
        // Only the invocation that created this worker receives its ownership
        // token. A concurrent prepare may wait, but cannot cancel this job.
        onStarted?.({ id, jobId: record.job.id });
      }
      await this.write(id, record);
      if (signal?.aborted) {
        // Only this invocation's newly created job can be cancelled here.
        record.job.status = "cancelling"; record.job.phase = "准备请求已取消，等待进程退出";
        await this.write(id, record); signal.throwIfAborted();
      }
    });
  }
  async finishOwned(id, jobId, { cancel = false } = {}) {
    const owned = this.ownedJobs.get(id);
    if (owned?.jobId !== jobId) return;
    if (cancel) {
      // A replacement job is owned by its own caller; never cancel it using an
      // older preparation's token. The original worker detects replacement.
      await withLock(this.file(id), async () => {
        const record = await this.read(id);
        if (record.job?.id !== jobId || !jobAlive(record.job)) return;
        record.job.status = "cancelling"; record.job.phase = "正在取消，等待安装进程退出";
        await this.write(id, record);
      });
    }
    await owned.exited;
    if (this.ownedJobs.get(id) === owned) this.ownedJobs.delete(id);
  }
  async close() {
    this.closed = true;
    await Promise.allSettled([...this.starts]);
    await Promise.all([...this.ownedJobs].map(async ([id, owned]) => {
      const record = await this.read(id);
      if (record.job?.id === owned.jobId && jobAlive(record.job)) await this.cancel(id, owned.jobId);
      await owned.exited;
    }));
    this.ownedJobs.clear();
  }
  async cancel(id, jobId) {
    await withLock(this.file(id), async () => {
      const record = await this.read(id);
      if (record.job?.id !== jobId) throw new Error("环境操作已变化，请刷新后重试");
      if (!jobAlive(record.job)) return;
      // Only the owner of this random job ID handles the request. Never signal
      // an arbitrary/stale PID from a persisted record.
      record.job.status = "cancelling"; record.job.phase = "正在取消，等待安装进程退出";
      await this.write(id, record);
    });
  }
  values(id, record) {
    return { ...Object.fromEntries(RUNTIME_ENV_NAMES.filter(key => this.environment[key]).map(key => [key, this.environment[key]])),
      ...(id === "netqasm-network" && record.configuration.simulationPython ? { OPENQUANTUM_NETQASM_SIMULATION_PYTHON: record.configuration.simulationPython } : {}),
      ...(id === "qdmi-device" && record.configuration.driverConfiguration ? { OPENQUANTUM_QDMI_CONFIG: record.configuration.driverConfiguration } : {}) };
  }
  async acquire(id, tool) {
    const nonce = randomUUID(); let values;
    await withLock(this.file(id), async () => {
      const status = await this.status(id), record = await this.read(id);
      if (!status.ready) throw new Error("运行环境尚未准备好，请在 OpenQuantum 设置中安装或检查环境");
      if (tool === "simulate_squidasm_bell_pairs" && !status.optionalSimulation) throw new Error("网络仿真环境尚未配置；程序编译仍可使用。请在设置中配置并检查 SquidASM / NetSquid 环境");
      record.leases = record.leases.filter(lease => live(lease.pid));
      record.leases.push({ nonce, pid: process.pid });
      await this.write(id, record); values = this.values(id, record);
    });
    return { values, release: () => withLock(this.file(id), async () => {
      const record = await this.read(id); record.leases = record.leases.filter(lease => lease.nonce !== nonce);
      await this.write(id, record);
    }) };
  }
}
