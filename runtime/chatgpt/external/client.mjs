import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Ajv from "ajv";
import { externalContract, ACCOUNT_OPERATIONS, operationCredential, operationLimitation } from "./catalog.mjs";
import { externalPaths } from "./setup.mjs";
import { digest } from "../../../src/settings/codex/storage.mjs";
import { serviceById } from "../../../src/settings/codex/service-catalog.mjs";
import { redactToolResult } from "../../../src/settings/codex/redaction.mjs";

const ajv = new Ajv({ strict: false, allErrors: true });
const validateCache = new Map();
const publicTool = ({ name, description, inputSchema, outputSchema, annotations }) => ({ name, description, inputSchema, ...(outputSchema ? { outputSchema } : {}), ...(annotations ? { annotations } : {}) });
const sorted = tools => tools.map(publicTool).sort((a, b) => a.name.localeCompare(b.name));
const generation = (entry, values) => digest(JSON.stringify(entry.id === "qpanda_runtime"
  ? Object.fromEntries(Object.entries(values).filter(([key]) => key !== "QPANDA3_API_KEY")) : values));
const credentialGeneration = values => values.QPANDA3_API_KEY ? digest(values.QPANDA3_API_KEY) : null;
export function externalResult(result) {
  let body = result.structuredContent;
  try {
    if (typeof body?.result === "string") body = JSON.parse(body.result);
    if (!body) body = JSON.parse(result.content?.find(item => item.type === "text")?.text);
  } catch { /* Non-JSON content retains the upstream MCP error flag. */ }
  return body?.status === "error" || (body?.error && typeof body.error === "string") ? { ...result, isError: true } : result;
}
export async function validateExternal(root, entry, input) {
  if (Buffer.byteLength(JSON.stringify(input)) > 256 * 1024) throw new Error("MCP 请求超过 256 KiB 传输预算");
  const limitation = operationLimitation(entry, input.operation);
  if (limitation) throw new Error(limitation);
  if (input.operation === "close_session" && entry.persistent) {
    if (!input.sessionId || Object.keys(input.arguments ?? {}).length) throw new Error("关闭会话需要 sessionId 和空 arguments");
    return;
  }
  const contract = await externalContract(root, entry.id);
  const tool = contract.tools.find(tool => tool.name === input.operation);
  if (!tool || ACCOUNT_OPERATIONS.has(input.operation)) throw new Error("未知操作；账户配置只能通过 OpenQuantum 设置完成");
  const key = digest(JSON.stringify(tool.inputSchema));
  const validate = validateCache.get(key) ?? ajv.compile(tool.inputSchema);
  validateCache.set(key, validate);
  if (!validate(input.arguments)) throw new Error(`MCP 操作参数无效：${ajv.errorsText(validate.errors)}`);
  // Secrets cannot be smuggled into flexible upstream dictionaries either.
  const inspect = value => {
    if (Array.isArray(value)) return value.forEach(inspect);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:token|api_key|password|authorization|config_path|access_token|secret)$/i.test(key)) throw new Error("凭据和账户文件不能放入 Tool 参数，请使用设置页");
      inspect(child);
    }
  };
  inspect(input.arguments);
}

export async function connectExternal(root, entry, values = {}, { signal, nodeExecutable = process.execPath } = {}) {
  signal?.throwIfAborted();
  const paths = externalPaths(root, entry.id, values);
  if ((await fs.readFile(paths.marker, "utf8")).trim() !== digest(await fs.readFile(path.join(paths.project, "uv.lock")))) throw new Error("MCP 环境尚未准备或已变化");
  const runDirectory = path.join(paths.directory, "runs", randomUUID());
  await fs.mkdir(path.join(runDirectory, "home"), { recursive: true, mode: 0o700 });
  let cwd = runDirectory;
  if (entry.id === "quantum_hardware") {
    cwd = path.join(paths.directory, "state");
    await fs.mkdir(cwd, { recursive: true, mode: 0o700 });
    const manifest = JSON.parse(await fs.readFile(path.join(paths.project, "source.json"), "utf8"));
    for (const [file, expected] of Object.entries(manifest.files)) {
      const bytes = await fs.readFile(path.join(paths.directory, "source", file));
      if (digest(bytes) !== expected) throw new Error("MCP 固定源码摘要变化，请重新准备");
      await fs.mkdir(path.dirname(path.join(cwd, file)), { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(cwd, file), bytes, { mode: 0o600 });
    }
  }
  const allowed = ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "SSL_CERT_FILE", "SSL_CERT_DIR", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"];
  const env = { ...Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]])),
    PATH: `${path.dirname(paths.python)}${path.delimiter}${path.dirname(nodeExecutable)}${path.delimiter}${process.env.PATH ?? ""}`,
    HOME: path.join(runDirectory, "home"), USERPROFILE: path.join(runDirectory, "home"),
    PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1", PYTHON_DOTENV_DISABLED: "1", IBM_SHOW_ACCOUNT_INFO: "false", DO_NOT_TRACK: "1",
    OMP_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2", MKL_NUM_THREADS: "2",
    QISKIT_GYM_MODEL_DIR: path.join(paths.directory, "models"), QISKIT_GYM_TENSORBOARD_DIR: path.join(paths.directory, "training-logs"),
    ...Object.fromEntries(["QISKIT_IBM_TOKEN", "QISKIT_IBM_RUNTIME_MCP_INSTANCE", "IONQ_API_KEY"].filter(key => values[key]).map(key => [key, values[key]])),
    ...(entry.id === "quantum_hardware" && values.QISKIT_IBM_TOKEN ? { IBM_QUANTUM_TOKEN: values.QISKIT_IBM_TOKEN } : {}),
  };
  const transport = new StdioClientTransport({ command: nodeExecutable,
    args: [path.join(root, "runtime/chatgpt/external/process.mjs"), paths.python, "-B", path.join(root, "runtime/chatgpt/external/launch.py"), entry.id, entry.module ?? "", cwd],
    cwd, env, stderr: "pipe", maxBufferSize: 4 * 1024 * 1024 });
  transport.stderr?.resume();
  const client = new Client({ name: "openquantum-external", version: "1.0.0" });
  let closing;
  const close = () => closing ??= (async () => {
    try { await client.close(); } finally { await transport.close(); await fs.rm(runDirectory, { recursive: true, force: true }); }
  })();
  try {
    signal?.throwIfAborted();
    await client.connect(transport, { timeout: 90000, signal });
    signal?.throwIfAborted();
    return { client, close };
  } catch (error) { await close(); throw error; }
}

export class ExternalSessions {
  constructor({ root, connect = connectExternal, idleMs = 30 * 60 * 1000, maxSessions = 4 }) {
    Object.assign(this, { root, connect, idleMs, maxSessions }); this.sessions = new Map(); this.closing = new Set(); this.closed = false;
    // Poll policy without waking the system credential store. Explicit settings
    // changes and the next operation also check credential generations.
    this.timer = setInterval(() => this.reconcile({ credentials: false }).catch(() => {}), 3000); this.timer.unref();
  }
  async drop(session) {
    if (session.closing) return session.closing;
    this.sessions.delete(session.id);
    session.controller.abort();
    session.closing = (async () => {
      // Acquire/connect may still be in flight. Reap the connection before
      // releasing its lease, including cancellation during initialization.
      await session.opening?.catch(() => {});
      try { await session.close?.(); } finally { await session.lease?.release(); }
    })().catch(() => {
      // Cleanup may run without reading credentials (close_session, reconcile or
      // Agent shutdown). Never expose an upstream exception from that boundary.
      throw new Error("MCP 连接回收失败；请检查服务配置和账户状态");
    }).finally(() => this.closing.delete(session.closing));
    this.closing.add(session.closing);
    return session.closing;
  }
  async reconcile({ credentials = true } = {}) {
    await Promise.all([...this.sessions.values()].map(async session => {
      try {
        const values = credentials ? await session.values() : null;
        if (!await session.authorize() || (values && (generation(session.entry, values) !== session.generation
              || (session.authenticated && credentialGeneration(values) !== session.authenticated)))
            || (!session.busy && Date.now() - session.lastUsed > this.idleMs)) await this.drop(session);
      } catch { await this.drop(session); }
    }));
  }
  async call(entry, input, { values, ...options }) {
    const fields = (serviceById(entry.id)?.fields ?? []).filter(field => field.secret);
    const secrets = new Set();
    const readValues = async () => {
      let current;
      try { current = await values(); }
      catch { throw new Error("服务凭据读取失败；请检查服务配置和账户状态"); }
      for (const field of fields) {
        const value = current[field.name];
        if (typeof value === "string" && value.length) secrets.add(value);
      }
      return current;
    };
    try {
      return redactToolResult(await this.#call(entry, input, { ...options, values, readValues }), [...secrets]);
    } catch (error) {
      if (secrets.size) throw new Error("服务调用失败、已取消或已停用；请检查服务配置和账户状态");
      throw error;
    } finally {
      secrets.clear();
    }
  }
  async #call(entry, input, { signal, authorize, values, readValues, acquire }) {
    if (this.closed) throw new Error("MCP 连接已关闭");
    await validateExternal(this.root, entry, input);
    signal?.throwIfAborted();
    let session = input.sessionId ? this.sessions.get(input.sessionId) : null;
    if (input.sessionId && (!session || session.entry.id !== entry.id)) throw new Error("MCP 会话已失效或不属于此服务；重新准备新的工作，不要重放云端提交");
    if (!await authorize()) throw new Error("用户已禁止关联 Skill、Tool、MCP 或操作");
    if (input.operation === "close_session") { await this.drop(session); return { content: [{ type: "text", text: entry.id === "qpanda_runtime"
      ? "本地 MCP 会话已关闭；已提交的云端任务没有取消，可能继续运行。" : "MCP 会话与计算进程已关闭" }] }; }
    const currentValues = await readValues();
    // Validation, policy and credential reads can yield while the Agent closes.
    if (this.closed) throw new Error("MCP 连接已关闭");
    if (session && (session.generation !== generation(entry, currentValues)
        || (session.authenticated && credentialGeneration(currentValues) !== session.authenticated))) {
      await this.drop(session); throw new Error("MCP 配置或凭据已变化；旧会话已关闭，请重新开始");
    }
    if (session?.busy) throw new Error("此 MCP 会话正在执行，请等待完成或取消");
    if (!session) {
      if (this.sessions.size >= this.maxSessions) throw new Error("MCP 会话已达到上限，请先关闭已完成的会话");
      session = { id: randomUUID(), entry, generation: generation(entry, currentValues), authorize, values,
        controller: new AbortController(), lastUsed: Date.now(), busy: true };
      this.sessions.set(session.id, session);
    }
    session.busy = true;
    // Keep only the original getter: readValues owns this call's secret set and
    // must never be retained by a persistent session or credential reconciliation.
    session.authorize = authorize; session.values = values;
    const abort = () => this.drop(session).catch(() => {});
    signal?.addEventListener("abort", abort, { once: true });
    try {
      if (!session.client) {
        session.opening = (async () => {
          session.lease = await acquire();
          session.controller.signal.throwIfAborted();
          Object.assign(session, await this.connect(this.root, entry, currentValues, { signal: session.controller.signal }));
          const actual = await session.client.listTools({}, { timeout: 90000, signal: session.controller.signal });
          const expected = await externalContract(this.root, entry.id);
          if (actual.nextCursor || !isDeepStrictEqual(sorted(actual.tools), sorted(expected.tools))) throw new Error("MCP 实际 Tool 合同与固定版本不一致，已停止调用");
        })();
        if (signal?.aborted) session.controller.abort();
        await session.opening;
      }
      const combined = signal ? AbortSignal.any([signal, session.controller.signal]) : session.controller.signal;
      combined.throwIfAborted();
      if (!await authorize()) throw new Error("用户已禁止此操作");
      if (entry.id === "qpanda_runtime" && operationCredential(entry, input.operation, input.arguments) && !session.authenticated) {
        if (!currentValues.QPANDA3_API_KEY) throw new Error("请先在配置表单填写本源量子 API Key");
        session.authenticated = credentialGeneration(currentValues);
        // The reviewed account initializer is private to this adapter. Its
        // arguments and response never enter the model or recent activity.
        const auth = await session.client.callTool({ name: "setup_origin_quantum_account_tool", arguments: { api_key: currentValues.QPANDA3_API_KEY } }, undefined, { signal: combined, timeout: 90000 });
        let body = auth.structuredContent;
        if (!body) try { body = JSON.parse(auth.content?.find(item => item.type === "text")?.text); } catch { /* Malformed authentication results fail closed below. */ }
        if (auth.isError || body?.status !== "success") throw new Error("本源量子账户初始化失败，请检查凭据与网络；未提交计算任务");
      }
      combined.throwIfAborted();
      if (!await authorize()) throw new Error("用户已禁止此操作");
      if (session.authenticated && credentialGeneration(await readValues()) !== session.authenticated) throw new Error("凭据已变化，请重新开始会话");
      const result = externalResult(await session.client.callTool({ name: input.operation, arguments: input.arguments }, undefined, { signal: combined, timeout: 180000 }));
      if (Buffer.byteLength(JSON.stringify(result)) > 2 * 1024 * 1024) throw new Error("MCP 返回超过 2 MiB 传输预算，会话已关闭");
      session.lastUsed = Date.now();
      // Upstream stop_training only changes a flag. Closing the owned process
      // group is the only supported real cancellation of a Gym calculation.
      const stop = entry.id === "qiskit_gym" && input.operation === "stop_training_tool" && !result.isError;
      if (!entry.persistent || stop) await this.drop(session);
      return { ...result, content: [...(result.content ?? []), ...(entry.persistent ? [{ type: "text", text: JSON.stringify(stop
        ? { sessionClosed: true, message: "已终止此会话的计算进程。未保存的会话状态已释放。" }
        : { sessionId: session.id, heartbeatDeadline: new Date(session.lastUsed + this.idleMs).toISOString(), next: entry.id === "qpanda_runtime"
          ? "Use this sessionId for following operations. Query within 30 minutes to renew the local session. Expiration or close_session releases local bindings and task handles; submitted cloud tasks are NOT cancelled. Preserve task IDs for account-side recovery; never replay submissions."
          : "Use this sessionId for following operations. Query progress within 30 minutes to renew the lease; expiration or close_session stops ALL work, including background training. Save models before closing." }) }] : [])] };
    } catch (error) { await this.drop(session); throw error; }
    finally { session.busy = false; signal?.removeEventListener("abort", abort); }
  }
  close() {
    this.closed = true; clearInterval(this.timer);
    return this.closePromise ??= (async () => {
      const active = [...this.sessions.values()].map(session => this.drop(session));
      const settled = await Promise.allSettled([...active, ...this.closing]);
      const failures = settled.filter(result => result.status === "rejected").map(result => result.reason);
      if (failures.length) throw new AggregateError(failures, "MCP 连接回收失败");
    })();
  }
}
