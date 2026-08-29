import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
} from "@agentclientprotocol/sdk";
import { loadOverlayPatches } from "@deepseek-ai/dsh-app-boot";

import {
  buildCcConnectPlatformSetupArgs,
  ensureCcConnectConfig,
  probeCcConnectManagement,
  readCcConnectStatus,
  renderCcConnectConfig,
  resolveCcConnectPaths,
} from "../src/channels/cc-connect.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function startOpenAiCompletionServer() {
  let resolveRequest;
  let rejectRequest;
  const request = new Promise((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  const server = createServer((incoming, response) => {
    let body = "";
    incoming.setEncoding("utf8");
    incoming.on("data", (chunk) => {
      body += chunk;
    });
    incoming.on("error", rejectRequest);
    incoming.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        resolveRequest({
          authorization: incoming.headers.authorization,
          body: parsed,
          method: incoming.method,
          url: incoming.url,
        });
        const id = "chatcmpl-openquantum-settings-test";
        const common = {
          id,
          object: "chat.completion.chunk",
          created: 0,
          model: parsed.model,
        };
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
        });
        response.write(`data: ${JSON.stringify({
          ...common,
          choices: [{
            index: 0,
            delta: { role: "assistant", content: "settings override reached" },
            finish_reason: null,
          }],
        })}\n\n`);
        response.write(`data: ${JSON.stringify({
          ...common,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
          },
        })}\n\n`);
        response.end("data: [DONE]\n\n");
      } catch (error) {
        rejectRequest(error);
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "invalid test request" } }));
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  return {
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    request,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections?.();
      });
    },
  };
}

function insertedRows(patches) {
  return patches.flatMap((patch) => Array.isArray(patch.insert) ? patch.insert : []);
}

async function materializeRuntime(root) {
  const paths = resolveCcConnectPaths(root);
  await Promise.all([
    mkdir(path.dirname(paths.ccConnectBin), { recursive: true }),
    mkdir(path.dirname(paths.acpConfigPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(paths.ccConnectBin, "binary"),
    writeFile(paths.acpBin, "binary"),
    writeFile(paths.acpConfigPath, "config"),
  ]);
}

test("CC Connect quick setup passes config through each platform subcommand", () => {
  const args = buildCcConnectPlatformSetupArgs(
    projectRoot,
    "weixin",
    ["-timeout", "480"],
  );
  const paths = resolveCcConnectPaths(projectRoot);
  assert.deepEqual(args, [
    "weixin",
    "setup",
    "-config",
    paths.configPath,
    "-project",
    "openquantum",
    "-timeout",
    "480",
  ]);
  assert.throws(
    () => buildCcConnectPlatformSetupArgs(projectRoot, "unsupported"),
    /不支持的 CC Connect 快速配置/,
  );
});

test("CC Connect config is local, deterministic in shape, and never overwritten", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openquantum-cc-connect-"));
  await materializeRuntime(root);
  const first = await ensureCcConnectConfig(root, {
    tokenFactory: () => "t".repeat(48),
    probe: async () => false,
  });
  assert.equal(first.created, true);
  assert.equal(first.state, "needs-platform");
  assert.equal(first.configured, true);
  assert.equal(first.running, false);
  assert.deepEqual(first.platformTypes, []);
  assert.equal(JSON.stringify(first).includes("t".repeat(48)), false);

  const paths = resolveCcConnectPaths(root);
  const config = await readFile(paths.configPath, "utf8");
  assert.equal(config, renderCcConnectConfig(root, "t".repeat(48)));
  assert.match(config, /type = "acp"/);
  assert.match(config, /dsh-acp-demo/);
  assert.doesNotMatch(config, /OPENQUANTUM_PUBLIC_API_KEY|sk-/);
  if (process.platform !== "win32") {
    assert.equal((await stat(paths.configPath)).mode & 0o777, 0o600);
  }

  await writeFile(paths.configPath, `${config}\n# user-owned\n`, "utf8");
  await chmod(paths.configPath, 0o600);
  const second = await ensureCcConnectConfig(root, {
    tokenFactory: () => "x".repeat(48),
    probe: async () => false,
  });
  assert.equal(second.created, false);
  assert.match(await readFile(paths.configPath, "utf8"), /# user-owned/);
  assert.doesNotMatch(await readFile(paths.configPath, "utf8"), /x{48}/);
});

test("CC Connect status exposes channel types but never platform credentials", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openquantum-cc-connect-status-"));
  await materializeRuntime(root);
  await ensureCcConnectConfig(root, {
    tokenFactory: () => "m".repeat(48),
    probe: async () => false,
  });
  const paths = resolveCcConnectPaths(root);
  await writeFile(paths.configPath, `${await readFile(paths.configPath, "utf8")}
[[projects.platforms]]
type = "feishu"
[projects.platforms.options]
app_secret = "must-not-leak"
`, "utf8");
  const status = await readCcConnectStatus(root, { probe: async () => true });
  assert.equal(status.state, "running");
  assert.deepEqual(status.platformTypes, ["feishu"]);
  assert.equal(JSON.stringify(status).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(status).includes("m".repeat(48)), false);
});

test("CC Connect management probe authenticates the exact local service", async () => {
  let request;
  const running = await probeCcConnectManagement(9820, {
    token: "local-management-token",
    fetchImpl: async (...args) => {
      request = args;
      return { ok: true };
    },
  });
  assert.equal(running, true);
  assert.equal(request[0], "http://127.0.0.1:9820/api/v1/status");
  assert.equal(request[1].headers.authorization, "Bearer local-management-token");
});

test("CC Connect ACP shares model composition and deployment defaults", () => {
  const acpConfigPath = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "cc-connect",
    "cordis.yml",
  );
  const deploymentPatchPath = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "cordis.patch.yml",
  );
  const modelRoutesPath = path.join(
    projectRoot,
    "runtime",
    "openquantum",
    "model-routes.cordis.yml",
  );
  const acpRows = loadOverlayPatches("openquantum-cc-connect-test", acpConfigPath);
  const deploymentPatches = loadOverlayPatches(
    "openquantum-cc-connect-test",
    deploymentPatchPath,
  );
  const modelRouteRows = loadOverlayPatches(
    "openquantum-cc-connect-test",
    modelRoutesPath,
  );
  const acpById = new Map(acpRows.map((row) => [row.id, row]));
  const deploymentById = new Map(
    deploymentPatches.filter((patch) => patch.id).map((patch) => [patch.id, patch]),
  );
  const deploymentInserted = new Map(
    insertedRows(deploymentPatches).map((row) => [row.id, row]),
  );
  const acpAgent = acpById.get("acp-agent");
  const deploymentDefault = deploymentById.get("agent-default-model")?.config;

  assert.deepEqual(deploymentDefault, {
    provider: "openquantum-public",
    model: "kimi-k2.7-code",
  });
  assert.deepEqual(
    { provider: acpAgent?.config?.provider, model: acpAgent?.config?.model },
    deploymentDefault,
  );
  assert.equal(typeof acpAgent?.config?.persona, "string");
  assert.match(acpAgent.config.persona, /trusted Acceptance Report or Result Commit/);

  assert.equal(acpById.get("settings")?.name, "@deepseek-ai/dsh-settings-file");
  assert.deepEqual(
    acpById.get("settings")?.config?.dshHome,
    acpAgent?.config?.dshHome,
  );
  assert.deepEqual(
    acpById.get("credentials")?.config?.dshHome,
    acpAgent?.config?.dshHome,
  );
  assert.equal(
    acpById.get("openquantum-model-routes")?.name,
    "@deepseek-ai/cordis-plugin-include",
  );
  assert.equal(
    path.resolve(
      path.dirname(acpConfigPath),
      acpById.get("openquantum-model-routes")?.config?.path,
    ),
    modelRoutesPath,
  );
  assert.equal(
    acpRows.some((row) => row.name === "@deepseek-ai/dsh-llm-pi-ai"),
    false,
  );

  assert.equal(deploymentById.get("llm-pi-ai")?.disabled, true);
  assert.equal(
    deploymentInserted.get("openquantum-model-routes")?.name,
    "@deepseek-ai/cordis-plugin-include",
  );
  assert.equal(modelRouteRows.length, 1);
  assert.equal(modelRouteRows[0]?.id, "openquantum-llm-pi-ai");
  assert.equal(modelRouteRows[0]?.name, "@deepseek-ai/dsh-llm-pi-ai");
  assert.equal(
    modelRouteRows[0]?.config?.providers?.["openquantum-public"]?.models?.[0]?.id,
    deploymentDefault.model,
  );
});

test("OpenQuantum ACP uses the shared settings.yaml model route override", { timeout: 60_000 }, async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "openquantum-acp-"));
  const dshHome = path.join(stateRoot, "dsh");
  const modelServer = await startOpenAiCompletionServer();
  await mkdir(dshHome, { recursive: true });
  await writeFile(
    path.join(dshHome, "settings.yaml"),
    `llm-pi-ai:\n  providers:\n    openquantum-public:\n      baseURL: ${modelServer.baseURL}\n`,
    { mode: 0o600 },
  );
  const paths = resolveCcConnectPaths(projectRoot);
  const child = spawn(paths.acpBin, ["--config", paths.acpConfigPath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DSH_HOME: dshHome,
      DSH_PERMISSION_MODE: "workspace-write",
      DSH_TELEMETRY_DISABLED: "1",
      OPENQUANTUM_CC_CONNECT_SESSIONS_ROOT: path.join(stateRoot, "sessions"),
      OPENQUANTUM_DISABLE_QISKIT_MCP: "1",
      OPENQUANTUM_PUBLIC_API_KEY: "test-only-dummy-key",
      OPENQUANTUM_PUBLIC_BASE_URL: "http://127.0.0.1:1/v1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const connection = new ClientSideConnection(() => ({
    async requestPermission() {
      return { outcome: { outcome: "cancelled" } };
    },
    async sessionUpdate() {},
    async readTextFile() { return { content: "" }; },
    async writeTextFile() { return {}; },
  }), ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)));
  try {
    const initialized = await connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {},
    });
    assert.equal(initialized.protocolVersion, PROTOCOL_VERSION);
    const session = await connection.newSession({ cwd: projectRoot, mcpServers: [] });
    assert.equal(typeof session.sessionId, "string");
    assert.ok(session.sessionId.length > 0);
    const prompt = await connection.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "Reply with one short confirmation." }],
    });
    assert.equal(prompt.stopReason, "end_turn");
    const modelRequest = await modelServer.request;
    assert.equal(modelRequest.method, "POST");
    assert.equal(modelRequest.url, "/v1/chat/completions");
    assert.equal(modelRequest.body.model, "kimi-k2.7-code");
    assert.equal(modelRequest.authorization, "Bearer test-only-dummy-key");
    assert.equal(child.exitCode, null, `ACP exited after its model turn\n${stderr}`);
    assert.doesNotMatch(stderr, /entries did not activate/);
  } catch (error) {
    assert.fail(`${error instanceof Error ? error.stack : error}\nACP stderr:\n${stderr}`);
  } finally {
    child.stdin.end();
    if (child.exitCode === null) child.kill("SIGTERM");
    if (child.exitCode === null) {
      await new Promise((resolve) => child.once("exit", resolve));
    }
    await modelServer.close();
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test("CC Connect boots its real management service with the OpenQuantum ACP project", { timeout: 30_000 }, async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "openquantum-cc-connect-boot-"));
  const configPath = path.join(stateRoot, "config.toml");
  const port = await availablePort();
  const token = "local-management-test-token-000000";
  const config = renderCcConnectConfig(projectRoot, token)
    .replace("port = 9820", `port = ${port}`)
    .concat(`
[[projects.platforms]]
type = "cloud_web"
[projects.platforms.options]
token = "local-platform-test-token"
transport = "websocket"
ws_url = "ws://127.0.0.1:9"
allow_from = "*"
`);
  await writeFile(configPath, config, { mode: 0o600 });
  const binary = resolveCcConnectPaths(projectRoot).ccConnectBin;
  const child = spawn(binary, ["--config", configPath], {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  try {
    let response;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/api/v1/status`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (response.ok) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(response?.ok, `management service did not become ready\n${output}`);
    const body = await response.json();
    assert.equal(typeof body, "object");
  } finally {
    // CC Connect supervises platform workers. Kill its isolated process group so
    // the test also closes workers that outlive the foreground coordinator.
    if (child.exitCode === null && process.platform !== "win32") {
      process.kill(-child.pid, "SIGINT");
    } else if (child.exitCode === null) {
      child.kill("SIGINT");
    }
    if (child.exitCode === null) {
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
});
