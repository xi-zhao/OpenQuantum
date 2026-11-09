import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import { redactToolResult } from "./tool-redaction.mjs";

// Current product budgets are shared; each host explicitly supplies its policy.
export const DEFAULT_BACKEND_LIMITS = Object.freeze({ timeoutMs: 180000, maxOutputBytes: 2 * 1024 * 1024, threads: 2, concurrentCalls: 2 });
const ajv = new Ajv({ strict: false, allErrors: true });
const sortedTools = tools => [...tools].sort((a, b) => a.name.localeCompare(b.name));

// Catalog assembly validates each provider before probing the next one; the
// executor reuses Ajv's compiled schema when building its private call routes.
export const compileToolInput = schema => ajv.compile(schema);

export function boundedSchema(schema, limits = DEFAULT_BACKEND_LIMITS) {
  const projected = structuredClone(schema);
  if (projected.properties?.execution?.properties) {
    const execution = projected.properties.execution.properties;
    execution.timeoutMs = { type: "integer", minimum: 1, maximum: limits.timeoutMs, default: limits.timeoutMs };
    execution.maxOutputBytes = { type: "integer", minimum: 1, maximum: limits.maxOutputBytes, default: limits.maxOutputBytes };
    execution.threads = { type: "integer", minimum: 1, maximum: limits.threads, default: 1 };
  }
  return projected;
}

export function reviewProviderTools({ tools, nextCursor }, provider, limits) {
  if (nextCursor) throw new Error(`Paginated provider needs review: ${provider.key}`);
  if (tools.map(tool => tool.name).sort().join("\n") !== provider.tools.map(tool => tool.name).sort().join("\n")) {
    throw new Error(`Capability policy does not match tools/list: ${provider.key}`);
  }
  return tools.map(tool => ({ ...tool, inputSchema: boundedSchema(tool.inputSchema, limits) }));
}

/**
 * Execute an already verified Tool catalog, independently of host registration,
 * catalog files, credential stores and process construction. This is not an
 * Agent runtime: the host still owns turns, approvals and result acceptance.
 *
 * connect(provider, root, values, signal) returns a listTools/callTool/close
 * adapter. A successful close() confirms release; cleanup errors propagate.
 * createExternal() supplies validateCall/call/reconcile/close for persistent
 * external providers; it owns credential rotation, leases and result redaction.
 * It is invoked only after the entire catalog has compiled successfully.
 * catalog.secretFields contains field names, never credential values.
 */
export function createToolBackend({ catalog, limits, connect, createExternal }) {
  const { root, capabilities, providers, tools, secretFields = {} } = catalog;
  limits = Object.freeze({ ...limits });
  for (const key of Object.keys(DEFAULT_BACKEND_LIMITS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) throw new TypeError(`Invalid Tool execution budget: ${key}`);
  }
  const routes = new Map();
  for (const provider of providers) {
    const contracts = tools.filter(tool => provider.tools.some(declared => declared.name === tool.name));
    for (const tool of contracts) {
      if (routes.has(tool.name)) throw new Error(`Duplicate tool name: ${tool.name}`);
      routes.set(tool.name, { provider, validate: compileToolInput(tool.inputSchema), contracts });
    }
  }
  let closePromise;
  // One entry owns both a call's capacity and its cleanup acknowledgement.
  const calls = new Map();
  const external = createExternal();
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
      if (route.provider.kind === "external") await external.validateCall(route.provider.key, args);
    },
    async call(name, args, signal, authorize = async () => true, values = {}, lifecycle = {}) {
      if (closePromise) throw new Error("计算连接已关闭");
      const route = routes.get(name);
      if (!route) throw new Error("Unknown or unavailable tool");
      if (!route.validate(args)) throw new Error(`Invalid arguments: ${ajv.errorsText(route.validate.errors)}`);
      if (calls.size >= limits.concurrentCalls) throw new Error("计算服务繁忙，请稍后重试。");
      signal?.throwIfAborted();
      const controller = new AbortController();
      let settled;
      const drain = new Promise(resolve => { settled = resolve; });
      calls.set(controller, drain);
      let client;
      const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      try {
        if (!await authorize()) throw new Error("Tool 已停用");
        combined.throwIfAborted();
        if (route.provider.kind === "external") {
          const result = await external.call(route.provider.key, args, { signal: combined, authorize,
            values: lifecycle.values ?? (async () => values), acquire: lifecycle.acquire ?? (async () => ({ release: async () => {} })) });
          if (Buffer.byteLength(JSON.stringify(result)) > limits.maxOutputBytes) throw new Error("Tool output exceeds the ChatGPT result budget");
          // The external adapter redacts credentials read during this call,
          // including a newer generation than the initial values snapshot.
          return result;
        }
        client = await connect(route.provider, root, values, combined);
        combined.throwIfAborted();
        const actual = reviewProviderTools(await client.listTools({}, { timeout: 15000, signal: combined }), route.provider, limits);
        if (!isDeepStrictEqual(sortedTools(actual), sortedTools(route.contracts))) {
          throw new Error(`Provider contract changed: ${route.provider.key}; rebuild or reinstall the plugin`);
        }
        if (!await authorize()) throw new Error("Tool 已停用");
        combined.throwIfAborted();
        const result = await client.callTool({ name, arguments: args }, undefined, { timeout: limits.timeoutMs, signal: combined });
        if (Buffer.byteLength(JSON.stringify(result)) > limits.maxOutputBytes) throw new Error("Tool output exceeds the ChatGPT result budget");
        const secrets = (secretFields[route.provider.key] ?? []).map(field => values[field]).filter(Boolean);
        return redactToolResult(result, secrets);
      } catch (error) {
        // Preserve the provider's cancellation grace period before closing its
        // transport; process-group cleanup remains owned by that adapter.
        if (client) await new Promise(resolve => setTimeout(resolve, 250));
        if (route.provider.kind !== "external" && (secretFields[route.provider.key] ?? []).some(field => values[field])) throw new Error("服务调用失败、已取消或已停用；请检查服务配置和账户状态");
        throw error;
      } finally {
        let failure;
        try {
          await Promise.resolve().then(() => client?.close()).catch(error => {
            const secret = (secretFields[route.provider.key] ?? []).some(field => values[field]);
            failure = { error: secret ? new Error("计算连接回收失败；请检查服务配置和账户状态") : error };
            throw failure.error;
          });
        } finally {
          calls.delete(controller);
          // Resolve with the cleanup outcome even when no shutdown is waiting;
          // the call itself reports failure without an unhandled drain rejection.
          settled(failure);
        }
      }
    },
    reconcileExternal: () => external.reconcile(),
    close() {
      if (closePromise) return closePromise;
      const draining = [...calls.values()];
      closePromise = Promise.resolve().then(async () => {
        // An external adapter may throw synchronously. Still wait for every
        // admitted call, and publish one terminal outcome to all close callers.
        const externalCleanup = Promise.resolve().then(() => external.close()).then(() => undefined, error => ({ error }));
        const outcomes = await Promise.all([externalCleanup, ...draining]);
        const failures = outcomes.filter(Boolean).map(outcome => outcome.error);
        if (failures.length === 1) throw failures[0];
        if (failures.length) throw new AggregateError(failures, "计算连接回收失败");
      });
      for (const controller of calls.keys()) controller.abort();
      return closePromise;
    },
  };
}
