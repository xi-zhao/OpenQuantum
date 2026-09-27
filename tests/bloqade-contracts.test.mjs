import assert from "node:assert/strict";
import test from "node:test";
import { definition } from "../.agents/skills/bloqade-analog/mcp/contracts.mjs";
import { BLOQADE_TOOLS } from "./fixtures/bloqade.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(BLOQADE_TOOLS, { cancellationId: "bloqade-analog" });

test("Bloqade rejects invalid geometry, waveforms, nonfinite values and unsupported execution paths", () => {
  for (const input of [
    { atomPositionsUm: [] }, { atomPositionsUm: [[0, 0], [0, 0]] }, { atomPositionsUm: [[0, 0, 0]] },
    { atomPositionsUm: [[NaN, 0]] }, { durationsUs: [0] }, { durationsUs: [-1] },
    { durationsUs: [Number.MAX_VALUE, Number.MAX_VALUE] }, { rabiRadPerUs: [-1, 1, 0] },
    { rabiRadPerUs: [1, 1] }, { detuningRadPerUs: [0, Infinity, 0] }, { phaseRad: [0] },
    { timeSteps: 0 }, { atol: 0 }, { rtol: -1 }, { cloud: true }, { backend: "braket" },
    { code: "print(1)" }, { initialState: "arbitrary" }, { blockadeRadius: 10 },
  ]) assert.throws(() => definition.normalize(definition.tool.name, input), undefined, JSON.stringify(input));
});

test("Bloqade normalizes defaults and leaves computational scale to the caller", () => {
  const value = definition.normalize(definition.tool.name, {});
  assert.equal(value.rtol, 1e-9);
  assert.equal(value.timeSteps, 20);
  const request = { atomPositionsUm: Array.from({ length: 12 }, (_, i) => [i * 6, 0]), timeSteps: 10000 };
  assert.equal(definition.normalize(definition.tool.name, request).atomPositionsUm.length, 12);
  assert.equal(definition.normalize(definition.tool.name, { rabiRadPerUs: [0, 50, 0], detuningRadPerUs: [-200, 0, 200], durationsUs: [10, 10] }).durationsUs[0], 10);
});
