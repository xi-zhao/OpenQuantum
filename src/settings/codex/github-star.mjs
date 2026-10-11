export const GITHUB_REPOSITORY = "xi-zhao/OpenQuantum";
export const GITHUB_REPOSITORY_URL = `https://github.com/${GITHUB_REPOSITORY}`;
const DEVICE_URL = "https://github.com/login/device";
const STAR_PATH = `/user/starred/${GITHUB_REPOSITORY}`;
const API = "https://api.github.com";
const MAX_RESPONSE = 32768;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function tokenValue(value) { return typeof value === "string" && /^[A-Za-z0-9_]{20,4096}$/.test(value); }
function failure(status, action) {
  if (status === 403) return new Error(`GitHub 拒绝${action}：权限不足或请求受限，请检查授权后重试。`);
  if (status === 429) return new Error("GitHub 请求过于频繁，请稍后重试。");
  if (status >= 500) return new Error("GitHub 服务暂不可用，请稍后重试。");
  return new Error(`无法${action}，请稍后重试。`);
}

// This service owns one UI click at a time. Neither status nor authorization
// polling can star a repository. Only an unexpired originating intent can PUT.
// Tokens stay in this service and its dedicated system-credential-store entry.
export class GitHubStar {
  constructor({ credentials, clientId = "", fetchImpl = fetch, now = Date.now }) {
    if (typeof clientId !== "string" || (clientId && !/^[A-Za-z0-9._-]{6,128}$/.test(clientId))) throw new Error("GitHub App Client ID 配置无效");
    Object.assign(this, { credentials, clientId, fetchImpl, now });
    this.ref = `github-star:${clientId}`;
    this.closed = false;
  }
  view(state, extra = {}) { return { state, repository: GITHUB_REPOSITORY, repositoryUrl: GITHUB_REPOSITORY_URL, ...extra }; }
  signedOut(message = "首次支持需要授权 GitHub，授权完成后会执行此次 Star。") { return this.view("signed_out", { message }); }
  pendingView(flow) {
    return this.view("authorizing", { flowId: flow.id, userCode: flow.userCode, verificationUrl: DEVICE_URL,
      expiresAt: flow.expiresAt, pollAfterMs: Math.max(1000, flow.nextPollAt - this.now()), message: "在 GitHub 输入下方授权码并确认，完成后会自动为 OpenQuantum 点 Star。" });
  }
  assertIntent(intent) {
    if (this.closed || this.signal?.aborted || !intent || this.intent !== intent || intent.expiresAt <= this.now()) throw new Error("此次 Star 已取消或超时，请重新点击。");
  }
  clearIntent(intent) { if (this.intent === intent) { this.intent = null; this.pending = null; } }
  async http(url, { method = "GET", token, body } = {}) {
    if (this.closed) throw new Error("GitHub 连接已关闭");
    if (this.signal?.aborted) throw new Error("GitHub 请求已取消");
    const controller = new AbortController();
    this.controller = controller;
    try {
      const response = await this.fetchImpl(url, { method, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000), ...(this.signal ? [this.signal] : [])]),
        headers: { Accept: "application/json", "User-Agent": "OpenQuantum", ...(url.startsWith(API) ? { "X-GitHub-Api-Version": "2026-03-10" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
        ...(body ? { body: new URLSearchParams(body).toString() } : method === "PUT" ? { body: "" } : {}) });
      const chunks = []; let length = 0;
      for await (const chunk of response.body ?? []) {
        length += chunk.byteLength;
        if (length > MAX_RESPONSE) { controller.abort(); throw new Error("Response too large"); }
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      return { status: response.status, value: text ? JSON.parse(text) : undefined };
    } catch {
      // Never propagate upstream bodies, URLs with credentials, or fetch errors.
      throw new Error("无法连接 GitHub，请稍后重试；未确认成功前不会显示已 Star。");
    } finally { if (this.controller === controller) this.controller = null; }
  }
  async stored() {
    const raw = await this.credentials.resolve(this.ref);
    if (!raw) return null;
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error("GitHub 授权记录无效，请断开后重新授权"); }
    if (!tokenValue(value?.accessToken) || !Number.isFinite(value.expiresAt)) throw new Error("GitHub 授权记录无效，请断开后重新授权");
    return value.expiresAt > this.now() ? value : null;
  }
  async accountStatus(record) {
    const identity = await this.http(`${API}/user`, { token: record.accessToken });
    if (identity.status === 401) return this.signedOut("GitHub 授权已失效，请重新授权。");
    if (identity.status !== 200) throw failure(identity.status, "确认 GitHub 账号");
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(identity.value?.login ?? "") || !Number.isSafeInteger(identity.value?.id)) throw new Error("GitHub 账号响应无效，请稍后重试。");
    const response = await this.http(`${API}${STAR_PATH}`, { token: record.accessToken });
    if (response.status === 401) return this.signedOut("GitHub 授权已失效，请重新授权。");
    if (![204, 404].includes(response.status)) throw failure(response.status, "读取 Star 状态");
    const account = identity.value.login;
    return this.view(response.status === 204 ? "starred" : "ready", { account, accountId: identity.value.id,
      message: response.status === 204 ? "感谢支持 OpenQuantum！" : `将使用 GitHub 账号 ${account} 为 OpenQuantum 点 Star。` });
  }
  async status() {
    if (this.intent?.expiresAt > this.now()) return this.view("busy", { message: "另一设置页正在处理此次 Star，请在原页面继续或取消。" });
    this.intent = null; this.pending = null;
    const record = await this.stored();
    return record ? this.accountStatus(record) : this.signedOut();
  }
  async start(flowId) {
    if (this.intent?.expiresAt > this.now()) {
      if (this.pending?.id === flowId) return this.pendingView(this.pending);
      throw new Error("已有一次 Star 正在处理，请在原页面继续或取消。");
    }
    const intent = { id: flowId, expiresAt: this.now() + 900000, phase: "authorizing" };
    this.intent = intent; this.pending = null;
    try {
      const record = await this.stored();
      this.assertIntent(intent);
      if (record) {
        const state = await this.accountStatus(record);
        this.assertIntent(intent);
        if (state.state === "starred") { this.clearIntent(intent); return state; }
        if (state.state === "ready") {
          intent.phase = "ready"; intent.accountId = state.accountId;
          return { ...state, flowId };
        }
      }
      if (this.lastStartAt !== undefined && this.now() - this.lastStartAt < 10000) throw new Error("请稍候再发起 GitHub 授权");
      this.lastStartAt = this.now();
      const { status, value } = await this.http("https://github.com/login/device/code", { method: "POST", body: { client_id: this.clientId, scope: "offline_access" } });
      this.assertIntent(intent);
      if (status !== 200) throw failure(status, "开始 GitHub 授权");
      if (value?.verification_uri !== DEVICE_URL || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value?.user_code ?? "") ||
        !/^[A-Za-z0-9_-]{20,256}$/.test(value?.device_code ?? "") || !Number.isInteger(value?.expires_in) || value.expires_in < 1 || value.expires_in > 900 ||
        !Number.isInteger(value?.interval) || value.interval < 1 || value.interval > 60) throw new Error("无法开始 GitHub 授权，请确认应用已启用设备授权");
      const interval = Math.max(5, value.interval) * 1000;
      intent.expiresAt = this.now() + value.expires_in * 1000;
      this.pending = { id: flowId, deviceCode: value.device_code, userCode: value.user_code, expiresAt: intent.expiresAt, interval, nextPollAt: this.now() + interval };
      return this.pendingView(this.pending);
    } catch (error) { this.clearIntent(intent); throw error; }
  }
  async poll(flowId) {
    const flow = this.pending, intent = this.intent;
    if (!flow || flow.id !== flowId) throw new Error("这次 GitHub 授权已结束，请重新开始");
    if (flow.expiresAt <= this.now()) { this.clearIntent(intent); return this.signedOut("GitHub 授权已超时，请重试。"); }
    this.assertIntent(intent);
    if (this.now() < flow.nextPollAt) return this.pendingView(flow);
    flow.nextPollAt = this.now() + flow.interval;
    const response = await this.http("https://github.com/login/oauth/access_token", { method: "POST", body: { client_id: this.clientId, device_code: flow.deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" } });
    this.assertIntent(intent);
    if (response.status !== 200) throw failure(response.status, "完成 GitHub 授权");
    const value = response.value;
    if (value?.error === "authorization_pending") return this.pendingView(flow);
    if (value?.error === "slow_down") {
      flow.interval += 5000;
      flow.nextPollAt = this.now() + flow.interval;
      return this.pendingView(flow);
    }
    if (["expired_token", "access_denied"].includes(value?.error)) {
      this.clearIntent(intent);
      return this.signedOut(value.error === "access_denied" ? "已取消 GitHub 授权。" : "GitHub 授权已超时，请重试。");
    }
    if (value?.token_type?.toLowerCase() !== "bearer" || !tokenValue(value?.access_token) ||
      (value.expires_in !== undefined && (!Number.isInteger(value.expires_in) || value.expires_in < 1))) throw new Error("GitHub 未完成授权，请重试");
    // Keep the default short-lived authorization; refresh tokens are discarded.
    const record = { accessToken: value.access_token, expiresAt: this.now() + Math.min(value.expires_in ?? 28800, 28800) * 1000 };
    const state = await this.accountStatus(record);
    this.assertIntent(intent);
    if (!["ready", "starred"].includes(state.state)) { this.clearIntent(intent); return state; }
    const encoded = JSON.stringify(record);
    await this.credentials.set(this.ref, encoded);
    // Cancellation ends the Star intent, not an already completed GitHub grant.
    // Do not roll back this shared Keychain entry: another MCP process may have
    // replaced it. Only an explicit disconnect removes saved authorization.
    this.assertIntent(intent);
    this.pending = null;
    if (state.state === "starred") { this.clearIntent(intent); return state; }
    intent.phase = "ready"; intent.accountId = state.accountId;
    return { ...state, flowId };
  }
  async star(flowId) {
    const intent = this.intent;
    if (intent?.id !== flowId || intent.phase !== "ready") throw new Error("请重新点击 Star；已结束的请求不能再次提交。");
    this.assertIntent(intent);
    try {
      const record = await this.stored();
      this.assertIntent(intent);
      if (!record) return this.signedOut("GitHub 授权已失效，请重新点击 Star 授权。");
      const state = await this.accountStatus(record);
      this.assertIntent(intent);
      if (state.state === "signed_out") return state;
      if (state.accountId !== intent.accountId) throw new Error("GitHub 账号已改变，请确认账号后重新点击 Star。");
      if (state.state === "starred") return state;
      // No await between the final intent check and dispatch. Cancellation can
      // stop preflight, but a PUT already sent cannot reliably be taken back.
      intent.phase = "submitting";
      const response = await this.http(`${API}${STAR_PATH}`, { method: "PUT", token: record.accessToken });
      if (response.status === 401) return this.signedOut("GitHub 授权已失效，请重新授权。");
      if (response.status !== 204) throw failure(response.status, "提交 Star");
      return this.view("starred", { account: state.account, message: "感谢支持 OpenQuantum！" });
    } finally { this.clearIntent(intent); }
  }
  cancel(flowId) {
    const intent = this.intent;
    if (!intent || intent.id !== flowId) throw new Error("此次请求已经结束，请刷新 Star 状态。");
    if (intent.phase === "submitting") return this.view("submitting", { message: "Star 请求已发出，正在等待 GitHub 确认。" });
    this.clearIntent(intent);
    this.controller?.abort();
    return this.view("canceled", { message: "已取消此次 Star。已完成的 GitHub 授权可通过「断开授权」移除。" });
  }
  async command(input, signal) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !["action", "flowId"].includes(key)) || !/^github\.(status|start|poll|cancel|star|disconnect)$/.test(input.action ?? "")) throw new Error("GitHub 操作无效");
    const action = input.action.slice(7);
    if (["start", "poll", "cancel", "star"].includes(action) ? !UUID.test(input.flowId ?? "") : input.flowId !== undefined) throw new Error("GitHub 授权标识无效");
    if (this.closed) throw new Error("GitHub 连接已关闭");
    if (signal?.aborted) throw new Error("GitHub 请求已取消");
    if (!this.clientId) return this.view("unavailable", { message: "GitHub 原地授权尚未开放，可以先前往仓库支持项目。" });
    if (action === "cancel") return this.cancel(input.flowId);
    if (this.busy) throw new Error("GitHub 操作正在进行，请稍后重试");
    this.busy = true;
    this.signal = signal;
    const abort = () => {
      if (this.intent && this.intent.id === input.flowId && this.intent.phase !== "submitting") this.clearIntent(this.intent);
      this.controller?.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      if (action === "disconnect") {
        this.clearIntent(this.intent); await this.credentials.remove(this.ref);
        return this.signedOut("已移除此设备保存的 GitHub 授权；不会取消已点的 Star。可在 GitHub 的应用设置中撤销授权。");
      }
      return await this[action](input.flowId);
    } finally { signal?.removeEventListener("abort", abort); this.signal = null; this.busy = false; }
  }
  close() { this.closed = true; this.clearIntent(this.intent); this.controller?.abort(); }
}
