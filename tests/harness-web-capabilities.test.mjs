import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  apply,
  capabilityRequestBoundary,
  createCapabilitySettingsHandler,
  dispatchMessageChannelCommand,
} from "../runtime/openquantum/web-capabilities/index.mjs";

const SAME_ORIGIN_HEADERS = {
  "content-type": "application/json",
  host: "127.0.0.1:3000",
  origin: "http://127.0.0.1:3000",
  "sec-fetch-site": "same-origin",
};

function request(body, overrides = {}) {
  return {
    method: "POST",
    headers: SAME_ORIGIN_HEADERS,
    ...overrides,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body));
    },
  };
}

function response() {
  const result = { status: 0, headers: {}, body: "" };
  return {
    result,
    writeHead(status, headers) {
      result.status = status;
      result.headers = headers;
    },
    end(body = "") {
      result.body = body;
    },
  };
}

test("registers Harness-native routes and wires credentials into capability commands", async () => {
  const routes = [];
  const labels = [];
  const described = [];
  const dispose = () => {};
  apply({
    credentials: {
      async describe(ref) {
        described.push(ref);
        return { configured: false, writable: true };
      },
    },
    webServer: {
      register(route) {
        routes.push(route);
        return dispose;
      },
    },
    effect(register, label) {
      labels.push(label);
      assert.equal(register(), dispose);
    },
  });

  assert.deepEqual(labels, [
    "openquantum: capability settings API",
    "openquantum: message channel settings API",
  ]);
  assert.deepEqual(routes.map((route) => route.path), [
    "/openquantum/api/capabilities",
    "/openquantum/api/channels",
  ]);

  const capabilityRoute = routes.find(
    (route) => route.path === "/openquantum/api/capabilities",
  );
  const snapshotResponse = response();
  await capabilityRoute.handler(request({ action: "snapshot" }), snapshotResponse);
  assert.equal(snapshotResponse.result.status, 200);
  const snapshot = JSON.parse(snapshotResponse.result.body);
  const server = snapshot.mcpServers.find(
    (candidate) => candidate.serverName === "qiskit_ibm_runtime",
  );
  assert.ok(server);

  const blockedResponse = response();
  await capabilityRoute.handler(
    request({
      action: "mcp.update",
      serverName: server.serverName,
      revision: snapshot.mcpRevision,
      enabled: true,
      toolCallTimeoutMs: server.toolCallTimeoutMs,
      reconnect: server.reconnect,
    }),
    blockedResponse,
  );
  assert.equal(blockedResponse.result.status, 400);
  assert.match(
    JSON.parse(blockedResponse.result.body).error,
    /请先配置必需凭据：QISKIT_IBM_TOKEN/,
  );
  assert.deepEqual(described, ["QISKIT_IBM_TOKEN"]);
});

test("message-channel dispatcher exposes a bounded CC Connect Interface", async () => {
  const snapshot = await dispatchMessageChannelCommand(process.cwd(), {
    action: "snapshot",
  });
  assert.equal(snapshot.id, "cc-connect");
  assert.equal(snapshot.version, "1.5.0");
  assert.deepEqual(Object.keys(snapshot.commands), ["setup", "start", "web", "status"]);
  assert.equal(JSON.stringify(snapshot).includes("token"), false);
  await assert.rejects(
    dispatchMessageChannelCommand(process.cwd(), { action: "service.start" }),
    /未知消息渠道命令/,
  );
});

test("capability settings boundary rejects cross-site and non-JSON requests", () => {
  assert.deepEqual(
    capabilityRequestBoundary(
      request({}, {
        headers: { ...SAME_ORIGIN_HEADERS, "sec-fetch-site": "cross-site" },
      }),
    ),
    {
      status: 403,
      error: "Capability settings require a same-origin browser request",
    },
  );
  assert.deepEqual(
    capabilityRequestBoundary(
      request({}, {
        headers: { ...SAME_ORIGIN_HEADERS, "content-type": "text/plain" },
      }),
    ),
    {
      status: 415,
      error: "Capability settings require application/json",
    },
  );
});

test("capability handler returns only its injected project projection", async () => {
  const observed = [];
  const handler = createCapabilitySettingsHandler({
    projectRoot: "/safe/project",
    async dispatch(root, command) {
      observed.push({ root, command });
      return {
        skills: [{ name: "quantum-ground-state" }],
        mcpServers: [{ serverName: "fieldqkit" }],
        mcpCredentials: [{ ref: "QUAFU_API_TOKEN" }],
        mcpRevision: "a".repeat(64),
      };
    },
  });
  const target = response();
  await handler(request({ action: "snapshot" }), target);

  assert.equal(target.result.status, 200);
  assert.equal(target.result.headers["cache-control"], "no-store");
  assert.deepEqual(observed, [
    { root: "/safe/project", command: { action: "snapshot" } },
  ]);
  assert.deepEqual(JSON.parse(target.result.body), {
    skills: [{ name: "quantum-ground-state" }],
    mcpServers: [{ serverName: "fieldqkit" }],
    mcpCredentials: [{ ref: "QUAFU_API_TOKEN" }],
    mcpRevision: "a".repeat(64),
  });
});

test("client plugin contributes the native settings section and uses Harness credentials", async () => {
  const [manifest, client] = await Promise.all([
    readFile(
      new URL(
        "../runtime/openquantum/web-capabilities/package.json",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../runtime/openquantum/web-capabilities/client.js",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const pkg = JSON.parse(manifest);

  assert.equal(pkg.exports["./client"], "./client.js");
  assert.equal(pkg.exports["./package.json"], "./package.json");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.match(client, /settings\.section/);
  assert.match(client, /openquantum-capabilities/);
  assert.match(client, /openquantum-channels/);
  assert.match(client, /\/openquantum\/api\/channels/);
  assert.match(client, /消息平台/);
  assert.match(client, /CC Connect/);
  assert.match(client, /DeepSeek Harness/);
  assert.match(client, /channel\.commands\.start/);
  assert.match(client, /api\.credentials\.set/);
  assert.match(client, /api\.credentials\.unset/);
  assert.match(client, /已有值不会回显/);
  assert.match(client, /requiredByEnabled/);
  assert.match(client, /Harness MCP Client 独立连接和启停 Server/);
  assert.match(client, /不执行 Tool、启动 MCP Server 或读取凭据/);
  assert.match(client, /不代表 Server 已运行或 Tool 已进入 Registry/);
  assert.match(client, /连接配置启用/);
  assert.match(client, /配置变更需重启后生效/);
  assert.match(client, /添加现有 Skill/);
  assert.match(client, /\.agents\/skills\/<skill-name>\/SKILL\.md/);
  assert.match(client, /设置中心只管理发现后的加载策略，不在表单里创作 Skill/);
  assert.match(client, /允许 Agent 自动加载/);
  assert.doesNotMatch(client, /Agent 可用/);
  assert.doesNotMatch(client, /skill\.create|Skill 指令（Markdown）/);
  assert.match(client, /注册已有 MCP Server/);
  assert.match(client, /不会下载、安装或创建 MCP Server/);
  assert.match(client, /\.oq-cap-credential\{display:flex;flex-direction:column;gap:12px\}/);
  assert.doesNotMatch(client, /\.oq-cap-credential\{[^}]*grid-template-columns/);
  assert.doesNotMatch(client, /HARNESS EXTENSIONS|className: "oq-cap-hero"/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});
