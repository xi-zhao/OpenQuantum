import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Ajv from "ajv";
import { containedPath, PROJECT_ROOT, providerGroups, readCapabilities } from "./catalog.mjs";
import { serviceById } from "../../src/settings/codex/service-catalog.mjs";
import { redactToolResult } from "../../src/settings/codex/redaction.mjs";

export const LIMITS = Object.freeze({ timeoutMs: 180000, maxOutputBytes: 2 * 1024 * 1024, threads: 2, concurrentCalls: 2 });
const ajv = new Ajv({ strict: false, allErrors: true });

function environment(root) {
  // Do not inherit model/API/hardware secrets into numerical tools.
  const allowed = ["PATH", "HOME", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SSL_CERT_FILE", "SSL_CERT_DIR"];
  return { ...Object.fromEntries(allowed.filter((key) => process.env[key]).map((key) => [key, process.env[key]])), OPENQUANTUM_PROJECT_ROOT: root };
}

async function connectProvider(provider, root, values = {}) {
  const args = provider.kind === "native"
    ? [path.join(PROJECT_ROOT, "runtime/chatgpt/native-server.mjs"), provider.key]
    : [containedPath(root, provider.entrypoint)];
  const fields = serviceById(provider.key)?.fields ?? [];
  const env = { ...environment(root), ...Object.fromEntries(fields.filter(field => values[field.name]).map(field => [field.name, values[field.name]])) };
  const transport = new StdioClientTransport({ command: process.execPath, args, cwd: root, env, stderr: "pipe", maxBufferSize: 4 * 1024 * 1024 });
  transport.stderr?.resume();
  const client = new Client({ name: "openquantum-chatgpt", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout: 15000 });
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

export async function createBackend({ root = PROJECT_ROOT } = {}) {
  const capabilities = await readCapabilities(root);
  const providers = providerGroups(capabilities);
  const tools = [];
  const routes = new Map();
  // Inventory is a real tools/list handshake. It does not invoke calculations or
  // lazy Python installation, and fails closed on registry/implementation drift.
  for (const provider of providers) {
    const client = await connectProvider(provider, root);
    try {
      const { tools: actual, nextCursor } = await client.listTools();
      if (nextCursor) throw new Error(`Paginated provider needs review: ${provider.key}`);
      if (actual.map((tool) => tool.name).sort().join("\n") !== provider.tools.map((tool) => tool.name).sort().join("\n")) {
        throw new Error(`Capability policy does not match tools/list: ${provider.key}`);
      }
      for (const tool of actual) {
        if (routes.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
        const declared = provider.tools.find((item) => item.name === tool.name);
        const inputSchema = boundedSchema(tool.inputSchema);
        tools.push({ ...tool, inputSchema });
        routes.set(tool.name, { provider, validate: ajv.compile(inputSchema), capabilityId: declared.capabilityId });
      }
    } finally {
      await client.close();
    }
  }
  let active = 0;
  const calls = new Set();
  return {
    providers,
    providerFor(name) { return routes.get(name)?.provider.key; },
    capabilities: capabilities.map(({ skill: _skill, native: _native, mcp: _mcp, ...item }) => item),
    sourceCapabilities: capabilities,
    tools,
    async call(name, args, signal, authorize = async () => true, values = {}) {
      const route = routes.get(name);
      if (!route) throw new Error("Unknown or unavailable tool");
      if (!route.validate(args)) throw new Error(`Invalid arguments: ${ajv.errorsText(route.validate.errors)}`);
      if (active >= LIMITS.concurrentCalls) throw new Error("计算服务繁忙，请稍后重试。");
      signal?.throwIfAborted();
      active += 1;
      const controller = new AbortController();
      calls.add(controller);
      let client;
      try {
        client = await connectProvider(route.provider, root, values);
        if (!await authorize()) throw new Error("Tool 已停用");
        const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
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
        if (Object.keys(values).length) throw new Error("服务调用失败、已取消或已停用；请检查服务配置和账户状态");
        throw error;
      } finally {
        await client?.close();
        calls.delete(controller);
        active -= 1;
      }
    },
    close() { for (const controller of calls) controller.abort(); },
  };
}
