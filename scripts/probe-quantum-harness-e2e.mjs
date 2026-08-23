import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadAcceptanceReport,
  loadCapability,
  loadResultPackage,
  validateResultCommitValue,
} from "../.agents/skill-contracts/index.mjs";
import {
  parseScientificToolResult,
  SOLVE_AND_VALIDATE_TOOL,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const envFile = path.join(projectRoot, ".env");
const harnessBin = path.join(
  projectRoot,
  "node_modules/@deepseek-ai/dsh/lib/bin.js",
);
const skillRoot = path.join(
  projectRoot,
  ".agents/skills/quantum-ground-state",
);
const fixtureFile = path.join(
  skillRoot,
  "evals/fixtures/requests/protocol-fixture.json",
);
const COMPLETION_MARKER = "OPENQUANTUM_QGS_E2E_OK";
const EXPECTED_QUANTUM_SKILLS = Object.freeze([
  "quantum-ground-state",
  "qiskit-circuit-workbench",
  "quantum-sdk-advisor",
]);

const PROVIDERS = Object.freeze({
  "openquantum-public": Object.freeze({
    model: "kimi-k2.7-code",
    apiKeyEnv: "OPENQUANTUM_PUBLIC_API_KEY",
    baseUrlEnv: "OPENQUANTUM_PUBLIC_BASE_URL",
  }),
  "openquantum-private": Object.freeze({
    model: "kimi2.7",
    apiKeyEnv: "OPENQUANTUM_PRIVATE_API_KEY",
    baseUrlEnv: "OPENQUANTUM_PRIVATE_BASE_URL",
  }),
});

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reservePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const { port } = address;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const forceTimer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }, 5_000);
  try {
    await once(child, "exit");
  } finally {
    clearTimeout(forceTimer);
  }
}

function textFromContent(value) {
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((block) => {
      if (block?.type === "text" && typeof block.text === "string") {
        return [block.text];
      }
      if (block?.type === "tool-result") {
        return [textFromContent(block.content)];
      }
      return [];
    })
    .filter(Boolean)
    .join("\n");
}

function toolResultText(event, callId) {
  if (event.type !== "tool/result") return undefined;
  const message = event.data?.message;
  if (message?.source?.kind !== "tool" || message.source.callId !== callId) {
    return undefined;
  }
  return textFromContent(message.content);
}

function assistantText(event) {
  return event.type === "assistant/message"
    ? textFromContent(event.data?.message?.content)
    : "";
}

function assertContained(root, relativePath) {
  const resolvedRoot = fs.realpathSync(root);
  const resolvedFile = fs.realpathSync(path.resolve(root, relativePath));
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Result Commit path escapes the probe workspace: ${relativePath}`);
  }
  return resolvedFile;
}

async function waitForOutcome(probe, { timeoutMs, diagnostics }) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value !== undefined) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  const cause = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`Quantum Harness E2E timed out.${cause}\n${diagnostics()}`);
}

function redact(text, secretValues) {
  return secretValues.reduce(
    (current, secret) =>
      typeof secret === "string" && secret.length >= 8
        ? current.split(secret).join("[REDACTED]")
        : current,
    text,
  );
}

export async function runQuantumHarnessE2E({
  provider = "openquantum-public",
  model,
  timeoutMs = 180_000,
} = {}) {
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const selectedModel = model ?? providerConfig.model;
  const apiKey = process.env[providerConfig.apiKeyEnv];
  const baseUrl = process.env[providerConfig.baseUrlEnv];
  if (!apiKey || !baseUrl) {
    throw new Error(
      `${providerConfig.apiKeyEnv} and ${providerConfig.baseUrlEnv} must be configured`,
    );
  }

  const sandboxRoot = await mkdtemp(
    path.join(os.tmpdir(), "openquantum-real-provider-e2e-"),
  );
  const harnessHome = path.join(sandboxRoot, "dsh");
  const workspaceRoot = path.join(sandboxRoot, "workspace");
  await mkdir(workspaceRoot, { recursive: true });
  await prepareOpenQuantumHarnessHome({ harnessHome, projectRoot });

  const port = await reservePort();
  const baseUrlLocal = `http://127.0.0.1:${port}`;
  let logs = "";
  const child = spawn(
    process.execPath,
    [
      harnessBin,
      "web",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        DSH_HOME: harnessHome,
        OPENQUANTUM_DISABLE_QISKIT_MCP: "1",
        DSH_TELEMETRY_DISABLED: "1",
        DSH_TELEMETRY_MODE: "DISABLED",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const capture = (chunk) => {
    logs = `${logs}${chunk.toString("utf8")}`.slice(-40_000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const diagnostics = () =>
    redact(`Harness output:\n${logs}`, [apiKey, process.env.OPENQUANTUM_PRIVATE_API_KEY]);

  let sessionId;
  const startedAt = Date.now();
  try {
    async function rpc(method, payload = {}) {
      const rpcId = `e2e-${method}-${crypto.randomUUID()}`;
      const response = await fetch(`${baseUrlLocal}/api/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "client-request",
          rpcId,
          method,
          payload,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status !== 200) {
        throw new Error(`${method} returned HTTP ${response.status}`);
      }
      const envelope = await response.json();
      if (envelope.rpcId !== rpcId) {
        throw new Error(`${method} returned a mismatched rpcId`);
      }
      return envelope.result;
    }

    await waitForOutcome(
      async () => {
        const result = await rpc("host.describe");
        return result.ok === true ? result.value : undefined;
      },
      { timeoutMs: 30_000, diagnostics },
    );

    sessionId = `session-openquantum-real-e2e-${crypto.randomUUID()}`;
    const created = await rpc("session.create", {
      sessionId,
      cwd: workspaceRoot,
      agentPreset: "openquantum",
    });
    if (!created.ok) {
      throw new Error(`session.create failed: ${JSON.stringify(created.error)}`);
    }
    const selected = await rpc("session.selectModel", {
      sessionId,
      provider,
      model: selectedModel,
    });
    if (!selected.ok) {
      throw new Error(`session.selectModel failed: ${JSON.stringify(selected.error)}`);
    }

    const skillList = await rpc("skill.list", { sessionId });
    if (!skillList.ok) {
      throw new Error("Harness did not return the quantum Skill registry");
    }
    for (const skillName of EXPECTED_QUANTUM_SKILLS) {
      if (
        !skillList.value.skills.some(
          (skill) => skill.name === skillName && skill.modelInvocable,
        )
      ) {
        throw new Error(`Harness did not discover model-invocable Skill ${skillName}`);
      }
    }

    const request = JSON.parse(await readFile(fixtureFile, "utf8"));
    request.requestId = `qgs-real-provider-e2e-${crypto.randomUUID()}`;
    const prompt = [
      "This is an automated OpenQuantum end-to-end acceptance probe.",
      `Call ${SOLVE_AND_VALIDATE_TOOL} exactly once with this argument:`,
      JSON.stringify({ request }),
      `After the tool succeeds, reply with exactly ${COMPLETION_MARKER}.`,
      "Do not substitute a plain-text calculation for the tool call.",
    ].join("\n");
    const prompted = await rpc("session.prompt", {
      sessionId,
      mode: "queue",
      content: [{ type: "text", text: prompt }],
      clientTimeZone: "UTC",
    });
    if (!prompted.ok || prompted.value.accepted !== true) {
      throw new Error(`session.prompt was not accepted: ${JSON.stringify(prompted)}`);
    }

    const outcome = await waitForOutcome(
      async () => {
        const history = await rpc("session.history", {
          sessionId,
          maxMessages: 200,
        });
        if (!history.ok) {
          throw new Error(`session.history failed: ${JSON.stringify(history.error)}`);
        }
        const events = history.value.events.map((entry) => entry.event);
        const calls = events.filter(
          (event) =>
            event.type === "tool/call" &&
            event.data?.name === SOLVE_AND_VALIDATE_TOOL,
        );
        if (calls.length > 1) {
          throw new Error("Model invoked the atomic quantum tool more than once");
        }
        const call = calls[0];
        const result = call
          ? events.find(
              (event) => toolResultText(event, call.data.callId) !== undefined,
            )
          : undefined;
        const turnEnd = events.findLast((event) => event.type === "turn/end");
        if (turnEnd && turnEnd.data?.reason?.kind !== "completed") {
          throw new Error(
            `Harness turn ended as ${JSON.stringify(turnEnd.data?.reason)}`,
          );
        }
        if (turnEnd && (!call || !result)) {
          throw new Error("Harness turn completed without the required quantum tool result");
        }
        if (!call || !result || !turnEnd) return undefined;
        const finalAssistant = events
          .filter((event) => event.seq > result.seq)
          .map(assistantText)
          .find(Boolean);
        if (!finalAssistant) {
          throw new Error("Harness turn completed without a final assistant response");
        }
        return { events, call, result, turnEnd, finalAssistant };
      },
      { timeoutMs, diagnostics },
    );

    const resultText = toolResultText(outcome.result, outcome.call.data.callId);
    const presentation = parseScientificToolResult(
      SOLVE_AND_VALIDATE_TOOL,
      resultText,
    );
    if (
      !presentation ||
      presentation.scientificStatus !== "acceptance_available" ||
      presentation.acceptanceStatus !== "passed"
    ) {
      throw new Error("Tool result did not carry a passed materialized Acceptance");
    }

    const capability = await loadCapability(skillRoot);
    const resultPackagePath = assertContained(
      workspaceRoot,
      presentation.resultCommit.resultPackage.path,
    );
    const resultPackage = loadResultPackage(resultPackagePath, capability);
    const acceptancePath = assertContained(
      workspaceRoot,
      presentation.resultCommit.acceptanceReport.path,
    );
    const acceptanceReport = loadAcceptanceReport(
      acceptancePath,
      capability,
      resultPackage,
    );
    const commitIssues = validateResultCommitValue(presentation.resultCommit, {
      capability,
      resultPackage,
      acceptanceReport,
      artifactRoot: workspaceRoot,
    });
    if (commitIssues.length > 0) {
      throw new Error(`Result Commit validation failed: ${commitIssues.join("; ")}`);
    }
    assert.deepEqual(resultPackage.value.executionRef, {
      sessionId,
      eventRange: { from: outcome.call.seq, to: outcome.result.seq },
    });

    return Object.freeze({
      schemaVersion: "1.0",
      status: "passed",
      provider,
      model: selectedModel,
      sessionId,
      durationMs: Date.now() - startedAt,
      evidence: Object.freeze({
        skillDiscovered: true,
        toolName: SOLVE_AND_VALIDATE_TOOL,
        toolCallSeq: outcome.call.seq,
        toolResultSeq: outcome.result.seq,
        turnEndSeq: outcome.turnEnd.seq,
        turnEndReason: outcome.turnEnd.data.reason.kind,
        finalResponseObserved: true,
        completionMarkerObserved:
          outcome.finalAssistant.includes(COMPLETION_MARKER),
        scientificStatus: presentation.scientificStatus,
        acceptanceStatus: presentation.acceptanceStatus,
        resultPackageSha256: presentation.resultCommit.resultPackage.sha256,
        acceptanceReportSha256:
          presentation.resultCommit.acceptanceReport.sha256,
        artifactCount: presentation.resultCommit.artifacts.length,
        resultCommitValidated: true,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    throw new Error(`${message}\n${diagnostics()}`, { cause: error });
  } finally {
    if (sessionId) {
      try {
        const rpcId = `cleanup-${crypto.randomUUID()}`;
        await fetch(`${baseUrlLocal}/api/session.cancel`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "client-request",
            rpcId,
            method: "session.cancel",
            payload: { sessionId },
          }),
          signal: AbortSignal.timeout(3_000),
        });
      } catch {
        // The isolated Harness process is terminated below regardless.
      }
    }
    await stopChild(child);
    await rm(sandboxRoot, { recursive: true, force: true });
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedFile === fileURLToPath(import.meta.url)) {
  try {
    const provider = argument("--provider", "openquantum-public");
    const model = argument("--model", undefined);
    const timeoutMs = positiveInteger(
      argument("--timeout-ms", "180000"),
      "--timeout-ms",
    );
    const report = await runQuantumHarnessE2E({ provider, model, timeoutMs });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
