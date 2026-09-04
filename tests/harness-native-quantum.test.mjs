import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

import { readDeclaredNativeToolContracts } from "../scripts/lib/capability-tool-contract.mjs";
import { prepareOpenQuantumHarnessHome } from "../scripts/lib/prepare-harness-home.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const harnessBin = path.join(
  projectRoot,
  "node_modules",
  "@deepseek-ai",
  "dsh",
  "lib",
  "bin.js",
);
const SOLVE_AND_VALIDATE_TOOL = "solve_and_validate_ground_state";
const INCLUDE_QISKIT_MCP = process.env.OPENQUANTUM_TEST_QISKIT_MCP === "1";
const INCLUDE_IBM_RUNTIME_MCP =
  process.env.OPENQUANTUM_TEST_IBM_RUNTIME_MCP === "1";
const QISKIT_CIRCUIT_TOOL = "mcp__qiskit__transpile_circuit_tool";
const QISKIT_DOCS_TOOL = "mcp__qiskit_docs__search_docs_tool";
const QMCLAW_SIMULATE_TOOL = "simulate_qmclaw_experiment";
const PLATFORM_SHELL_PROVIDER =
  process.platform === "win32"
    ? "@deepseek-ai/dsh-tool-pwsh"
    : "@deepseek-ai/dsh-tool-bash";
const SHELL_TOOL_CONTRACTS = readDeclaredNativeToolContracts({
  projectRoot,
  capabilityId: "platform-diagnostics",
});
const EXPECTED_QUANTUM_SKILLS = Object.freeze([
  "platform-diagnostics",
  "quantum-ground-state",
  "qiskit-circuit-workbench",
  "qmclaw-workbench",
  "quantum-sdk-advisor",
]);

async function enableTemporaryMcp(presetRoot, serverName) {
  const filename = path.join(presetRoot, "agent.cordis.yml");
  const document = parseDocument(await readFile(filename, "utf8"), {
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) throw document.errors[0];
  const entries = document.contents?.items;
  assert(Array.isArray(entries));
  const index = entries.findIndex(
    (_, candidate) =>
      document.getIn([candidate, "config", "serverName"]) === serverName,
  );
  assert.notEqual(index, -1, `missing MCP server ${serverName}`);
  document.deleteIn([index, "disabled"]);
  await writeFile(filename, document.toString(), "utf8");
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
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

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

async function waitForValue(probe, { timeoutMs, description, diagnostics }) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value !== undefined) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }

  const cause = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`${description} timed out.${cause}\n${diagnostics()}`);
}

test(
  "Harness preset shares quantum Skills and registered Tools across two Sessions",
  { timeout: INCLUDE_IBM_RUNTIME_MCP ? 180_000 : 45_000 },
  async (t) => {
    const sandboxRoot = await mkdtemp(
      path.join(tmpdir(), "openquantum-harness-native-"),
    );
    const harnessHome = path.join(sandboxRoot, "dsh");
    const { presetTarget } = await prepareOpenQuantumHarnessHome({
      harnessHome,
      projectRoot,
    });
    if (INCLUDE_IBM_RUNTIME_MCP) {
      await symlink(
        path.join(projectRoot, "node_modules"),
        path.join(sandboxRoot, "node_modules"),
        "dir",
      );
      await enableTemporaryMcp(presetTarget, "qiskit_ibm_runtime");
      await writeFile(
        path.join(harnessHome, ".credentials.yaml"),
        'QISKIT_IBM_TOKEN: "openquantum-registration-probe"\n',
        { mode: 0o600 },
      );
    }

    const port = await reservePort();
    const baseUrl = `http://127.0.0.1:${port}`;
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
          DSH_TELEMETRY_DISABLED: "1",
          DSH_TELEMETRY_MODE: "DISABLED",
          OPENQUANTUM_DISABLE_QISKIT_MCP: INCLUDE_QISKIT_MCP ? "0" : "1",
          OPENQUANTUM_PUBLIC_API_KEY: "local-readiness-placeholder",
          OPENQUANTUM_PUBLIC_BASE_URL: "http://127.0.0.1:1/v1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const capture = (chunk) => {
      logs = `${logs}${chunk.toString("utf8")}`.slice(-30_000);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);

    t.after(async () => {
      await stopChild(child);
      await rm(sandboxRoot, { recursive: true, force: true });
    });

    async function rpc(method, payload = {}) {
      const rpcId = `test-${method}-${crypto.randomUUID()}`;
      const response = await fetch(`${baseUrl}/api/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "client-request",
          rpcId,
          method,
          payload,
        }),
        signal: AbortSignal.timeout(INCLUDE_IBM_RUNTIME_MCP ? 90_000 : 5_000),
      });
      assert.equal(response.status, 200);
      const envelope = await response.json();
      assert.equal(envelope.rpcId, rpcId);
      return envelope.result;
    }

    async function runtimeReadiness() {
      const response = await fetch(
        `${baseUrl}/openquantum/api/runtime-readiness`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: baseUrl,
          },
          body: JSON.stringify({ action: "snapshot" }),
          signal: AbortSignal.timeout(5_000),
        },
      );
      assert.equal(response.status, 200, diagnostics());
      return response.json();
    }

    const diagnostics = () => `Harness output:\n${logs}`;
    await waitForValue(
      async () => {
        const result = await rpc("host.describe");
        return result.ok === true ? result.value : undefined;
      },
      {
        timeoutMs: 30_000,
        description: "Harness startup",
        diagnostics,
      },
    );

    const modelCatalog = await rpc("llm.models");
    assert.equal(modelCatalog.ok, true, diagnostics());
    const publicModels = modelCatalog.value.groups.find(
      (group) => group.id === "openquantum-public",
    );
    assert(publicModels, `${diagnostics()}\nmissing OpenQuantum public model route`);
    assert.deepEqual(
      publicModels.models.map((model) => model.id),
      ["kimi-k2.7-code", "glm5.2"],
    );

    const presetRoster = await rpc("agentPreset.list");
    assert.equal(presetRoster.ok, true, diagnostics());
    const openQuantumPreset = presetRoster.value.presets.find(
      (preset) => preset.id === "openquantum",
    );
    assert(openQuantumPreset, `${diagnostics()}\nmissing OpenQuantum preset`);
    assert.equal(openQuantumPreset.isDefault, true);
    assert.equal(openQuantumPreset.name, "OpenQuantum（默认）");
    assert.match(openQuantumPreset.description, /量子科研模式/);
    assert.match(openQuantumPreset.description, /通用编码/);
    assert.match(openQuantumPreset.description, /PTC/);
    assert.match(openQuantumPreset.description, /极简编码/);
    assert.match(openQuantumPreset.description, /preset 创作/);

    const sessionIds = [];
    for (let index = 0; index < 2; index += 1) {
      const sessionId = `session-openquantum-ci-${crypto.randomUUID()}`;
      sessionIds.push(sessionId);
      const createPayload = {
        sessionId,
        cwd: projectRoot,
        ...(index === 0 ? {} : { agentPreset: "openquantum" }),
      };
      const created = await rpc("session.create", createPayload);
      assert.equal(
        created.ok,
        true,
        `${diagnostics()}\nsession.create: ${JSON.stringify(created)}`,
      );
      assert.equal(created.value.sessionId, sessionId);

      const skillList = await rpc("skill.list", { sessionId });
      assert.equal(skillList.ok, true, diagnostics());
      for (const skillName of EXPECTED_QUANTUM_SKILLS) {
        const quantumSkill = skillList.value.skills.find(
          (skill) => skill.name === skillName,
        );
        assert(quantumSkill, `${diagnostics()}\nmissing Skill: ${skillName}`);
        assert.equal(quantumSkill.modelInvocable, true);
      }

      if (index === 0) {
        const readiness = await runtimeReadiness();
        assert.equal(readiness.mode, "passive");
        assert.equal(readiness.status, "observed", diagnostics());
        assert.equal(readiness.preset.id, "openquantum");
        assert.equal(readiness.preset.state, "observed");
        const modelCheck = readiness.checks.find(
          (check) => check.id === "model-routes",
        );
        assert(
          modelCheck.items.some((item) => item.id === "openquantum-public"),
          diagnostics(),
        );
        const skillCheck = readiness.checks.find(
          (check) => check.id === "skill-registry",
        );
        for (const skillName of EXPECTED_QUANTUM_SKILLS) {
          assert(
            skillCheck.items.some((item) => item.id === skillName),
            `${diagnostics()}\nmissing readiness Skill: ${skillName}`,
          );
        }
        const toolCheck = readiness.checks.find(
          (check) => check.id === "tool-registry",
        );
        assert(
          toolCheck.items.some(
            (item) => item.id === SOLVE_AND_VALIDATE_TOOL,
          ),
          diagnostics(),
        );
        assert(
          toolCheck.items.some((item) => item.id === QMCLAW_SIMULATE_TOOL),
          diagnostics(),
        );
        assert.deepEqual(readiness.limitations, [
          "MODEL_ENDPOINT_REACHABILITY_NOT_CHECKED",
          "MCP_CONNECTION_STATE_NOT_CHECKED",
          "DOWNSTREAM_SERVICE_REACHABILITY_NOT_CHECKED",
        ]);
        assert.equal(
          JSON.stringify(readiness).includes("local-readiness-placeholder"),
          false,
        );
      }

      const prompted = await rpc("session.prompt", {
        sessionId,
        mode: "queue",
        content: [
          {
            type: "text",
            text: "Readiness probe only. Do not perform external work.",
          },
        ],
        clientTimeZone: "UTC",
      });
      assert.equal(prompted.ok, true, diagnostics());
      assert.equal(prompted.value.accepted, true);

      const header = await waitForValue(
        async () => {
          const history = await rpc("session.history", {
            sessionId,
            maxMessages: 200,
          });
          assert.equal(history.ok, true, diagnostics());
          return history.value.events
            .map((entry) => entry.event)
            .find((event) => event.type === "request/header");
        },
        {
          timeoutMs: 10_000,
          description: `Harness request/header projection for session ${index + 1}`,
          diagnostics,
        },
      );

      const toolNames = header.data.header.tools.map((tool) => tool.name);
      const platformShell = SHELL_TOOL_CONTRACTS.find(
        (contract) => contract.providerPlugin === PLATFORM_SHELL_PROVIDER,
      );
      assert(platformShell, "policy must declare the platform shell Provider");
      assert.equal(platformShell.activation, "conditional");
      assert.equal(platformShell.effect, "external-write");
      assert.equal(platformShell.effectEvidence, "conservative-provider");
      assert(toolNames.includes(platformShell.name), diagnostics());
      for (const contract of SHELL_TOOL_CONTRACTS) {
        if (contract === platformShell) continue;
        assert.equal(toolNames.includes(contract.name), false, diagnostics());
      }
      assert(toolNames.includes(SOLVE_AND_VALIDATE_TOOL), diagnostics());
      assert.equal(toolNames.includes("solve_ground_state"), false, diagnostics());
      assert.equal(toolNames.includes("validate_ground_state"), false, diagnostics());
      assert(toolNames.includes(QMCLAW_SIMULATE_TOOL), diagnostics());
      assert.equal(
        toolNames.includes("inspect_qmclaw_runtime"),
        false,
        diagnostics(),
      );
      const atomicTool = header.data.header.tools.find(
        (tool) => tool.name === SOLVE_AND_VALIDATE_TOOL,
      );
      assert.match(
        atomicTool.description,
        /Preferred atomic tool for ordinary requests/,
      );
      assert.deepEqual(atomicTool.parameters.required, ["request"]);
      assert.equal(atomicTool.parameters.additionalProperties, false);
      if (INCLUDE_QISKIT_MCP) {
        assert(toolNames.includes(QISKIT_CIRCUIT_TOOL), diagnostics());
        assert(toolNames.includes(QISKIT_DOCS_TOOL), diagnostics());
      } else {
        assert.equal(toolNames.includes(QISKIT_CIRCUIT_TOOL), false, diagnostics());
        assert.equal(toolNames.includes(QISKIT_DOCS_TOOL), false, diagnostics());
      }
      if (INCLUDE_IBM_RUNTIME_MCP) {
        assert(
          toolNames.some((name) => name.startsWith("mcp__qiskit_ibm_runtime__")),
          diagnostics(),
        );
      }
    }

    for (const sessionId of sessionIds) {
      await rpc("session.cancel", { sessionId }).catch(() => undefined);
    }
  },
);
