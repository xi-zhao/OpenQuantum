import assert from "node:assert/strict";
import test from "node:test";
import { circuitUnitary, phaseComparison, lieClosure, gf2Rank, pauliBits, parseQasm } from "../src/lib/independent-quantum-math.mjs";
import "../.agents/skills/pyzx-optimization/test/validator.test.mjs";
import "../.agents/skills/symmer-tapering/test/validator.test.mjs";
import "../.agents/skills/paulie-algebra/test/validator.test.mjs";
import "../.agents/skills/graphix-mbqc/test/validator.test.mjs";

test("independent arithmetic distinguishes symplectic rank from operator and central dimensions", () => {
  const generators = ["XI", "IX", "XX"];
  assert.equal(gf2Rank(generators.map(pauliBits)), 2);
  assert.deepEqual(lieClosure(generators), ["IX", "XI", "XX"]);
  assert.deepEqual(lieClosure(["X", "Z"]), ["X", "Y", "Z"]);
});
test("independent unitary oracle retains global phase and ordered noncommuting gates", () => {
  const x = { gate: "X", targets: [0] }, z = { gate: "Z", targets: [0] }, h = { gate: "H", targets: [0] };
  assert.ok(phaseComparison(circuitUnitary(1, [x, z]), circuitUnitary(1, [{ gate: "Y", targets: [0] }])).maxError < 1e-12);
  assert.ok(phaseComparison(circuitUnitary(1, [h, z]), circuitUnitary(1, [z, h])).maxError > 0.5);
  assert.throws(() => parseQasm('OPENQASM 2.0; include "qelib1.inc"; qreg q[1]; rz(process.exit()) q[0];'));
});
