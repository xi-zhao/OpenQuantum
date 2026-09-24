#!/usr/bin/env node

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";

const executeFile = promisify(execFile);
const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const bridgePath = path.join(skillRoot, "mcp", "bridge.py");
const FIELDQKIT_VERSION = "0.1.2";
const BRIDGE_ENVIRONMENT_NAMES = Object.freeze([
  "HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "PATH",
  "REQUESTS_CA_BUNDLE",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "UV_CACHE_DIR",
  "WINDIR",
]);

const PROVIDERS = Object.freeze([
  { id: "simulator", displayName: "本地模拟器", credentialRef: null },
  { id: "quafu", displayName: "夸父量子云", credentialRef: "QUAFU_API_TOKEN" },
  { id: "tianyan", displayName: "天衍量子云", credentialRef: "TIANYAN_API_TOKEN" },
  { id: "guodun", displayName: "国盾量子云", credentialRef: "GUODUN_API_TOKEN" },
  { id: "tencent", displayName: "腾讯量子云", credentialRef: "TENCENT_API_TOKEN" },
  { id: "origin", displayName: "本源量子云", credentialRef: "ORIGIN_API_TOKEN" },
  { id: "fieldquantum", displayName: "FieldQuantum", credentialRef: "FIELDQUANTUM_API_TOKEN" },
  { id: "logicalqubit", displayName: "逻辑比特量子云", credentialRef: "LOGICALQUBIT_API_TOKEN" },
]);
const PROVIDER_IDS = new Set(PROVIDERS.map((provider) => provider.id));

const localExecutionAnnotations = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});
const inspectAnnotations = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const TOOLS = Object.freeze([
  {
    name: "inspect_fieldqkit_setup",
    title: "Inspect FieldQKit provider setup",
    description:
      "List FieldQKit providers and report only whether each Harness credential reference is configured. Credential values are never returned.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        fieldqkitVersion: { type: "string" },
        providers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              displayName: { type: "string" },
              credentialRef: { type: ["string", "null"] },
              configured: { type: "boolean" },
            },
            required: ["id", "displayName", "credentialRef", "configured"],
            additionalProperties: false,
          },
        },
      },
      required: ["fieldqkitVersion", "providers"],
      additionalProperties: false,
    },
    annotations: inspectAnnotations,
  },
  {
    name: "discover_fieldqkit_backends",
    title: "Discover FieldQKit quantum backends",
    description:
      "Use pinned fieldqkit to query backends that satisfy a minimum qubit count. It never mutates cloud state, but requires explicit dependency setup and may contact the selected provider.",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", enum: [...PROVIDER_IDS] },
        numQubits: { type: "integer", minimum: 1, maximum: 4096 },
        preferredHardware: {
          type: "array",
          maxItems: 16,
          items: { type: "string", minLength: 1, maxLength: 128 },
        },
      },
      required: ["provider", "numQubits"],
      additionalProperties: false,
    },
    annotations: localExecutionAnnotations,
  },
]);

function textResult(text, structuredContent) {
  return { content: [{ type: "text", text }], structuredContent };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `FieldQKit tool error: ${message}` }],
    isError: true,
  };
}

function setupView() {
  return {
    fieldqkitVersion: FIELDQKIT_VERSION,
    providers: PROVIDERS.map((provider) => ({
      ...provider,
      configured:
        provider.credentialRef === null ||
        Boolean(process.env[provider.credentialRef]?.trim()),
    })),
  };
}

function bridgeEnvironment(provider) {
  const env = Object.fromEntries(
    BRIDGE_ENVIRONMENT_NAMES.flatMap((name) =>
      process.env[name] ? [[name, process.env[name]]] : [],
    ),
  );
  if (provider.credentialRef) {
    env[provider.credentialRef] = process.env[provider.credentialRef];
  }
  return env;
}

function redactBridgeError(value, env) {
  let redacted = String(value);
  for (const secret of Object.values(env)) {
    if (typeof secret === "string" && secret.length >= 4) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }
  }
  return redacted;
}

function discoveryRequest(argumentsValue) {
  const value = argumentsValue ?? {};
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    !PROVIDER_IDS.has(value.provider) ||
    !Number.isInteger(value.numQubits) ||
    value.numQubits < 1 ||
    value.numQubits > 4096
  ) {
    throw new TypeError("provider 或 numQubits 无效");
  }
  const preferredHardware = value.preferredHardware ?? [];
  if (
    !Array.isArray(preferredHardware) ||
    preferredHardware.length > 16 ||
    preferredHardware.some(
      (item) =>
        typeof item !== "string" || item.length === 0 || item.length > 128,
    )
  ) {
    throw new TypeError("preferredHardware 无效");
  }
  return {
    provider: value.provider,
    numQubits: value.numQubits,
    preferredHardware,
  };
}

async function discover(argumentsValue) {
  const request = discoveryRequest(argumentsValue);
  const provider = PROVIDERS.find((candidate) => candidate.id === request.provider);
  if (
    provider?.credentialRef &&
    !process.env[provider.credentialRef]?.trim()
  ) {
    throw new Error(
      `${provider.displayName} 尚未配置 ${provider.credentialRef}；请在 OpenQuantum 设置中心保存凭据`,
    );
  }
  const launch = await preparedPythonLaunch({ skillRoot, args: [bridgePath] });
  let stdout;
  const env = bridgeEnvironment(provider);
  try {
    ({ stdout } = await executeFile(
      launch.command,
      [
        ...launch.args,
        request.provider,
        String(request.numQubits),
        JSON.stringify(request.preferredHardware),
      ],
      {
        timeout: 150_000,
        maxBuffer: 2 * 1024 * 1024,
        env,
      },
    ));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      throw new Error("Prepared Python missing; run node scripts/setup-paper-tools.mjs fieldqkit-hardware");
    }
    const stderr =
      error && typeof error === "object" && typeof error.stderr === "string"
        ? error.stderr.trim().slice(0, 2000)
        : "";
    throw new Error(
      stderr
        ? redactBridgeError(stderr, env)
        : "FieldQKit 后端发现失败",
    );
  }
  const result = JSON.parse(stdout);
  return textResult(
    `FieldQKit found ${result.backends.length} ${request.provider} backend(s) for ${request.numQubits} qubits. No quantum job was submitted.`,
    result,
  );
}

const server = new Server(
  { name: "openquantum-fieldqkit", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Non-destructive FieldQKit integration. Inspect setup before discovering a cloud backend. Discovery requires explicit dependency setup and may query a selected provider, but never submits or validates a quantum job.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "inspect_fieldqkit_setup": {
        const view = setupView();
        return textResult(
          `${view.providers.filter((provider) => provider.configured).length} of ${view.providers.length} FieldQKit providers are ready or credentialed. Credential values were not returned.`,
          view,
        );
      }
      case "discover_fieldqkit_backends":
        return await discover(request.params.arguments);
      default:
        return errorResult(new Error(`Unknown tool: ${request.params.name}`));
    }
  } catch (error) {
    return errorResult(error);
  }
});

await server.connect(new StdioServerTransport());
