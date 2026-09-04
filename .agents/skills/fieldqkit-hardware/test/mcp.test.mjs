import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const serverPath = path.join(skillRoot, "mcp", "server.mjs");
const declaredToolContract = readDeclaredMcpToolContract({
  projectRoot,
  capabilityId: "fieldqkit-hardware",
  serverName: "fieldqkit",
});
let client;
let transport;

before(async () => {
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: projectRoot,
    env: {
      ...process.env,
      QUAFU_API_TOKEN: "test-value-that-must-never-be-returned",
    },
  });
  client = new Client(
    { name: "openquantum-fieldqkit-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
});

after(async () => {
  await client?.close();
});

test("FieldQKit MCP separates read-only setup from lazy-environment discovery", async () => {
  const tools = (await client.listTools()).tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    declaredToolContract.map((tool) => tool.name),
  );
  assert.deepEqual(
    declaredToolContract.map((tool) => [tool.name, tool.effect]),
    [
      ["inspect_fieldqkit_setup", "read-only"],
      ["discover_fieldqkit_backends", "workspace-write"],
    ],
  );
  assert.ok(
    declaredToolContract.every(
      (tool) => tool.effectEvidence === "mcp-annotations",
    ),
  );
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  assert.equal(byName.get("inspect_fieldqkit_setup").annotations.readOnlyHint, true);
  assert.equal(byName.get("inspect_fieldqkit_setup").annotations.openWorldHint, false);
  assert.equal(
    byName.get("discover_fieldqkit_backends").annotations.readOnlyHint,
    false,
  );
  assert.equal(
    byName.get("discover_fieldqkit_backends").annotations.openWorldHint,
    true,
  );
  assert.ok(tools.every((tool) => !tool.annotations.destructiveHint));
  assert.equal(
    tools.find((tool) => tool.name === "discover_fieldqkit_backends")
      .annotations.openWorldHint,
    true,
  );
  assert.equal(tools.some((tool) => /submit|cancel|delete/.test(tool.name)), false);
});

test("setup reports configured references without returning credential values", async () => {
  const result = await client.callTool({
    name: "inspect_fieldqkit_setup",
    arguments: {},
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.fieldqkitVersion, "0.1.2");
  const quafu = result.structuredContent.providers.find(
    (provider) => provider.id === "quafu",
  );
  const tianyan = result.structuredContent.providers.find(
    (provider) => provider.id === "tianyan",
  );
  assert.equal(quafu.configured, true);
  assert.equal(tianyan.configured, false);
  assert.doesNotMatch(
    JSON.stringify(result),
    /test-value-that-must-never-be-returned/,
  );
});

test("cloud discovery fails closed before executing without its credential", async () => {
  const result = await client.callTool({
    name: "discover_fieldqkit_backends",
    arguments: { provider: "tianyan", numQubits: 8 },
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /TIANYAN_API_TOKEN/);
  assert.match(result.content[0].text, /设置中心/);
});

test("FieldQKit bridge receives only an allowlisted environment and redacts provider errors", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.doesNotMatch(source, /env:\s*process\.env/);
  assert.match(source, /BRIDGE_ENVIRONMENT_NAMES/);
  assert.match(source, /redactBridgeError\(stderr, env\)/);
});
