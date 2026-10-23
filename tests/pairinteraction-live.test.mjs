import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { sha256 } from "../src/lib/bounded-science-mcp.mjs";
import { definition } from "../.agents/skills/pairinteraction-rydberg/mcp/contracts.mjs";

const enabled = process.env.OPENQUANTUM_REAL_PAIRINTERACTION === "1";
const root = process.cwd();
const skill = ".agents/skills/pairinteraction-rydberg";
const evidence = path.join(root, ".openquantum/pairinteraction-evidence");
const near = (a, b, tolerance) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b} within ${tolerance}`);

test("real PairInteraction: S-S R^-6, S-P R^-3, basis changes, replay and perturbation breakdown", { skip: !enabled, timeout: 240000 }, async t => {
  const client = new Client({ name: "pairinteraction-live-test", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [`${skill}/mcp/server.mjs`] }));
  await mkdir(evidence, { recursive: true });
  const run = async (input, label) => {
    const response = await client.callTool({ name: "calculate_rydberg_pair", arguments: input }, undefined, { timeout: 195000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
    const normalized = definition.normalize("calculate_rydberg_pair", input);
    assert.deepEqual(output.input, normalized);
    assert.equal(output.inputSha256, sha256(JSON.stringify(normalized)));
    assert.equal(output.dependencyLockSha256, sha256(await readFile(`${skill}/uv.lock`)));
    assert.equal(output.result.database.manifestSha256, sha256(await readFile(`${skill}/database-lock.json`)));
    assert.equal(output.scientificValidation, "not_evaluated");
    assert.equal(output.result.convergence.status, "not_evaluated");
    for (const point of output.result.points) {
      assert.ok(point.referenceDifferenceMHz < 2e-4);
      assert.ok(point.diagonalizationDifferenceMHz < 2e-4);
      assert.ok(point.hermiticityErrorMHz < 1e-8);
    }
    await writeFile(path.join(evidence, `${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
    return output.result;
  };
  const ss = await run({}, "ss");
  const sp = await run({ channel: "sp_exchange", nP: 60 }, "sp-exchange");
  near(ss.points[0].secondOrderShiftsMHz[0] / ss.points[2].secondOrderShiftsMHz[0], 64, 1e-9);
  near(sp.points[0].exchangeMHz / sp.points[2].exchangeMHz, 8, 1e-10);
  assert.equal(sp.points[0].perturbationStatus, "outside_screen");
  assert.ok(sp.points[0].effectiveSpectrumDeviationMHz > 0.5, "Keep visible the failure of a two-state effective model at short distance");
  assert.ok(sp.points[2].effectiveSpectrumDeviationMHz < sp.points[0].effectiveSpectrumDeviationMHz);
  assert.deepEqual(await run({}, "ss-repeat"), ss);
  const expanded = await run({ deltaN: 3, energyWindowGHz: 25 }, "ss-expanded");
  const spExpanded = await run({ channel: "sp_exchange", nP: 60, deltaN: 3, energyWindowGHz: 25 }, "sp-expanded");
  assert.ok(expanded.model.pairBasisSize > ss.model.pairBasisSize);
  assert.ok(spExpanded.model.pairBasisSize > sp.model.pairBasisSize);
  const comparison = [
    { channel: "ss", baseBasis: ss.model.pairBasisSize, expandedBasis: expanded.model.pairBasisSize, shiftChangeMHzAt8um: expanded.points[0].secondOrderShiftsMHz[0] - ss.points[0].secondOrderShiftsMHz[0] },
    { channel: "sp_exchange", baseBasis: sp.model.pairBasisSize, expandedBasis: spExpanded.model.pairBasisSize, shiftChangeMHzAt8um: spExpanded.points[0].secondOrderShiftsMHz[0] - sp.points[0].secondOrderShiftsMHz[0] },
  ];
  await writeFile(path.join(evidence, "basis-comparison.json"), JSON.stringify({ status: "observed_changes_only", scientificValidation: "not_evaluated", comparison }, null, 2));
  const narrow = await client.callTool({ name: "calculate_rydberg_pair", arguments: { deltaN: 1, energyWindowGHz: 1, distancesUm: [16] } }, undefined, { timeout: 195000 });
  assert.equal(narrow.isError, true, "A basis without virtual channels must fail rather than return a spurious zero shift");
  assert.match(JSON.stringify(narrow), /No coupled intermediate states/);
});

test("analytic reference and pinned database integrity", { skip: !enabled, timeout: 60000 }, async () => {
  const python = path.join(root, ".openquantum/python-envs/pairinteraction-rydberg", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const { stdout, stderr } = await promisify(execFile)(python, [`${skill}/test/science_test.py`], { timeout: 60000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "analytic-and-integrity-tests.log"), stdout + stderr);
});
