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
  rmdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import { parse, parseDocument } from "yaml";

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const CREDENTIAL_REF = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const AGENT_CONFIG = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const CUSTOM_MCP_ID_PREFIX = "mcp-user-";
const MANAGED_SKILL_MARKER = ".openquantum-settings.json";
const MAX_SKILL_DESCRIPTION_BYTES = 2048;
const MAX_SKILL_INSTRUCTIONS_BYTES = 64 * 1024;
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
    credentialRef: null,
  }),
  qiskit: Object.freeze({
    displayName: "Qiskit Circuits",
    description: "Qiskit 官方电路创建、分析、转译以及 QASM/QPY 序列化工具。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-mcp-server",
    packageVersion: "0.3.1",
    credentialRef: null,
  }),
  qiskit_docs: Object.freeze({
    displayName: "Qiskit Docs",
    description: "Qiskit 官方文档搜索、页面读取与 IBM Quantum 错误码查询。",
    provider: "Qiskit",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-docs-mcp-server",
    packageVersion: "0.3.0",
    credentialRef: null,
  }),
  qiskit_ibm_runtime: Object.freeze({
    displayName: "IBM Quantum Runtime",
    description: "通过 Qiskit IBM Runtime 查询后端并向 IBM Quantum 提交量子任务。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-runtime-mcp-server",
    packageVersion: "0.6.1",
    credentialRef: "QISKIT_IBM_TOKEN",
  }),
  qiskit_ibm_transpiler: Object.freeze({
    displayName: "IBM Quantum Transpiler",
    description: "使用 IBM Quantum AI Transpiler 完成电路路由与综合优化。",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-ibm-transpiler-mcp-server",
    packageVersion: "0.4.1",
    credentialRef: "QISKIT_IBM_TOKEN",
  }),
  qiskit_gym: Object.freeze({
    displayName: "Qiskit Gym",
    description: "社区维护的强化学习量子电路综合工具；默认关闭。",
    provider: "Qiskit Community",
    sourceUrl: QISKIT_MCP_SOURCE,
    packageName: "qiskit-gym-mcp-server",
    packageVersion: "0.4.1",
    credentialRef: null,
  }),
});
const MCP_CREDENTIAL_CATALOG = Object.freeze({
  QISKIT_IBM_TOKEN: Object.freeze({
    displayName: "IBM Quantum API Token",
    description: "供 IBM Runtime 与 IBM Transpiler 共用；密钥只保存在 Harness 凭据库。",
    documentationUrl: "https://quantum.ibm.com/account",
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

function displayTarget(config) {
  if (config.transport === "streamable-http") {
    return typeof config.url === "string" ? config.url : "未配置 URL";
  }
  if (config.command === "uvx" && Array.isArray(config.args)) {
    return ["uvx", ...config.args].join(" ");
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
  const mcpServers = entries
    .filter((entry) => isRecord(entry) && MCP_PLUGIN_NAMES.has(entry.name))
    .map((entry) => {
      const config = isRecord(entry.config) ? entry.config : {};
      const reconnect = isRecord(config.reconnect) ? config.reconnect : {};
      const transport =
        config.transport === "streamable-http" ? "streamable-http" : "stdio";
      const serverName = String(config.serverName ?? "");
      const credentialEnv = isRecord(config.credentialEnv)
        ? Object.values(config.credentialEnv).filter(
            (value) => typeof value === "string" && CREDENTIAL_REF.test(value),
          )
        : [];
      const catalog = MCP_CATALOG[serverName] ?? {
        displayName: serverName,
        description: "项目 Agent preset 声明的 Harness 原生 MCP 服务。",
        provider: "Project",
        sourceUrl: null,
        packageName: null,
        packageVersion: null,
        credentialRef: credentialEnv[0] ?? null,
      };
      return {
        serverName,
        displayName: catalog.displayName,
        description: catalog.description,
        provider: catalog.provider,
        sourceUrl: catalog.sourceUrl,
        packageName: catalog.packageName,
        packageVersion: catalog.packageVersion,
        credentialRef: catalog.credentialRef,
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
    });
  const credentialRefs = new Set(
    mcpServers.map((server) => server.credentialRef).filter(Boolean),
  );
  const mcpCredentials = [...credentialRefs].map((ref) => ({
    ref,
    ...(MCP_CREDENTIAL_CATALOG[ref] ?? {
      displayName: ref,
      description: "供自定义 MCP 使用的 Harness 安全凭据。",
      documentationUrl: null,
    }),
    serverNames: mcpServers
      .filter((server) => server.credentialRef === ref)
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

export async function createSkillSettings(projectRoot, input) {
  if (!isRecord(input) || typeof input.name !== "string" || !SKILL_NAME.test(input.name)) {
    throw new TypeError("Skill 名称无效");
  }
  const displayName = requiredText(input.displayName, "displayName", 128);
  const description = requiredText(
    input.description,
    "description",
    MAX_SKILL_DESCRIPTION_BYTES,
  );
  const instructions = requiredText(
    input.instructions,
    "instructions",
    MAX_SKILL_INSTRUCTIONS_BYTES,
  );
  assertBoolean(input.modelInvocable, "modelInvocable");
  assertBoolean(input.userInvocable, "userInvocable");

  const skillsRoot = await containedDirectory(projectRoot, ".agents/skills", {
    create: true,
  });
  const target = path.join(skillsRoot, input.name);
  const frontmatterValue = {
    name: input.name,
    description,
    ...(input.modelInvocable ? {} : { "disable-model-invocation": true }),
    ...(input.userInvocable ? {} : { "user-invocable": false }),
  };
  const header = parseDocument("");
  header.contents = header.createNode(frontmatterValue);
  let createdDirectory = false;

  try {
    await mkdir(target, { mode: 0o700 });
    createdDirectory = true;
    await atomicWrite(
      path.join(target, MANAGED_SKILL_MARKER),
      `${JSON.stringify(
        {
          schemaVersion: "1.0",
          kind: "openquantum-custom-skill",
          displayName,
        },
        null,
        2,
      )}\n`,
      0o644,
    );
    await atomicWrite(
      path.join(target, "SKILL.md"),
      `---\n${header.toString().trimEnd()}\n---\n\n${instructions}\n`,
      0o644,
    );
  } catch (error) {
    if (createdDirectory) {
      await unlink(path.join(target, "SKILL.md")).catch(() => undefined);
      await unlink(path.join(target, MANAGED_SKILL_MARKER)).catch(() => undefined);
      await rmdir(target).catch(() => undefined);
    }
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new TypeError("同名 Skill 已存在");
    }
    throw error;
  }
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

export async function createMcpSettings(projectRoot, input) {
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
