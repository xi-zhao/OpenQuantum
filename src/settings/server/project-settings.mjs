import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import { parse, parseDocument } from "yaml";

import { quantumHardwareMcpIntegration } from "./quantum-hardware-mcp.mjs";

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const CREDENTIAL_REF = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const AGENT_CONFIG = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const CUSTOM_MCP_ID_PREFIX = "mcp-user-";
const MANAGED_SKILL_MARKER = ".openquantum-settings.json";
const MAX_MCP_ARGUMENTS = 32;
const MAX_MCP_ARGUMENT_BYTES = 1024;
const MCP_PLUGIN_NAMES = new Set([
  "@deepseek-ai/dsh-mcp-client",
  "./credentialed-mcp-client.mjs",
]);
const QISKIT_MCP_SOURCE = "https://github.com/Qiskit/mcp-servers";
const MCP_CATALOG = Object.freeze({
  openquantum_quantum: Object.freeze({
    displayName: "OpenQuantum 基态求解",
    description: "双量子位固定粒子数扇区的确定性 VQE 求解与独立科学验收。",
    provider: "OpenQuantum",
    sourceUrl: null,
    packageName: null,
    packageVersion: "0.2.0",
    setup: null,
  }),
  fieldqkit: Object.freeze({
    displayName: "FieldQKit 量子硬件",
    description:
      "统一发现夸父、天衍、国盾、腾讯、本源、FieldQuantum 与逻辑比特后端；当前只开放只读配置检查和硬件发现。",
    provider: "FieldQuantum / OpenQuantum",
    sourceUrl: "https://github.com/FieldQuantum/fieldqkit",
    packageName: "fieldqkit",
    packageVersion: "0.1.2@3ef2493",
    setup: null,
  }),
  tyxonq_local: Object.freeze({
    displayName: "TyxonQ Local",
    description:
      "本地小规模电路与噪声仿真；首次调用会由 uv 准备固定的 TyxonQ Python 环境，不连接云端或真实量子硬件。",
    provider: "TyxonQ / OpenQuantum",
    sourceUrl: "https://github.com/QureGenAI-Biotech/TyxonQ",
    packageName: "tyxonq",
    packageVersion: "1.2.0",
    setup: null,
  }),
  qiskit: Object.freeze({
    displayName: "Qiskit Circuits",
    description: "Qiskit 官方电路创建、分析、转译以及 QASM/QPY 序列化工具。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-mcp-server",
    packageVersion: "0.3.1",
    setup: null,
  }),
  qiskit_docs: Object.freeze({
    displayName: "Qiskit Docs",
    description: "Qiskit 官方文档搜索、页面读取与 IBM Quantum 错误码查询。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-docs-mcp-server",
    packageVersion: "0.3.0",
    setup: null,
  }),
  qiskit_ibm_runtime: Object.freeze({
    displayName: "IBM Quantum Runtime",
    description: "通过 Qiskit IBM Runtime 查询后端并向 IBM Quantum 提交量子任务。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-runtime-mcp-server",
    packageVersion: "0.6.1",
    setup: null,
  }),
  qiskit_ibm_transpiler: Object.freeze({
    displayName: "IBM Quantum Transpiler",
    description: "使用 IBM Quantum AI Transpiler 完成电路路由与综合优化。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-transpiler-mcp-server",
    packageVersion: "0.4.1",
    setup: null,
  }),
  qiskit_gym: Object.freeze({
    displayName: "Qiskit Gym",
    description: "社区维护的强化学习量子电路综合工具；默认关闭。",
    provider: "Qiskit Community",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-gym-mcp-server",
    packageVersion: "0.4.1",
    setup: null,
  }),
  quantum_hardware: Object.freeze({
    displayName: "Quantum Hardware MCP",
    description:
      "社区硬件控制面：查询 IBM 与 IonQ 设备，并可提交真实 QPU 任务；启用前必须审阅成本和副作用。",
    provider: "Lokesh-2025 / Community",
    sourceUrl: quantumHardwareMcpIntegration.sourceUrl,
    packageName: "quantum-hardware-mcp",
    packageVersion: quantumHardwareMcpIntegration.revision.slice(0, 12),
    setup: Object.freeze({
      entry: quantumHardwareMcpIntegration.entry,
      requiredFiles: quantumHardwareMcpIntegration.requiredFiles.map(
        (fileName) =>
          path.join(quantumHardwareMcpIntegration.relativeRoot, fileName),
      ),
      marker: quantumHardwareMcpIntegration.marker,
      source: quantumHardwareMcpIntegration.sourceUrl,
      revision: quantumHardwareMcpIntegration.revision,
      command: quantumHardwareMcpIntegration.setupCommand,
    }),
  }),
});
const MCP_CREDENTIAL_CATALOG = Object.freeze({
  QISKIT_IBM_TOKEN: Object.freeze({
    displayName: "IBM Quantum API Token",
    description:
      "供 IBM Runtime、IBM Transpiler 与可选硬件 MCP 共用；密钥只保存在 Harness 凭据库。",
    documentationUrl: "https://quantum.ibm.com/account",
  }),
  IONQ_API_KEY: Object.freeze({
    displayName: "IonQ API Key",
    description: "可选；允许 Quantum Hardware MCP 查询 IonQ 并提交模拟器或真实硬件任务。",
    documentationUrl: "https://cloud.ionq.com/",
  }),
  QUAFU_API_TOKEN: Object.freeze({
    displayName: "夸父量子云 Token",
    description: "供 FieldQKit 只读发现夸父量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quafu-sqc.baqis.ac.cn/",
  }),
  TIANYAN_API_TOKEN: Object.freeze({
    displayName: "天衍量子云 Token",
    description: "供 FieldQKit 只读发现天衍量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://qc.zdxlz.com/",
  }),
  GUODUN_API_TOKEN: Object.freeze({
    displayName: "国盾量子云 Token",
    description: "供 FieldQKit 只读发现国盾量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quantumctek-cloud.com/",
  }),
  TENCENT_API_TOKEN: Object.freeze({
    displayName: "腾讯量子云 Token",
    description: "供 FieldQKit 只读发现腾讯量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quantum.tencent.com/cloud/",
  }),
  ORIGIN_API_TOKEN: Object.freeze({
    displayName: "本源量子云 Token",
    description: "供 FieldQKit 只读发现本源量子云硬件；部分操作还需要 pyqpanda3。",
    documentationUrl: "https://qcloud.originqc.com.cn/",
  }),
  FIELDQUANTUM_API_TOKEN: Object.freeze({
    displayName: "FieldQuantum API Token",
    description: "供 FieldQKit 访问 FieldQuantum 云端模拟器。",
    documentationUrl: "https://fieldquantum.tech/",
  }),
  LOGICALQUBIT_API_TOKEN: Object.freeze({
    displayName: "逻辑比特量子云 Token",
    description: "供 FieldQKit 只读发现逻辑比特量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://cloud.logicalqubit.com/",
  }),
});

export class ProjectSettingsConflictError extends Error {
  constructor() {
    super("配置已被其他操作更新，请刷新后重试");
    this.name = "ProjectSettingsConflictError";
  }
}

function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} 必须是布尔值`);
  }
}

function assertInteger(value, field, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${field} 必须是 ${minimum}–${maximum} 之间的整数`);
  }
}

function assertRevision(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new TypeError("配置 revision 无效");
  }
}

function requiredText(value, field, maximumBytes) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} 必须是字符串`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || Buffer.byteLength(trimmed, "utf8") > maximumBytes) {
    throw new TypeError(`${field} 必须是非空文本且不超过 ${maximumBytes} 字节`);
  }
  if (trimmed.includes("\0")) {
    throw new TypeError(`${field} 不能包含 NUL 字符`);
  }
  return trimmed;
}

function optionalCredentialRef(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !CREDENTIAL_REF.test(value)) {
    throw new TypeError("credentialRef 必须是 POSIX 环境变量名");
  }
  return value;
}

function customMcpId(serverName) {
  return `${CUSTOM_MCP_ID_PREFIX}${serverName}`;
}

function isManagedMcpEntry(entry, serverName) {
  return isRecord(entry) && entry.id === customMcpId(serverName);
}

function frontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new TypeError("Skill 缺少 YAML frontmatter");
  }
  const document = parseDocument(match[1], { strict: true, uniqueKeys: true });
  if (document.errors.length > 0) {
    throw document.errors[0];
  }
  const value = document.toJS();
  if (!isRecord(value)) {
    throw new TypeError("Skill frontmatter 必须是对象");
  }
  return { document, value, body: raw.slice(match[0].length) };
}

async function regularFile(filePath) {
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new TypeError("配置目标必须是普通文件");
  }
  return info;
}

async function containedRoot(projectRoot) {
  return realpath(projectRoot);
}

async function containedDirectory(projectRoot, relativePath, { create = false } = {}) {
  const root = await containedRoot(projectRoot);
  const candidate = path.resolve(root, relativePath);
  if (create) {
    await mkdir(candidate, { recursive: true, mode: 0o700 });
  }
  const info = await lstat(candidate);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new TypeError("配置目录必须是普通目录");
  }
  const resolved = await realpath(candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new TypeError("配置目录越出项目目录");
  }
  return resolved;
}

async function containedFile(projectRoot, relativePath) {
  const root = await containedRoot(projectRoot);
  const candidate = path.resolve(root, relativePath);
  await regularFile(candidate);
  const resolved = await realpath(candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new TypeError("配置路径越出项目目录");
  }
  await regularFile(resolved);
  return resolved;
}

async function mcpSetupView(projectRoot, setup) {
  if (!setup) return null;
  try {
    for (const requiredFile of setup.requiredFiles ?? [setup.entry]) {
      await containedFile(projectRoot, requiredFile);
    }
    const markerPath = await containedFile(projectRoot, setup.marker);
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    if (
      !isRecord(marker) ||
      marker.schemaVersion !== "1.0" ||
      marker.source !== setup.source ||
      marker.revision !== setup.revision
    ) {
      throw new TypeError("本地 MCP 源码标记与项目固定版本不一致");
    }
    return {
      status: "ready",
      message: "本地固定版本源码已就绪。首次启动会由 uv 创建隔离环境并安装上游依赖。",
      command: null,
    };
  } catch (error) {
    const missing = error && typeof error === "object" && error.code === "ENOENT";
    return {
      status: "required",
      message: missing
        ? "尚未安装本地源码；安装完成前不能启用此 MCP。"
        : "本地源码不完整或版本标记不匹配；为避免执行未审阅代码，此 MCP 已阻止启用。",
      command: setup.command,
    };
  }
}

async function atomicWrite(filePath, text, mode) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporary, "wx", mode);
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await chmod(temporary, mode);
    await rename(temporary, filePath);
  } finally {
    await handle?.close().catch(() => undefined);
    await unlink(temporary).catch(() => undefined);
  }
}

async function readManagedSkillMarker(projectRoot, directoryName) {
  const markerPath = path.join(
    ".agents/skills",
    directoryName,
    MANAGED_SKILL_MARKER,
  );
  try {
    const filePath = await containedFile(projectRoot, markerPath);
    const value = JSON.parse(await readFile(filePath, "utf8"));
    if (
      !isRecord(value) ||
      value.schemaVersion !== "1.0" ||
      value.kind !== "openquantum-custom-skill" ||
      typeof value.displayName !== "string"
    ) {
      throw new TypeError("自定义 Skill 标记无效");
    }
    return value;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readSkillUiMetadata(projectRoot, directoryName) {
  try {
    const filePath = await containedFile(
      projectRoot,
      path.join(".agents/skills", directoryName, "agents/openai.yaml"),
    );
    const value = parse(await readFile(filePath, "utf8"), {
      strict: true,
      uniqueKeys: true,
    });
    return isRecord(value) && isRecord(value.interface)
      ? value.interface
      : {};
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }
    return {};
  }
}

function displayTarget(config) {
  if (config.transport === "streamable-http") {
    return typeof config.url === "string" ? config.url : "未配置 URL";
  }
  if (config.command === "uvx" && Array.isArray(config.args)) {
    return ["uvx", ...config.args].join(" ");
  }
  const projectArg = Array.isArray(config.args)
    ? [...config.args]
        .reverse()
        .find(
          (argument) =>
            typeof argument === "string" &&
            /process\.cwd\(\) \+ ['"]\/(.+)['"]/.test(argument),
        )
    : undefined;
  if (typeof projectArg === "string") {
    const match = projectArg.match(/process\.cwd\(\) \+ ['"]\/(.+)['"]/);
    return match ? `./${match[1]}` : projectArg;
  }
  const firstArg = Array.isArray(config.args) ? config.args[0] : undefined;
  if (typeof firstArg === "string") {
    const match = firstArg.match(/process\.cwd\(\) \+ ['"]\/(.+)['"]/);
    return match ? `./${match[1]}` : firstArg;
  }
  return typeof config.command === "string" ? config.command : "stdio";
}

async function readMcp(projectRoot) {
  const filePath = await containedFile(projectRoot, AGENT_CONFIG);
  const raw = await readFile(filePath, "utf8");
  const document = parseDocument(raw, { strict: true, uniqueKeys: true });
  if (document.errors.length > 0) {
    throw document.errors[0];
  }
  const entries = document.toJS();
  if (!Array.isArray(entries)) {
    throw new TypeError("Agent Cordis 配置必须是列表");
  }
  const mcpServers = await Promise.all(
    entries
      .filter((entry) => isRecord(entry) && MCP_PLUGIN_NAMES.has(entry.name))
      .map(async (entry) => {
        const config = isRecord(entry.config) ? entry.config : {};
        const reconnect = isRecord(config.reconnect) ? config.reconnect : {};
        const transport =
          config.transport === "streamable-http"
            ? "streamable-http"
            : "stdio";
        const serverName = String(config.serverName ?? "");
        const requiredCredentialRefs = isRecord(config.credentialEnv)
          ? Object.values(config.credentialEnv).filter(
              (value) =>
                typeof value === "string" && CREDENTIAL_REF.test(value),
            )
          : [];
        const optionalCredentialRefs = isRecord(config.optionalCredentialEnv)
          ? Object.values(config.optionalCredentialEnv).filter(
              (value) =>
                typeof value === "string" && CREDENTIAL_REF.test(value),
            )
          : [];
        const credentialRefs = [
          ...new Set([
            ...requiredCredentialRefs,
            ...optionalCredentialRefs,
          ]),
        ];
        const catalog = MCP_CATALOG[serverName] ?? {
          displayName: serverName,
          description: "项目 Agent preset 声明的 Harness 原生 MCP 服务。",
          provider: "Project",
          sourceUrl: null,
          packageName: null,
          packageVersion: null,
          setup: null,
        };
        return {
          serverName,
          displayName: catalog.displayName,
          description: catalog.description,
          provider: catalog.provider,
          sourceUrl: catalog.sourceUrl,
          packageName: catalog.packageName,
          packageVersion: catalog.packageVersion,
          credentialRefs,
          requiredCredentialRefs: [...new Set(requiredCredentialRefs)],
          setup: await mcpSetupView(projectRoot, catalog.setup),
          managed: isManagedMcpEntry(entry, serverName),
          transport,
          target: displayTarget(config),
          enabled: entry.disabled !== true,
          toolCallTimeoutMs: Number(config.toolCallTimeoutMs ?? 60000),
          failOnStartupError: config.failOnStartupError === true,
          reconnect: {
            enabled: reconnect.enabled !== false,
            initialDelayMs: Number(reconnect.initialDelayMs ?? 500),
            maxDelayMs: Number(reconnect.maxDelayMs ?? 30000),
            maxAttempts: Number(reconnect.maxAttempts ?? 10),
          },
        };
      }),
  );
  const credentialRefs = new Set(
    mcpServers.flatMap((server) => server.credentialRefs),
  );
  const mcpCredentials = [...credentialRefs].map((ref) => ({
    ref,
    ...(MCP_CREDENTIAL_CATALOG[ref] ?? {
      displayName: ref,
      description: "供自定义 MCP 使用的 Harness 安全凭据。",
      documentationUrl: null,
    }),
    serverNames: mcpServers
      .filter((server) => server.credentialRefs.includes(ref))
      .map((server) => server.serverName),
  }));
  return {
    filePath,
    raw,
    document,
    mcpServers,
    mcpCredentials,
    revision: digest(raw),
  };
}

async function readSkill(projectRoot, directoryName) {
  if (!SKILL_NAME.test(directoryName)) {
    throw new TypeError("Skill 目录名无效");
  }
  const relativeSkill = path.join(".agents/skills", directoryName, "SKILL.md");
  const filePath = await containedFile(projectRoot, relativeSkill);
  const raw = await readFile(filePath, "utf8");
  const parsed = frontmatter(raw);
  if (parsed.value.name !== directoryName) {
    throw new TypeError("Skill 目录名与 frontmatter name 不一致");
  }
  const capabilityPath = path.join(
    ".agents/skills",
    directoryName,
    "capability.yaml",
  );
  let capability = {};
  try {
    const resolvedCapability = await containedFile(projectRoot, capabilityPath);
    capability = parse(await readFile(resolvedCapability, "utf8"), {
      strict: true,
      uniqueKeys: true,
    });
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "ENOENT") {
      throw error;
    }
  }
  const managedMarker = await readManagedSkillMarker(projectRoot, directoryName);
  const uiMetadata = await readSkillUiMetadata(projectRoot, directoryName);
  return {
    filePath,
    raw,
    document: parsed.document,
    body: parsed.body,
    view: {
      name: directoryName,
      displayName:
        managedMarker
          ? managedMarker.displayName
          : typeof uiMetadata.display_name === "string"
          ? uiMetadata.display_name
          : isRecord(capability) && typeof capability.displayName === "string"
          ? capability.displayName
          : directoryName,
      description: String(parsed.value.description ?? ""),
      version:
        isRecord(capability) && typeof capability.version === "string"
          ? capability.version
          : null,
      maturity:
        isRecord(capability) &&
        isRecord(capability.maturity) &&
        typeof capability.maturity.status === "string"
          ? capability.maturity.status
          : null,
      modelInvocable: parsed.value["disable-model-invocation"] !== true,
      userInvocable: parsed.value["user-invocable"] !== false,
      managed: managedMarker !== null,
      revision: digest(raw),
    },
  };
}

async function readSkills(projectRoot) {
  const root = await containedRoot(projectRoot);
  const skillsRoot = path.join(root, ".agents", "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !SKILL_NAME.test(entry.name)) {
      continue;
    }
    skills.push((await readSkill(root, entry.name)).view);
  }
  return skills;
}

export async function readProjectSettings(projectRoot) {
  const [skills, mcp] = await Promise.all([
    readSkills(projectRoot),
    readMcp(projectRoot),
  ]);
  return {
    skills,
    mcpServers: mcp.mcpServers,
    mcpCredentials: mcp.mcpCredentials,
    mcpRevision: mcp.revision,
  };
}

export async function updateSkillSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.name !== "string" || !SKILL_NAME.test(input.name)) {
    throw new TypeError("Skill 名称无效");
  }
  assertRevision(input.revision);
  assertBoolean(input.modelInvocable, "modelInvocable");
  assertBoolean(input.userInvocable, "userInvocable");
  const skill = await readSkill(projectRoot, input.name);
  if (digest(skill.raw) !== input.revision) {
    throw new ProjectSettingsConflictError();
  }
  if (input.modelInvocable) {
    skill.document.delete("disable-model-invocation");
  } else {
    skill.document.set("disable-model-invocation", true);
  }
  if (input.userInvocable) {
    skill.document.delete("user-invocable");
  } else {
    skill.document.set("user-invocable", false);
  }
  const mode = (await regularFile(skill.filePath)).mode & 0o777;
  await atomicWrite(
    skill.filePath,
    `---\n${skill.document.toString().trimEnd()}\n---\n${skill.body}`,
    mode,
  );
  return readProjectSettings(projectRoot);
}

export async function removeSkillSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.name !== "string" || !SKILL_NAME.test(input.name)) {
    throw new TypeError("Skill 名称无效");
  }
  assertRevision(input.revision);
  const skill = await readSkill(projectRoot, input.name);
  if (!skill.view.managed) {
    throw new TypeError("内置或外部安装的 Skill 不能从设置中心移除");
  }
  if (digest(skill.raw) !== input.revision) {
    throw new ProjectSettingsConflictError();
  }
  const skillDirectory = await containedDirectory(
    projectRoot,
    path.join(".agents/skills", input.name),
  );
  const trash = await containedDirectory(
    projectRoot,
    ".openquantum/trash/skills",
    { create: true },
  );
  await rename(
    skillDirectory,
    path.join(trash, `${input.name}-${Date.now()}-${randomUUID()}`),
  );
  return readProjectSettings(projectRoot);
}

export async function updateMcpSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.serverName !== "string" || !SERVER_NAME.test(input.serverName)) {
    throw new TypeError("MCP serverName 无效");
  }
  assertRevision(input.revision);
  assertBoolean(input.enabled, "enabled");
  assertInteger(input.toolCallTimeoutMs, "toolCallTimeoutMs", 1000, 600000);
  if (!isRecord(input.reconnect)) {
    throw new TypeError("reconnect 配置无效");
  }
  assertBoolean(input.reconnect.enabled, "reconnect.enabled");
  assertInteger(input.reconnect.initialDelayMs, "reconnect.initialDelayMs", 1, 60000);
  assertInteger(input.reconnect.maxDelayMs, "reconnect.maxDelayMs", 1, 300000);
  assertInteger(input.reconnect.maxAttempts, "reconnect.maxAttempts", 1, 100);
  if (input.reconnect.maxDelayMs < input.reconnect.initialDelayMs) {
    throw new TypeError("最大重连延迟不能小于初始延迟");
  }

  const mcp = await readMcp(projectRoot);
  if (mcp.revision !== input.revision) {
    throw new ProjectSettingsConflictError();
  }
  const entries = mcp.document.contents?.items;
  if (!Array.isArray(entries)) {
    throw new TypeError("Agent Cordis 配置必须是列表");
  }
  const index = entries.findIndex((_, candidateIndex) => {
    const pluginName = mcp.document.getIn([candidateIndex, "name"]);
    return (
      typeof pluginName === "string" &&
      MCP_PLUGIN_NAMES.has(pluginName) &&
      mcp.document.getIn([candidateIndex, "config", "serverName"]) === input.serverName
    );
  });
  if (index < 0) {
    throw new TypeError("MCP 服务已不存在，请刷新后重试");
  }
  if (input.enabled) {
    mcp.document.deleteIn([index, "disabled"]);
  } else {
    mcp.document.setIn([index, "disabled"], true);
  }
  mcp.document.setIn(
    [index, "config", "toolCallTimeoutMs"],
    input.toolCallTimeoutMs,
  );
  for (const field of [
    "enabled",
    "initialDelayMs",
    "maxDelayMs",
    "maxAttempts",
  ]) {
    mcp.document.setIn(
      [index, "config", "reconnect", field],
      input.reconnect[field],
    );
  }
  const mode = (await regularFile(mcp.filePath)).mode & 0o777;
  await atomicWrite(mcp.filePath, mcp.document.toString(), mode);
  return readProjectSettings(projectRoot);
}

export async function registerMcpSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.serverName !== "string" || !SERVER_NAME.test(input.serverName)) {
    throw new TypeError("MCP serverName 无效");
  }
  assertRevision(input.revision);
  const transport = input.transport;
  if (transport !== "stdio" && transport !== "streamable-http") {
    throw new TypeError("MCP transport 无效");
  }
  const credentialRef = optionalCredentialRef(input.credentialRef);
  if (transport === "streamable-http" && credentialRef) {
    throw new TypeError("当前自定义 HTTP MCP 只支持无凭据端点");
  }

  const mcp = await readMcp(projectRoot);
  if (mcp.revision !== input.revision) {
    throw new ProjectSettingsConflictError();
  }
  if (mcp.mcpServers.some((server) => server.serverName === input.serverName)) {
    throw new TypeError("同名 MCP 服务已存在");
  }

  const reconnect = {
    enabled: true,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    maxAttempts: 10,
  };
  let config;
  if (transport === "stdio") {
    const command = requiredText(input.command, "command", 256);
    if (command.includes("\n") || command.includes("\r")) {
      throw new TypeError("command 不能包含换行");
    }
    if (!Array.isArray(input.args) || input.args.length > MAX_MCP_ARGUMENTS) {
      throw new TypeError(`args 最多包含 ${MAX_MCP_ARGUMENTS} 项`);
    }
    const args = input.args.map((argument, index) => {
      if (
        typeof argument !== "string" ||
        argument.includes("\0") ||
        argument.includes("\n") ||
        argument.includes("\r") ||
        Buffer.byteLength(argument, "utf8") > MAX_MCP_ARGUMENT_BYTES
      ) {
        throw new TypeError(`args[${index}] 无效`);
      }
      return argument;
    });
    config = {
      serverName: input.serverName,
      transport,
      command,
      args,
      env: {},
      cwd: "process.cwd()",
      ...(credentialRef
        ? { credentialEnv: { [credentialRef]: credentialRef } }
        : {}),
      toolCallTimeoutMs: 60000,
      failOnStartupError: false,
      reconnect,
    };
  } else {
    const urlText = requiredText(input.url, "url", 2048);
    let parsedUrl;
    try {
      parsedUrl = new URL(urlText);
    } catch {
      throw new TypeError("MCP URL 无效");
    }
    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      throw new TypeError("MCP URL 必须是无内嵌凭据的 HTTP(S) 地址");
    }
    config = {
      serverName: input.serverName,
      transport,
      url: parsedUrl.toString(),
      headers: {},
      toolCallTimeoutMs: 60000,
      failOnStartupError: false,
      reconnect,
    };
  }

  const pluginName = credentialRef
    ? "./credentialed-mcp-client.mjs"
    : "@deepseek-ai/dsh-mcp-client";
  mcp.document.add(
    mcp.document.createNode({
      id: customMcpId(input.serverName),
      name: pluginName,
      disabled: true,
      config,
    }),
  );
  if (transport === "stdio") {
    const index = mcp.document.contents.items.length - 1;
    const cwdNode = mcp.document.getIn([index, "config", "cwd"], true);
    cwdNode.tag = "tag:yaml.org,2002:js";
  }
  const mode = (await regularFile(mcp.filePath)).mode & 0o777;
  await atomicWrite(mcp.filePath, mcp.document.toString(), mode);
  return readProjectSettings(projectRoot);
}

export async function removeMcpSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.serverName !== "string" || !SERVER_NAME.test(input.serverName)) {
    throw new TypeError("MCP serverName 无效");
  }
  assertRevision(input.revision);
  const mcp = await readMcp(projectRoot);
  if (mcp.revision !== input.revision) {
    throw new ProjectSettingsConflictError();
  }
  const entries = mcp.document.contents?.items;
  if (!Array.isArray(entries)) {
    throw new TypeError("Agent Cordis 配置必须是列表");
  }
  const index = mcp.document.toJS().findIndex(
    (entry) =>
      isManagedMcpEntry(entry, input.serverName) &&
      entry.config?.serverName === input.serverName,
  );
  if (index < 0) {
    throw new TypeError("内置或外部声明的 MCP 不能从设置中心移除");
  }
  if (mcp.document.getIn([index, "disabled"]) !== true) {
    throw new TypeError("请先停用 MCP 服务，再将其移除");
  }
  mcp.document.deleteIn([index]);
  const mode = (await regularFile(mcp.filePath)).mode & 0o777;
  await atomicWrite(mcp.filePath, mcp.document.toString(), mode);
  return readProjectSettings(projectRoot);
}
