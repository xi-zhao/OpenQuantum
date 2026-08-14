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

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const AGENT_CONFIG = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";

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

function displayTarget(config) {
  if (config.transport === "streamable-http") {
    return typeof config.url === "string" ? config.url : "未配置 URL";
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
    .filter((entry) => isRecord(entry) && entry.name === "@deepseek-ai/dsh-mcp-client")
    .map((entry) => {
      const config = isRecord(entry.config) ? entry.config : {};
      const reconnect = isRecord(config.reconnect) ? config.reconnect : {};
      const transport =
        config.transport === "streamable-http" ? "streamable-http" : "stdio";
      return {
        serverName: String(config.serverName ?? ""),
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
  return { filePath, raw, document, mcpServers, revision: digest(raw) };
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
  return {
    filePath,
    raw,
    document: parsed.document,
    body: parsed.body,
    view: {
      name: directoryName,
      displayName:
        isRecord(capability) && typeof capability.displayName === "string"
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
    return (
      mcp.document.getIn([candidateIndex, "name"]) === "@deepseek-ai/dsh-mcp-client" &&
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
