import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { UNITARY_NEXT_TOOLS } from "./fixtures/unitary-next.mjs";

const enabled = process.env.OPENQUANTUM_REAL_UNITARY_NEXT === "1";
const evidence = path.join(process.cwd(), ".openquantum/unitary-next-evidence");
const near = (x, y, tolerance = 1e-8) => assert.ok(Math.abs(x - y) <= tolerance, `${x} differs from ${y}; tolerance=${tolerance}`);
async function withTool(t, id, action) {
  const capability = UNITARY_NEXT_TOOLS.find(c => c.id === id);
  const client = new Client({ name: "unitary-next-numerical-check", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(process.cwd(), ".agents/skills", id, "mcp/server.mjs")] }));
  await mkdir(evidence, { recursive: true });
  await action(async (input, label) => {
    const response = await client.callTool({ name: capability.tool, arguments: input }, undefined, { timeout: 195000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.equal(output.scientificValidation, "not_evaluated");
    await writeFile(path.join(evidence, `${id}-${label}.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), ...output }, null, 2));
    return output.result;
  });
}

test("real PyZX: T reduction, identity, phase and qubit permutation across the full unitary", { skip: !enabled, timeout: 240000 }, async t => {
  await withTool(t, "pyzx-optimization", async run => {
    const a = await run({}, "t-reduction");
    assert.equal(a.before.tCount, 2);
    assert.equal(a.after.tCount, 0);
    assert.ok(a.after.gates < a.before.gates);
    const b = await run({ numQubits: 1, gates: Array.from({ length: 8 }, () => ({ gate: "T", targets: [0] })) }, "identity");
    assert.equal(b.after.tCount, 0);
    const c = await run({ numQubits: 3, gates: [
      { gate: "Y", targets: [0] }, { gate: "H", targets: [2] }, { gate: "S", targets: [2] },
      { gate: "CX", targets: [2, 0] }, { gate: "CX", targets: [0, 2] }, { gate: "CX", targets: [2, 0] },
      { gate: "T", targets: [1] }, { gate: "CZ", targets: [1, 2] },
    ] }, "phase-permutation");
    const d = await run({ numQubits: 6, gates: [
      { gate: "H", targets: [5] }, { gate: "T", targets: [5] }, { gate: "CX", targets: [5, 0] },
      { gate: "CZ", targets: [0, 3] }, { gate: "Y", targets: [2] },
    ] }, "six-qubits");
    for (const result of [a, b, c, d]) {
      assert.equal(result.equivalentUpToGlobalPhase, true);
      assert.ok(result.unitaryMaxError < 1e-8);
      assert.match(result.optimizedQasm, /OPENQASM 2.0/);
    }
  });
});

test("real Graphix: radians, adaptive measurement corrections, initial states and logical output order", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "graphix-mbqc", async run => {
    const bell = await run({ branches: 8 }, "bell-phase");
    near(bell.referenceStatevector[0][0], 1 / Math.sqrt(2));
    near(bell.referenceStatevector[3][1], 1 / Math.sqrt(2));
    assert.ok(new Set(bell.branches.map(b => JSON.stringify(b.measurements))).size > 1);
    const repeated = await run({ branches: 8 }, "repeat");
    assert.deepEqual(repeated.branches, bell.branches);
    const cases = [
      ["rx", { numQubits: 1, gates: [{ gate: "RX", targets: [0], angle: Math.PI }] }, [0, 1]],
      ["ry", { numQubits: 1, gates: [{ gate: "RY", targets: [0], angle: Math.PI / 2 }] }, [0.5, 0.5]],
      ["rz-plus", { numQubits: 1, initialState: "plus", gates: [{ gate: "RZ", targets: [0], angle: Math.PI / 2 }] }, [0.5, 0.5]],
      ["bit-order", { numQubits: 3, gates: [{ gate: "X", targets: [0] }, { gate: "Y", targets: [2] }] }, [0, 0, 0, 0, 0, 1, 0, 0]],
      ["cz-rotation", { numQubits: 2, initialState: "plus", gates: [{ gate: "CZ", targets: [1, 0] }, { gate: "RX", targets: [0], angle: -0.7 }, { gate: "RY", targets: [1], angle: 1.1 }, { gate: "S", targets: [0] }] }],
    ];
    for (const [label, input, expected] of cases) {
      const result = await run(input, label);
      assert.equal(result.outputNodes.length, input.numQubits);
      assert.ok(result.nodes.length <= 64 && result.maxSpace <= 10);
      for (const branch of result.branches) {
        near(branch.fidelity, 1);
        near(branch.normError, 0);
        if (expected) branch.statevector.forEach(([re, im], i) => near(re * re + im * im, expected[i]));
      }
    }
  });
});

test("real Symmer: opposite sectors, non-diagonal generators, stabilizer product signs and zero operator", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "symmer-tapering", async run => {
    for (const sector of [-1, 1]) {
      const result = await run({ symmetries: [{ pauli: "ZZ", sector }] }, `sector-${sector}`);
      const energy = Math.hypot(sector === 1 ? 1.5 : 0.5, 0.3);
      near(result.reducedSpectrum[0], -energy);
      near(result.reducedSpectrum[1], energy);
    }
    for (const sector of [-1, 1]) {
      const result = await run({ terms: [{ pauli: "YI", coefficient: 0.2 }, { pauli: "IZ", coefficient: 0.3 }, { pauli: "YX", coefficient: 0.7 }], symmetries: [{ pauli: "YI", sector }] }, `y-symmetry-${sector}`);
      near(result.reducedSpectrum[0], 0.2 * sector - Math.hypot(0.3, 0.7));
      near(result.reducedSpectrum[1], 0.2 * sector + Math.hypot(0.3, 0.7));
    }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const result = await run({ numQubits: 3, terms: [{ pauli: "XXZ", coefficient: 0.7 }, { pauli: "ZZI", coefficient: 0.4 }, { pauli: "III", coefficient: 0.2 }, { pauli: "YYZ", coefficient: -0.3 }], symmetries: [{ pauli: "XXI", sector: a }, { pauli: "ZZI", sector: b }] }, `product-${a}-${b}`);
      const magnitude = Math.abs(0.7 * a + 0.3 * a * b);
      near(result.reducedSpectrum[0], 0.4 * b + 0.2 - magnitude);
      near(result.reducedSpectrum[1], 0.4 * b + 0.2 + magnitude);
    }
    const zero = await run({ terms: [{ pauli: "II", coefficient: 0 }] }, "zero");
    assert.deepEqual(zero.reducedSpectrum, [0, 0]);
    const six = await run({ numQubits: 6, terms: [{ pauli: "IIIIIZ", coefficient: 0.7 }, { pauli: "ZIIIII", coefficient: 0.2 }], symmetries: [{ pauli: "ZIIIII", sector: -1 }] }, "six-qubits");
    assert.equal(six.sectorDimension, 32);
    near(six.reducedSpectrum[0], -0.9);
    near(six.reducedSpectrum.at(-1), 0.5);
  });
});

test("real PauLie: real Lie dimension, abelian central generators, local sum and full su(16)", { skip: !enabled, timeout: 300000 }, async t => {
  await withTool(t, "paulie-algebra", async run => {
    const cases = [
      [1, ["X", "Z"], 3, true],
      [2, ["XI", "IX", "XX"], 3, false],
      [2, ["XI", "ZI", "IX", "IZ"], 6, false],
      [2, ["XI", "ZI", "IX", "IZ", "ZZ"], 15, true],
      [4, ["XIII", "ZIII", "IXII", "IZII", "IIXI", "IIZI", "IIIX", "IIIZ", "ZZII", "IZZI", "IIZZ"], 255, true],
    ];
    for (const [i, [numQubits, generators, dimension, full]] of cases.entries()) {
      const result = await run({ numQubits, generators }, `algebra-${i}`);
      assert.equal(result.dimension, dimension);
      assert.equal(result.referenceDimension, dimension);
      assert.equal(result.generatesFullSpecialUnitary, full);
      assert.equal(new Set(result.closure).size, dimension);
      assert.ok(result.maxSpanResidual < 1e-8);
    }
  });
});
