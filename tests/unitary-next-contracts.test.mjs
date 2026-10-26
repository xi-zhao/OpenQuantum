import assert from "node:assert/strict";
import test from "node:test";
import { UNITARY_NEXT_TOOLS } from "./fixtures/unitary-next.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(UNITARY_NEXT_TOOLS, { cancellationId: "pyzx-optimization" });

test("Graphix accepts an empty identity pattern with or without state simulation", async () => {
  const { definition } = await import("../.agents/skills/graphix-mbqc/mcp/contracts.mjs");
  const statevector = [[1, 0], [0, 0], [0, 0], [0, 0]];
  for (const simulate of [true, false]) {
    const input = definition.normalize(definition.tool.name, { numQubits: 2, gates: [
      { gate: "CZ", targets: [0, 1] }, { gate: "CZ", targets: [0, 1] },
    ], branches: 1, simulate, referenceMode: simulate ? "required" : "skip" });
    // Contract fixture only; the live test checks Graphix's actual reduction.
    const output = {
      schemaVersion: "1.0", source: definition.source, input,
      inputSha256: "0".repeat(64), dependencyLockSha256: "0".repeat(64),
      scientificValidation: "not_evaluated", limitations: ["Protocol fixture only"],
      result: {
        nodes: [0, 1], edges: [], inputNodes: [0, 1], outputNodes: [0, 1], maxSpace: 2, pattern: "",
        simulation: { status: simulate ? "computed" : "not_run", backend: "statevector", reason: "Contract fixture" },
        reference: { mode: input.referenceMode, status: simulate ? "computed" : "not_run", method: "Gate-model statevector", reason: "Contract fixture" },
        referenceStatevector: simulate ? statevector : null,
        branches: simulate ? [{ seed: input.seed, statevector, fidelity: 1, normError: 0, measurements: [] }] : [],
        maxInfidelity: simulate ? 0 : null,
        bitOrder: "left-to-right logical q0,q1,... mapped by outputNodes",
      },
    };
    assert.equal(definition.validateOutput(output), true, JSON.stringify(definition.validateOutput.errors));
    for (const pattern of [null, [], 0]) {
      assert.equal(definition.validateOutput({ ...output, result: { ...output.result, pattern } }), false);
    }
  }
});

test("Unitary next tools reject out-of-scope circuits, inconsistent sectors and invalid generators", async () => {
  const bad = {
    "pyzx-optimization": [{ numQubits: 0 }, { gates: [] }, { gates: [{ gate: "MEASURE", targets: [0] }] }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "H", targets: [2] }] }, { gates: [{ gate: "T", targets: [0], angle: 0.3 }] }],
    "graphix-mbqc": [{ numQubits: 0 }, { branches: 0 }, { initialState: "thermal" }, { gates: [{ gate: "RY", targets: [0] }] }, { gates: [{ gate: "RX", targets: [0], angle: Infinity }] }, { gates: [{ gate: "H", targets: [0, 1] }] }],
    "symmer-tapering": [{ terms: [{ pauli: "ZI", coefficient: 1 }, { pauli: "ZI", coefficient: 2 }] }, { symmetries: [{ pauli: "XX", sector: 1 }] }, { symmetries: [{ pauli: "II", sector: 1 }] }, { symmetries: [{ pauli: "ZZ", sector: 0 }] }, { numQubits: 3, terms: [{ pauli: "III", coefficient: 1 }], symmetries: [{ pauli: "XII", sector: 1 }, { pauli: "ZII", sector: 1 }] }, { numQubits: 4, terms: [{ pauli: "IIII", coefficient: 1 }], symmetries: [{ pauli: "ZIII", sector: 1 }, { pauli: "IZII", sector: 1 }, { pauli: "ZZII", sector: 1 }] }, { numQubits: 2, terms: [{ pauli: "X", coefficient: 1 }] }],
    "paulie-algebra": [{ numQubits: 0 }, { generators: ["II"] }, { generators: ["X"] }, { generators: ["XI", "XI"] }, { generators: ["XX+YY"] }],
  };
  for (const { id, tool } of UNITARY_NEXT_TOOLS) {
    const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    for (const input of bad[id]) assert.throws(() => definition.normalize(tool, input), undefined, `${id}: ${JSON.stringify(input)}`);
  }
});
