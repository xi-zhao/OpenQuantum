import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  apply,
  assertMcpEnableAllowed,
  capabilityRequestBoundary,
  createCapabilitySettingsHandler,
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

test("registers one Harness-native capability settings route", () => {
  const routes = [];
  const labels = [];
  const dispose = () => {};
  apply({
    credentials: {
      async describe() {
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

  assert.deepEqual(labels, ["openquantum: capability settings API"]);
  assert.deepEqual(routes.map((route) => route.path), [
    "/openquantum/api/capabilities",
  ]);
});

test("server guard blocks enabling MCPs before required setup is complete", async () => {
  const readSettings = async () => ({
    mcpServers: [
      {
        serverName: "qiskit_ibm_runtime",
        setup: null,
        requiredCredentialRefs: ["QISKIT_IBM_TOKEN"],
      },
      {
        serverName: "fieldqkit",
        setup: null,
        requiredCredentialRefs: [],
      },
    ],
  });
  const credentials = {
    async describe(ref) {
      assert.equal(ref, "QISKIT_IBM_TOKEN");
      return { configured: false, writable: true };
    },
  };

  await assert.rejects(
    assertMcpEnableAllowed(
      "/safe/project",
      { action: "mcp.update", serverName: "qiskit_ibm_runtime", enabled: true },
      credentials,
      readSettings,
    ),
    /请先配置必需凭据：QISKIT_IBM_TOKEN/,
  );
  await assert.doesNotReject(
    assertMcpEnableAllowed(
      "/safe/project",
      { action: "mcp.update", serverName: "fieldqkit", enabled: true },
      credentials,
      readSettings,
    ),
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
  assert.match(client, /api\.credentials\.set/);
  assert.match(client, /api\.credentials\.unset/);
  assert.match(client, /已有值不会回显/);
  assert.match(client, /requiredByEnabled/);
  assert.match(client, /由 Harness MCP Client 独立注册和启停/);
  assert.match(client, /可以调用已注册 Tool，但不会启动 MCP/);
  assert.match(client, /添加现有 Skill/);
  assert.match(client, /\.agents\/skills\/<skill-name>\/SKILL\.md/);
  assert.match(client, /设置中心只管理发现后的调用策略，不在表单里创作 Skill/);
  assert.doesNotMatch(client, /skill\.create|Skill 指令（Markdown）/);
  assert.match(client, /注册已有 MCP Server/);
  assert.match(client, /不会下载、安装或创建 MCP Server/);
  assert.match(client, /\.oq-cap-credential\{display:flex;flex-direction:column;gap:12px\}/);
  assert.doesNotMatch(client, /\.oq-cap-credential\{[^}]*grid-template-columns/);
  assert.doesNotMatch(client, /HARNESS EXTENSIONS|className: "oq-cap-hero"/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});
