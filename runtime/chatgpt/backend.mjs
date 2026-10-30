import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Ajv from "ajv";
import { containedPath, PROJECT_ROOT, providerGroups, readCapabilities } from "./catalog.mjs";
import { serviceById } from "../../src/settings/codex/service-catalog.mjs";
import { redactToolResult } from "../../src/settings/codex/redaction.mjs";
import { RUNTIME_ENV_NAMES } from "../../src/settings/codex/environments.mjs";
import { externalMcp, externalContract, externalTool } from "./external/catalog.mjs";
import { ExternalSessions, connectExternal as connectExternalProvider, validateExternal } from "./external/client.mjs";

export const LIMITS = Object.freeze({ timeoutMs: 180000, maxOutputBytes: 2 * 1024 * 1024, threads: 2, concurrentCalls: 2 });
const ajv = new Ajv({ strict: false, allErrors: true });

function environment(root) {
  // Do not inherit model/API/hardware secrets into numerical tools.
  const allowed = ["PATH", "HOME", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SSL_CERT_FILE", "SSL_CERT_DIR"];
  return { ...Object.fromEntries(allowed.filter((key) => process.env[key]).map((key) => [key, process.env[key]])), OPENQUANTUM_PROJECT_ROOT: root };
}

export async function connectProvider(provider, root, values = {}, signal, nodeExecutable = process.execPath) {
  const args = provider.kind === "native"
    ? [path.join(root, "runtime/chatgpt/native-server.mjs"), provider.key]
    : [containedPath(root, provider.entrypoint)];
  const fields = serviceById(provider.key)?.fields ?? [];
  const env = { ...environment(root), ...Object.fromEntries(RUNTIME_ENV_NAMES.filter(key => values[key]).map(key => [key, values[key]])), ...Object.fromEntries(fields.filter(field => values[field.name]).map(field => [field.name, values[field.name]])) };
  env.PATH = `${path.dirname(nodeExecutable)}${path.delimiter}${env.PATH ?? ""}`;
  const transport = new StdioClientTransport({ command: nodeExecutable, args, cwd: root, env, stderr: "pipe", maxBufferSize: 4 * 1024 * 1024 });
  transport.stderr?.resume();
  const client = new Client({ name: "openquantum-chatgpt", version: "1.0.0" });
  try {
    signal?.throwIfAborted();
    await client.connect(transport, { timeout: 15000, signal });
    return client;
  } catch (error) {
    await transport.close();
    throw error;
  }
}

export function boundedSchema(schema) {
  const projected = structuredClone(schema);
  if (projected.properties?.execution?.properties) {
    const execution = projected.properties.execution.properties;
    execution.timeoutMs = { type: "integer", minimum: 1, maximum: LIMITS.timeoutMs, default: LIMITS.timeoutMs };
    execution.maxOutputBytes = { type: "integer", minimum: 1, maximum: LIMITS.maxOutputBytes, default: LIMITS.maxOutputBytes };
    execution.threads = { type: "integer", minimum: 1, maximum: LIMITS.threads, default: 1 };
  }
  return projected;
}

const projectTool = tool => ({ ...tool, inputSchema: boundedSchema(tool.inputSchema) });
const sortedTools = tools => [...tools].sort((a, b) => a.name.localeCompare(b.name));

function reviewProviderTools({ tools, nextCursor }, provider) {
  if (nextCursor) throw new Error(`Paginated provider needs review: ${provider.key}`);
  if (tools.map(tool => tool.name).sort().join("\n") !== provider.tools.map(tool => tool.name).sort().join("\n")) {
    throw new Error(`Capability policy does not match tools/list: ${provider.key}`);
  }
  return tools.map(projectTool);
}
async function providerTools(client, provider, signal) {
  signal?.throwIfAborted();
  return reviewProviderTools(await client.listTools({}, { timeout: 15000, signal }), provider);
}

export async function readBundledTools(root, providers) {
  // This is a build artifact of the existing policy and real tools/list, not a
  // separate registry. Discovery must never fall back to starting providers.
  const directory = path.join(root, "dist/chatgpt");
  const [bytes, release] = await Promise.all([
    fs.readFile(path.join(directory, "capabilities.json")),
    fs.readFile(path.join(directory, "release.json"), "utf8").then(JSON.parse),
  ]);
  if (createHash("sha256").update(bytes).digest("hex") !== release.contractDigest) {
    throw new Error("Bundled tool catalog digest mismatch; rebuild or reinstall the plugin");
  }
  const catalog = JSON.parse(bytes);
  if (!isDeepStrictEqual(catalog.providers, providers) || !Array.isArray(catalog.tools)) {
    throw new Error("Bundled tool catalog does not match capability policy; rebuild the plugin");
  }
  const expected = providers.flatMap(provider => provider.tools.map(tool => tool.name)).sort();
  if (!isDeepStrictEqual(catalog.tools.map(tool => tool.name).sort(), expected)) {
    throw new Error("Bundled tool catalog has missing or duplicate tools; rebuild the plugin");
  }
  return catalog.tools;
}

export async function createBackend({ root = PROJECT_ROOT, discover = false, nodeExecutable = process.execPath,
  connect = (provider, root, values, signal) => connectProvider(provider, root, values, signal, nodeExecutable),
  connectExternal = (root, entry, values, options) => connectExternalProvider(root, entry, values, { ...options, nodeExecutable }) } = {}) {
  const capabilities = await readCapabilities(root);
  const providers = providerGroups(capabilities);
  const tools = [];
  const routes = new Map();
  // Build/probe reads the Node declarations and FlagQuantum's reviewed upstream
  // snapshot. Python is never installed for discovery. Runtime startup reads the
  // verified bundle; each real call checks its provider's live contract again.
  const bundled = discover ? null : await readBundledTools(root, providers);
  for (const provider of providers) {
    let client;
    try {
      if (provider.kind === "external") {
        const contract = await externalContract(root, provider.key);
        if (contract.tools.map(tool => tool.name).sort().join("\n") !== provider.upstreamTools.map(tool => tool.name).sort().join("\n")) throw new Error(`External MCP contract does not match policy: ${provider.key}`);
        const tool = externalTool(externalMcp(provider.key), provider.upstreamTools, contract);
        if (!discover && !isDeepStrictEqual(tool, bundled.find(item => item.name === tool.name))) throw new Error(`Bundled external MCP contract changed: ${provider.key}`);
        tools.push(tool); routes.set(tool.name, { provider, validate: ajv.compile(tool.inputSchema), capabilityId: provider.tools[0].capabilityId });
        continue;
      }
      const pinned = discover && provider.key === "flagquantum"
        ? JSON.parse(await fs.readFile(path.join(root, ".agents/skills/flagquantum-workbench/mcp/upstream-tools.json"), "utf8")) : null;
      if (discover && !pinned) client = await connect(provider, root, Object.fromEntries(RUNTIME_ENV_NAMES.filter(key => process.env[key]).map(key => [key, process.env[key]])));
      const actual = pinned ? reviewProviderTools(pinned, provider) : discover ? await providerTools(client, provider)
        : bundled.filter(tool => provider.tools.some(declared => declared.name === tool.name));
      for (const tool of actual) {
        if (routes.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
        const declared = provider.tools.find((item) => item.name === tool.name);
        tools.push(tool);
        routes.set(tool.name, { provider, validate: ajv.compile(tool.inputSchema), capabilityId: declared.capabilityId, contracts: actual });
      }
    } catch (error) {
      if (discover) throw new Error(`Provider discovery failed: ${provider.key}`, { cause: error });
      throw error;
    } finally {
      await client?.close();
    }
  }
  let active = 0;
  let closed = false;
  const calls = new Set();
  const draining = new Set();
  const externalSessions = new ExternalSessions({ root, connect: connectExternal });
  return {
    root,
    providers,
    providerFor(name) { return routes.get(name)?.provider.key; },
    capabilities: capabilities.map(({ skill: _skill, native: _native, mcp: _mcp, ...item }) => item),
    sourceCapabilities: capabilities,
    tools,
    async validateCall(name, args) {
      const route = routes.get(name);
      if (!route || !route.validate(args)) throw new Error("Tool 参数不符合输入合同");
      if (route.provider.kind === "external") await validateExternal(root, externalMcp(route.provider.key), args);
    },
    async call(name, args, signal, authorize = async () => true, values = {}, lifecycle = {}) {
      if (closed) throw new Error("计算连接已关闭");
      const route = routes.get(name);
      if (!route) throw new Error("Unknown or unavailable tool");
      if (!route.validate(args)) throw new Error(`Invalid arguments: ${ajv.errorsText(route.validate.errors)}`);
      if (active >= LIMITS.concurrentCalls) throw new Error("计算服务繁忙，请稍后重试。");
      signal?.throwIfAborted();
      active += 1;
      const controller = new AbortController();
      calls.add(controller);
      let settled;
      const drain = new Promise(resolve => { settled = resolve; });
      draining.add(drain);
      let client;
      const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      try {
        if (!await authorize()) throw new Error("Tool 已停用");
        combined.throwIfAborted();
        if (route.provider.kind === "external") {
          const result = await externalSessions.call(externalMcp(route.provider.key), args, { signal: combined, authorize,
            values: lifecycle.values ?? (async () => values), acquire: lifecycle.acquire ?? (async () => ({ release: async () => {} })) });
          if (Buffer.byteLength(JSON.stringify(result)) > LIMITS.maxOutputBytes) throw new Error("Tool output exceeds the ChatGPT result budget");
          // ExternalSessions redacts using credentials read during this call,
          // including a newer generation than the initial values snapshot.
          return result;
        }
        client = await connect(route.provider, root, values, combined);
        const actual = await providerTools(client, route.provider, combined);
        if (!isDeepStrictEqual(sortedTools(actual), sortedTools(route.contracts))) {
          throw new Error(`Provider contract changed: ${route.provider.key}; rebuild or reinstall the plugin`);
        }
        if (!await authorize()) throw new Error("Tool 已停用");
        combined.throwIfAborted();
        const result = await client.callTool({ name, arguments: args }, undefined, { timeout: LIMITS.timeoutMs, signal: combined });
        if (Buffer.byteLength(JSON.stringify(result)) > LIMITS.maxOutputBytes) throw new Error("Tool output exceeds the ChatGPT result budget");
        // Service responses must not put credentials into the host conversation.
        // Public endpoints and usernames can match schema values (for example
        // "source" or "text"); only secret fields are token/password material.
        const secrets = (serviceById(route.provider.key)?.fields ?? []).filter(field => field.secret).map(field => values[field.name]);
        return redactToolResult(result, secrets.filter(Boolean));
      } catch (error) {
        // MCP cancellation reaches the provider's existing process-group cleanup
        // before its stdio connection is closed. No tool process is reused by a
        // different user's call.
        if (client) await new Promise((resolve) => setTimeout(resolve, 250));
        if (route.provider.kind !== "external" && (serviceById(route.provider.key)?.fields ?? []).some(field => field.secret && values[field.name])) throw new Error("服务调用失败、已取消或已停用；请检查服务配置和账户状态");
        throw error;
      } finally {
        try { await client?.close(); }
        finally { calls.delete(controller); active -= 1; draining.delete(drain); settled(); }
      }
    },
    reconcileExternal: () => externalSessions.reconcile(),
    async close() {
      closed = true;
      for (const controller of calls) controller.abort();
      await externalSessions.close();
      await Promise.allSettled([...draining]);
    },
  };
}
