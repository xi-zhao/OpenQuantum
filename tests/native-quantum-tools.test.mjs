import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  apply,
  name,
  toolDefinitions,
} from "../runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs";
import {
  readDeclaredNativeToolContracts,
} from "../scripts/lib/capability-tool-contract.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const groundStateFixture = JSON.parse(
  fs.readFileSync(
    path.join(
      projectRoot,
      ".agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json",
    ),
    "utf8",
  ),
);

const qgsContract = readDeclaredNativeToolContracts({
  projectRoot,
  capabilityId: "quantum-ground-state",
});
const qmclawContract = readDeclaredNativeToolContracts({
  projectRoot,
  capabilityId: "qmclaw-workbench",
});
const definitions = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

function observation(output, id) {
  const found = output.observations.find((item) => item.id === id);
  assert.ok(found, `missing observation ${id}`);
  return found;
}

test("native provider registers the minimal policy-owned Tool surface", () => {
  const registered = [];
  apply({ tools: { register: (definition) => registered.push(definition) } });

  assert.equal(name, "openquantum-native-quantum-tools");
  assert.deepEqual(
    registered.map((tool) => tool.name),
    [...qgsContract, ...qmclawContract].map((tool) => tool.name),
  );
  assert.deepEqual([...definitions.keys()], [
    "solve_and_validate_ground_state",
    "list_qmclaw_experiments",
    "simulate_qmclaw_experiment",
  ]);
  assert.equal(definitions.has("solve_ground_state"), false);
  assert.equal(definitions.has("validate_ground_state"), false);
  assert.equal(definitions.has("inspect_qmclaw_runtime"), false);

  for (const tool of registered) {
    assert.equal(tool.parameters.type, "object");
    assert.equal(tool.parameters.additionalProperties, false);
    assert.equal(typeof tool.output.schema, "object");
  }
});

test("ground-state Tool atomically computes facts and Validator observations", async () => {
  const tool = definitions.get("solve_and_validate_ground_state");
  const value = await tool.execute({ request: groundStateFixture });
  const content = tool.output.render({ request: groundStateFixture }, value);

  assert.deepEqual(Object.keys(value), ["facts", "validation"]);
  assert.deepEqual(Object.keys(value.facts), [
    "problemSpec",
    "hamiltonianManifest",
    "exactReference",
    "groundStateResult",
    "convergenceTrace",
    "resourceEstimate",
  ]);
  assert.equal(value.validation.scopeMatch.status, "in_scope");
  assert.equal(value.validation.observations.length, 16);
  assert.ok(
    value.validation.observations
      .filter((item) => item.id !== "provenance.complete")
      .every((item) => item.status === "pass"),
  );
  assert.equal(
    observation(value.validation, "provenance.complete").status,
    "not_checked",
  );
  assert.equal("status" in value.validation, false);
  assert.equal("acceptance" in value.validation, false);
  assert.match(content[0].text, /15 pass, 0 fail, 1 not checked/);
  assert.match(content[0].text, /No overall Acceptance decision/);

  await assert.rejects(
    tool.execute({ request: groundStateFixture, outputPath: "/tmp/result.json" }),
    /arguments must contain exactly: request/,
  );
});

test("QMClaw native Tools expose catalog plus bounded local simulation", async () => {
  const listTool = definitions.get("list_qmclaw_experiments");
  const simulationTool = definitions.get("simulate_qmclaw_experiment");
  const catalog = await listTool.execute({});

  assert.equal(catalog.experiments.length, 13);
  assert.equal(catalog.hardwareExecutionEnabled, false);
  assert.deepEqual(
    catalog.experiments.map((experiment) => experiment.id),
    [
      "s21",
      "rabi",
      "ramsey",
      "t1",
      "spectroscopy",
      "spectroscopy-2d",
      "s21-vs-flux",
      "single-shot",
      "drag",
      "pi-pulse-optimization",
      "power-shift",
      "delta",
      "randomized-benchmarking",
    ],
  );

  for (const experiment of catalog.experiments) {
    const argumentsValue = {
      experiment: experiment.id,
      qubits: ["Q0"],
      seed: 17,
      points: 16,
      shots: 16,
      ...(["spectroscopy-2d", "s21-vs-flux", "power-shift"].includes(
        experiment.id,
      )
        ? { secondaryPoints: 8 }
        : {}),
    };
    const value = await simulationTool.execute(argumentsValue);
    assert.equal(value.sourceKind, "simulation");
    assert.equal(value.scientificValidation, "not_evaluated");
    assert.equal(value.execution.networkAccessed, false);
    assert.equal(value.execution.hardwareAccessed, false);
    assert.equal(value.execution.parameterMutation, false);
    assert.equal(value.experiment, experiment.id);
  }

  const deterministicArguments = {
    experiment: "rabi",
    qubits: ["Q0"],
    seed: 31,
    points: 16,
    shots: 16,
  };
  assert.deepEqual(
    await simulationTool.execute(deterministicArguments),
    await simulationTool.execute(deterministicArguments),
  );
  await assert.rejects(
    simulationTool.execute({
      ...deterministicArguments,
      outputPath: "/tmp/qmclaw.json",
    }),
    /unsupported properties: outputPath/,
  );
});

test("native provider has no process, network, credential or file-system escape hatch", () => {
  const sources = [
    "runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs",
    ...fs
      .readdirSync(
        path.join(projectRoot, ".agents/skills/qmclaw-workbench/core"),
      )
      .filter((file) => file.endsWith(".mjs"))
      .map((file) => `.agents/skills/qmclaw-workbench/core/${file}`),
  ]
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");

  assert.doesNotMatch(
    sources,
    /node:child_process|node:net|node:http|node:https|node:tls|node:dgram|node:fs\/promises/,
  );
  assert.doesNotMatch(sources, /process\.env/);
  assert.doesNotMatch(sources, /\b(?:fetch|WebSocket)\s*\(/);
  assert.doesNotMatch(sources, /\b(?:exec|execFile|spawn|fork|eval|Function)\s*\(/);
});
