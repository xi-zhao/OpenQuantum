import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  inspectQmclawRuntime,
  SIMULATE_INPUT_SCHEMA,
} from "../core/experiments.mjs";
import {
  name as providerName,
  toolDefinitions,
} from "../../../../runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const providerPath = path.join(
  projectRoot,
  "runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs",
);
const coreDirectory = path.join(skillRoot, "core");
const upstreamRevision = "18d7fa1594949a1203fca4866e651641bbde021f";
const secretFixture = "qmclaw-secret-that-must-not-be-observed";

const experimentIds = [
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
];

const upstreamTools = {
  s21: "s21",
  rabi: "rabi",
  ramsey: "ramsey",
  t1: "t1",
  spectroscopy: "spectrum",
  "spectroscopy-2d": "spectrum_2d",
  "s21-vs-flux": "s21vsflux",
  "single-shot": "singleshot",
  drag: "drag",
  "pi-pulse-optimization": "opt_pipulse",
  "power-shift": "powershift",
  delta: "delta",
  "randomized-benchmarking": "rb",
};

const qmclawToolNames = new Set([
  "list_qmclaw_experiments",
  "simulate_qmclaw_experiment",
]);
const tools = toolDefinitions.filter((tool) => qmclawToolNames.has(tool.name));
const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
const client = {
  async callTool(request) {
    try {
      const value =
        request.name === "inspect_qmclaw_runtime"
          ? inspectQmclawRuntime()
          : await toolsByName.get(request.name)?.execute(request.arguments ?? {});
      if (value === undefined) throw new Error(`Unknown tool: ${request.name}`);
      const definition = toolsByName.get(request.name);
      return {
        content: definition
          ? definition.output.render(request.arguments ?? {}, value)
          : [{ type: "text", text: "Inspected QMClaw runtime." }],
        structuredContent: value,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `QMClaw local tool error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

function standardResult(result) {
  assert.ok("content" in result, "expected a rendered Tool result");
  return result;
}

async function simulate(experiment, overrides = {}) {
  return standardResult(
    await client.callTool({
      name: "simulate_qmclaw_experiment",
      arguments: {
        experiment,
        qubits: ["Q0"],
        seed: 17,
        points: 16,
        shots: 16,
        ...(["spectroscopy-2d", "s21-vs-flux", "power-shift"].includes(experiment)
          ? { secondaryPoints: 8 }
          : {}),
        ...overrides,
      },
    }),
  );
}

async function expectToolError(argumentsValue, pattern) {
  const result = standardResult(
    await client.callTool({
      name: "simulate_qmclaw_experiment",
      arguments: argumentsValue,
    }),
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, pattern);
  assert.equal(result.structuredContent, undefined);
}

test("native Provider exposes exactly two closed-world read-only Tools", () => {
  assert.equal(providerName, "openquantum-native-quantum-tools");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "list_qmclaw_experiments",
      "simulate_qmclaw_experiment",
    ],
  );
  for (const tool of tools) {
    assert.equal(tool.parameters.type, "object");
    assert.equal(tool.parameters.additionalProperties, false);
    assert.equal(tool.output.schema.type, "object");
    assert.equal(tool.output.schema.additionalProperties, false);
  }
  assert.equal(SIMULATE_INPUT_SCHEMA.properties.qubits.minItems, 1);
  assert.equal(SIMULATE_INPUT_SCHEMA.properties.qubits.maxItems, 1);
  assert.equal(tools.some((tool) => /update|submit|execute|hardware/.test(tool.name)), false);
});

test("runtime inspection fixes provenance and proves that external execution is disabled", async () => {
  const inspected = standardResult(
    await client.callTool({ name: "inspect_qmclaw_runtime", arguments: {} }),
  );
  assert.equal(inspected.isError, undefined);
  assert.deepEqual(inspected.structuredContent.upstream, {
    repository: "https://github.com/QMC-AI/QMClaw",
    revision: upstreamRevision,
    license: "MIT",
  });
  assert.equal(
    inspected.structuredContent.providerId,
    "openquantum-native-quantum-tools",
  );
  assert.equal(inspected.structuredContent.hardwareExecutionEnabled, false);
  assert.equal(inspected.structuredContent.networkAccessRequired, false);
  assert.deepEqual(inspected.structuredContent.credentialRefs, []);
  assert.equal(inspected.structuredContent.experimentCount, 13);
  assert.deepEqual(inspected.structuredContent.experimentIds, experimentIds);
  assert.deepEqual(inspected.structuredContent.limits, {
    qubitsPerRun: 1,
    pointsMinimum: 16,
    pointsMaximum: 256,
    secondaryPointsMinimum: 8,
    secondaryPointsMaximum: 64,
    shotsMinimum: 16,
    shotsMaximum: 4096,
    seedMinimum: 0,
    seedMaximum: 2147483647,
  });
  assert.doesNotMatch(JSON.stringify(inspected), new RegExp(secretFixture));
});

test("experiment catalog maps all 13 normalized ids to reviewed upstream tools and SI units", async () => {
  const listed = standardResult(
    await client.callTool({ name: "list_qmclaw_experiments", arguments: {} }),
  );
  assert.equal(listed.isError, undefined);
  assert.equal(listed.structuredContent.hardwareExecutionEnabled, false);
  assert.deepEqual(
    listed.structuredContent.experiments.map((experiment) => experiment.id),
    experimentIds,
  );
  assert.deepEqual(
    Object.fromEntries(
      listed.structuredContent.experiments.map((experiment) => [
        experiment.id,
        experiment.upstreamTool,
      ]),
    ),
    upstreamTools,
  );
  const allowedSiUnits = new Set(["1", "Hz", "rad", "s", "V", "W", "Wb"]);
  for (const experiment of listed.structuredContent.experiments) {
    for (const parameter of experiment.inputParameters) {
      assert.ok(allowedSiUnits.has(parameter.unit), `${parameter.name} used ${parameter.unit}`);
      assert.ok(Number.isFinite(parameter.minimum));
      assert.ok(Number.isFinite(parameter.maximum));
      assert.ok(Number.isFinite(parameter.default));
      assert.ok(parameter.default >= parameter.minimum);
      assert.ok(parameter.default <= parameter.maximum);
    }
    for (const field of [...experiment.axes, ...experiment.series]) {
      assert.ok(allowedSiUnits.has(field.unit), `${field.id} used ${field.unit}`);
    }
  }
});

test("one deep simulation tool covers every reviewed QMClaw experiment", async () => {
  for (const experiment of experimentIds) {
    const result = await simulate(experiment);
    assert.equal(result.isError, undefined, result.content[0].text);
    const output = result.structuredContent;
    assert.equal(output.experiment, experiment);
    assert.equal(output.upstreamTool, upstreamTools[experiment]);
    assert.equal(output.sourceKind, "simulation");
    assert.equal(output.scientificValidation, "not_evaluated");
    assert.equal(output.unitSystem, "SI");
    assert.equal(output.upstreamRevision, upstreamRevision);
    assert.equal(output.hardwareExecutionEnabled, false);
    assert.deepEqual(output.execution, {
      mode: "local_simulation",
      qubits: ["Q0"],
      networkAccessed: false,
      hardwareAccessed: false,
      parameterMutation: false,
    });
    assert.ok(output.axes.length >= 1 && output.axes.length <= 2);
    assert.ok(output.series.length >= 1 && output.series.length <= 4);
    for (const dataSeries of output.series) {
      const expectedLength = dataSeries.shape.reduce((product, size) => product * size, 1);
      assert.equal(dataSeries.values.length, expectedLength);
      assert.ok(dataSeries.values.every(Number.isFinite));
    }
    assert.ok(Number.isFinite(output.summary.primaryValue));
    assert.match(result.content[0].text, /scientificValidation=not_evaluated/);
  }
});

test("seed and request produce deterministic replayable single-qubit output", async () => {
  const first = await simulate("ramsey", {
    qubits: ["readout_A"],
    seed: 12345,
    points: 24,
    shots: 128,
  });
  const replay = await simulate("ramsey", {
    qubits: ["readout_A"],
    seed: 12345,
    points: 24,
    shots: 128,
  });
  const changedSeed = await simulate("ramsey", {
    qubits: ["readout_A"],
    seed: 12346,
    points: 24,
    shots: 128,
  });
  assert.deepEqual(first.structuredContent, replay.structuredContent);
  assert.notDeepEqual(first.structuredContent.series, changedSeed.structuredContent.series);
  assert.deepEqual(first.structuredContent.execution.qubits, ["readout_A"]);
});

test("frequency, time, flux and power contracts remain explicit SI quantities", async () => {
  const s21 = await simulate("s21", {
    parameters: {
      centerFrequencyHz: 6e9,
      spanFrequencyHz: 1e8,
      noiseFraction: 0,
    },
  });
  assert.equal(s21.structuredContent.axes[0].unit, "Hz");
  assert.equal(s21.structuredContent.resolvedParameters.centerFrequencyHz, 6e9);
  assert.ok(s21.structuredContent.axes[0].values.every((value) => value > 1e9));

  const t1 = await simulate("t1", {
    parameters: {
      maxDurationSeconds: 1e-4,
      decayTimeSeconds: 2.5e-5,
      noiseFraction: 0,
    },
  });
  assert.equal(t1.structuredContent.axes[0].unit, "s");
  assert.equal(t1.structuredContent.axes[0].values.at(-1), 1e-4);

  const rabi = await simulate("rabi");
  assert.equal(rabi.structuredContent.axes[0].unit, "V");

  const spectrum2d = await simulate("spectroscopy-2d");
  assert.equal(spectrum2d.structuredContent.axes[0].unit, "V");
  assert.equal(spectrum2d.structuredContent.axes[1].unit, "Hz");
  assert.deepEqual(spectrum2d.structuredContent.series[0].shape, [8, 16]);

  const flux = await simulate("s21-vs-flux", { secondaryPoints: 9 });
  assert.equal(flux.structuredContent.axes[0].unit, "Wb");
  assert.equal(flux.structuredContent.secondaryPoints, 9);

  const power = await simulate("power-shift");
  assert.equal(power.structuredContent.axes[0].unit, "W");
  assert.equal(power.structuredContent.axes[1].unit, "Hz");
  assert.deepEqual(power.structuredContent.series[0].shape, [8, 16]);
  assert.equal("drivePowerDbm" in power.structuredContent.resolvedParameters, false);

  const singleShot = await simulate("single-shot", {
    parameters: { readoutSeparationVolts: 0.4, noiseFraction: 0 },
  });
  const bySeriesId = Object.fromEntries(
    singleShot.structuredContent.series.map((series) => [series.id, series.values]),
  );
  assert.ok(bySeriesId.ground_i.every((value) => value === -0.2));
  assert.ok(bySeriesId.excited_i.every((value) => value === 0.2));
  assert.ok(bySeriesId.ground_q.every((value) => value === 0));
  assert.ok(bySeriesId.excited_q.every((value) => value === 0));
  assert.equal(singleShot.structuredContent.summary.primaryValue, 0.4);

  const delta = await simulate("delta");
  assert.deepEqual(
    delta.structuredContent.series.map((series) => series.id),
    ["excitation_error_n1", "excitation_error_n5", "excitation_error_n13"],
  );
});

test("simulation fails closed for resource, identifier, unit and schema violations", async () => {
  const base = { experiment: "t1", qubits: ["Q0"] };
  await expectToolError({ ...base, points: 15 }, /points must be an integer from 16 to 256/);
  await expectToolError({ ...base, points: 257 }, /points must be an integer from 16 to 256/);
  await expectToolError({ ...base, shots: 15 }, /shots must be an integer from 16 to 4096/);
  await expectToolError({ ...base, shots: 4097 }, /shots must be an integer from 16 to 4096/);
  await expectToolError({ ...base, seed: 2147483648 }, /seed must be an integer/);
  await expectToolError({ experiment: "t1", qubits: [] }, /exactly one identifier/);
  await expectToolError(
    { experiment: "t1", qubits: ["Q0", "Q1"] },
    /exactly one identifier/,
  );
  await expectToolError({ experiment: "t1", qubits: ["Q 0"] }, /each qubit must be/);
  await expectToolError({ ...base, points: null }, /points must be an integer/);
  await expectToolError({ ...base, shots: null }, /shots must be an integer/);
  await expectToolError({ ...base, seed: null }, /seed must be an integer/);
  await expectToolError({ ...base, parameters: null }, /parameters must be an object/);
  await expectToolError(
    { ...base, parameters: { decayTimeSeconds: null } },
    /decayTimeSeconds must be a finite number/,
  );
  await expectToolError({ ...base, secondaryPoints: 16 }, /not supported for t1/);
  await expectToolError(
    { experiment: "spectroscopy-2d", qubits: ["Q0"], secondaryPoints: 65 },
    /secondaryPoints must be an integer from 8 to 64/,
  );
  await expectToolError({ ...base, outputPath: "/tmp/result.json" }, /unsupported properties/);
  await expectToolError(
    { ...base, parameters: { frequencyGHz: 5 } },
    /unsupported properties: frequencyGHz/,
  );
  await expectToolError(
    {
      experiment: "s21",
      qubits: ["Q0"],
      parameters: {
        centerFrequencyHz: 1e6,
        spanFrequencyHz: 2e6,
        noiseFraction: 0,
      },
    },
    /strictly above 0 Hz/,
  );
});

test("maximum allowed requests stay within the declared output bounds", async () => {
  const map = await simulate("power-shift", {
    points: 256,
    secondaryPoints: 64,
    shots: 4096,
    seed: 2147483647,
  });
  assert.deepEqual(map.structuredContent.series[0].shape, [64, 256]);
  assert.equal(map.structuredContent.series[0].values.length, 64 * 256);

  const shots = await simulate("single-shot", { shots: 4096, seed: 0 });
  assert.equal(shots.structuredContent.series.length, 4);
  assert.ok(
    shots.structuredContent.series.every(
      (series) => series.shape[0] === 4096 && series.values.length === 4096,
    ),
  );
});

test("implementation has no external process, environment, network or parameter-write path", async () => {
  const inspected = await client.callTool({
    name: "inspect_qmclaw_runtime",
    arguments: {},
  });
  const simulated = await simulate("single-shot", { qubits: ["Q0"], shots: 32 });
  assert.doesNotMatch(JSON.stringify({ inspected, simulated }), new RegExp(secretFixture));
  assert.equal(inspected.structuredContent.hardwareExecutionEnabled, false);
  assert.equal(simulated.structuredContent.execution.networkAccessed, false);
  assert.equal(simulated.structuredContent.execution.hardwareAccessed, false);
  assert.equal(simulated.structuredContent.execution.parameterMutation, false);

  const coreFiles = (await readdir(coreDirectory))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
  const coreSource = (
    await Promise.all(
      coreFiles.map((name) => readFile(path.join(coreDirectory, name), "utf8")),
    )
  ).join("\n");
  const providerSource = await readFile(providerPath, "utf8");
  const source = `${coreSource}\n${providerSource}`;
  assert.doesNotMatch(
    source,
    /node:child_process|node:net|node:http|node:https|node:tls|node:dgram|node:fs/,
  );
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\b(?:fetch|WebSocket)\s*\(/);
  assert.doesNotMatch(coreSource, /\bimport\s*\(/);
  assert.deepEqual(
    [...providerSource.matchAll(/moduleUrl\(\s*"([^"]+)"\s*,?\s*\)/g)]
      .map((match) => match[1])
      .sort(),
    [
      ".agents/skills/qmclaw-workbench/core/experiments.mjs",
      ".agents/skills/quantum-ground-state/core/contracts.mjs",
      ".agents/skills/quantum-ground-state/scripts/solve.mjs",
      ".agents/skills/quantum-ground-state/validators/validate-result.mjs",
    ],
  );
  assert.doesNotMatch(
    providerSource.replace(
      /import\(\s*moduleUrl\(\s*"[^"]+"\s*,?\s*\)\s*\)/g,
      "",
    ),
    /\bimport\s*\(/,
  );
  assert.doesNotMatch(source, /\b(?:exec|execFile|spawn|fork|eval|Function)\s*\(/);
  assert.doesNotMatch(source, /mcp_tools_new|labrad|lqms|update_param|query_param/i);
});
