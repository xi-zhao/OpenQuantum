import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { INTEROP_TOOLS } from "./fixtures/interop.mjs";
const enabled = process.env.OPENQUANTUM_REAL_INTEROP === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/interop-evidence");
async function withTool(t, index, action) {
  const c = INTEROP_TOOLS[index];
  const client = new Client({ name: "interop-live", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")], cwd: root }));
  const definition = (await import("../.agents/skills/" + c.id + "/mcp/" + c.contract))[c.exportName];
  await mkdir(evidence, { recursive: true });
  await action(async (input, label, expectError = false) => {
    const response = await client.callTool({ name: c.tool, arguments: input }, undefined, { timeout: 120000 });
    if (expectError) { assert.equal(response.isError, true, JSON.stringify(response)); return response; }
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
    assert.deepEqual(output.input, definition.normalize(c.tool, input));
    await writeFile(path.join(evidence, c.id + "-" + label + ".json"), JSON.stringify(output, null, 2));
    return output.result;
  });
}

test("Clifft QEC: analytic T interference, aligned raw parities, reset/repeat and fail-closed instructions", { skip: !enabled, timeout: 180000 }, async t => {
  await withTool(t, 0, async run => {
    const input = { ...INTEROP_TOOLS[0].input, shots: 8192 };
    const result = await run(input, "t-interference");
    assert.deepEqual(result.measurements, result.detectors);
    assert.deepEqual(result.measurements, result.observables);
    const ones = result.measurements.filter(s => s === "1").length / input.shots;
    assert.ok(Math.abs(ones - Math.sin(Math.PI / 8) ** 2) < 0.025);
    const repeat = await run(input, "repeat-seed");
    assert.deepEqual(repeat, result);
    const odd = await run({ stimCircuit: "X 0\nM 0\nDETECTOR rec[-1]\nOBSERVABLE_INCLUDE(0) rec[-1]", shots: 8 }, "raw-parity");
    assert.deepEqual(odd.detectors, Array(8).fill("1"));
    assert.equal(odd.decoded, false);
    const reset = await run({ stimCircuit: "R 0\nREPEAT 3 {\nX 0\nMR 0\nDETECTOR rec[-1]\n}\nOBSERVABLE_INCLUDE(0) rec[-1]", shots: 16 }, "reset-repeat");
    assert.deepEqual(reset.measurements, Array(16).fill("111"));
    assert.deepEqual(reset.detectors, reset.measurements);
    const feedback = await run({ stimCircuit: "H 0\nM 0\nCX rec[-1] 1\nM 1\nDETECTOR rec[-1] rec[-2]\nOBSERVABLE_INCLUDE(2) rec[-1]", shots: 128 }, "feedback");
    assert.ok(feedback.measurements.every(row => row === "00" || row === "11"));
    assert.ok(feedback.detectors.every(row => row === "0"));
    assert.ok(feedback.observables.every((row, i) => row === "00" + feedback.measurements[i][1]));
    const empty = await run({ stimCircuit: "H 0\nM 0", shots: 4 }, "no-detectors");
    assert.deepEqual(empty.detectors, Array(4).fill(""));
    for (const stimCircuit of ["LOSS(0.1) 0\nM 0", "H 0\nDETECTOR rec[-9]", "REPEAT 2 {\nLEAKAGE(0.1) 0\n}\nM 0", "print('x')"]) {
      await run({ stimCircuit, shots: 1 }, "invalid", true);
    }
    await run({ ...input, maxActiveWidth: 0 }, "active-width", true);
  });
});

test("qBraid: both directions, asymmetric and idle wires, all gates, empty circuit and optional reference", { skip: !enabled, timeout: 240000 }, async t => {
  await withTool(t, 1, async run => {
    const single = ["H", "X", "Y", "Z", "S", "SDG", "T", "TDG"];
    const gates = [...single.map((gate, i) => ({ gate, targets: [i % 3] })),
      ...["RX", "RY", "RZ"].map((gate, i) => ({ gate, targets: [i], angle: -0.37 * (i+1) })),
      { gate: "CX", targets: [2, 0] }, { gate: "CZ", targets: [0, 1] }, { gate: "SWAP", targets: [1, 2] }];
    for (const direction of ["qiskit-to-cirq", "cirq-to-qiskit"]) {
      for (const [label, input] of [["asymmetric-idle", INTEROP_TOOLS[1].input], ["all-gates", { numQubits: 4, gates }], ["empty", { numQubits: 3, gates: [] }]]) {
        const result = await run({ ...input, direction }, direction + "-" + label);
        assert.equal(result.independentEquivalent, true);
        assert.ok(result.maxUnitaryDeviation < 1e-8);
        assert.equal(result.numQubits, input.numQubits);
        assert.match(result.openQasm2, /OPENQASM 2.0/);
        assert.equal(result.cloudSubmitted, false);
      }
    }
    const skipped = await run({ ...INTEROP_TOOLS[1].input, referenceMode: "skip" }, "skip");
    assert.equal(skipped.independentEquivalent, null);
    assert.equal(skipped.reference.status, "not_run");
    await run({ ...INTEROP_TOOLS[1].input, direction: "qiskit-to-cloud" }, "bad-direction", true);
    await run({ gates: [{ gate: "RX", targets: [0] }] }, "missing-angle", true);
  });
});

test("QDMI: official C ABI query, exact metadata, query budget and driver tamper rejection", { skip: !enabled, timeout: 60000 }, async t => {
  await withTool(t, 2, async run => {
    const result = await run({}, "example");
    assert.equal(result.driverKind, "example");
    assert.equal(result.jobsSubmitted, 0);
    assert.equal(result.hardwareVerified, false);
    assert.ok(result.devices.length > 0);
    for (const device of result.devices) {
      assert.ok(device.name);
      assert.ok(device.sites.length > 0);
      assert.ok(device.operations.length > 0);
      assert.equal(new Set(device.sites).size, device.sites.length);
      assert.ok(device.coupling.every(edge => edge.every(q => device.sites.includes(q))));
    }
    await run({ driverPath: "/tmp/arbitrary.dylib" }, "forbidden-driver-path", true);
    await run({ maxPropertyBytes: 64 }, "property-budget", true);
    const manifest = path.join(root, ".openquantum/qdmi/driver.json");
    const original = await readFile(manifest, "utf8");
    try {
      const config = JSON.parse(original); config.driver.sha256 = "0".repeat(64);
      await writeFile(manifest, JSON.stringify(config));
      const rejected = await run({}, "tampered-driver", true);
      assert.match(JSON.stringify(rejected), /digest mismatch/);
    } finally { await writeFile(manifest, original); }
  });
});

test("QDMI setup: idempotent example build, modified source and configured-driver protection", { skip: !enabled, timeout: 120000 }, async () => {
  const manifest = path.join(root, ".openquantum/qdmi/driver.json");
  const sourceReadme = path.join(root, ".openquantum/qdmi/source/README.md");
  const originalManifest = await readFile(manifest, "utf8");
  const originalReadme = await readFile(sourceReadme, "utf8");
  const setup = () => spawnSync(process.execPath, [path.join(root, "scripts/setup-qdmi.mjs")],
    { cwd: root, encoding: "utf8", timeout: 90000 });
  assert.equal(JSON.parse(originalManifest).driverKind, "example");
  const repeat = setup();
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.equal(await readFile(manifest, "utf8"), originalManifest, "Unchanged source must preserve driver identity");
  try {
    await writeFile(manifest, JSON.stringify({ ...JSON.parse(originalManifest), driverKind: "configured" }));
    const protectedDriver = setup();
    assert.notEqual(protectedDriver.status, 0);
    assert.match(protectedDriver.stderr, /Refusing to replace a configured vendor driver/);
    await writeFile(manifest, originalManifest);
    await writeFile(sourceReadme, originalReadme + "\ncontrolled setup test change\n");
    const modifiedSource = setup();
    assert.notEqual(modifiedSource.status, 0);
    assert.match(modifiedSource.stderr, /source differs from the reviewed commit/);
  } finally {
    await writeFile(sourceReadme, originalReadme);
    await writeFile(manifest, originalManifest);
  }
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "qdmi-setup.json"), JSON.stringify({
    unchangedBuildIdentity: true, modifiedSourceRejected: true, configuredDriverPreserved: true,
  }, null, 2));
});
