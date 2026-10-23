import { randomBytes } from "node:crypto";

const LIFETIME_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 32;
const matches = (request, scope) => Object.entries(scope).every(([key, value]) => request[key] === value);

// Process-local authorization metadata only; credential values never enter here.
// Consumption is synchronous so concurrent requests cannot reuse a permission.
export function createCredentialRequests() {
  const requests = new Map();
  let closed = false;
  function prune() {
    const now = Date.now();
    for (const [nonce, request] of requests) if (request.expires < now) requests.delete(nonce);
  }
  function peek(nonce, scope = {}) {
    const request = requests.get(nonce);
    if (closed || !request) return undefined;
    if (request.expires < Date.now()) { requests.delete(nonce); return undefined; }
    return matches(request, scope) ? request : undefined;
  }
  return {
    issue(scope) {
      if (closed) throw new Error("凭据配置请求无效：设置页已关闭，请重新打开。");
      prune();
      if (requests.size >= MAX_REQUESTS) throw new Error("凭据请求过多，请稍后重试");
      const nonce = randomBytes(32).toString("hex");
      requests.set(nonce, Object.freeze({ ...scope, expires: Date.now() + LIFETIME_MS }));
      return nonce;
    },
    peek,
    consume(nonce, scope = {}) {
      const request = peek(nonce, scope);
      if (request) requests.delete(nonce);
      return request;
    },
    has(scope) {
      prune();
      return !closed && [...requests.values()].some(request => matches(request, scope));
    },
    close() { closed = true; requests.clear(); },
  };
}
