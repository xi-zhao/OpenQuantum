import assert from "node:assert/strict";
import test from "node:test";
import { SDK_EXPANSION_RESOURCES } from "./fixtures/sdk-expansion-resources.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_EXPANSION_RESOURCES, { cancellationId: "quri-parts-estimation" });
for (const c of SDK_EXPANSION_RESOURCES) {
  const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
  const normalize = input => definition.normalize(c.tool, input);
  test(`${c.id}: strict structural input and execution controls`, () => {
    for (const input of [{ code: "import os" }, { apiKey: "forbidden" }, { url: "https://example.com" }, { execution: { threads: 0 } }]) assert.throws(() => normalize(input));
    assert.doesNotThrow(() => normalize(c.input));
    if (["quri-parts-estimation", "qdk-resource-estimation", "mqt-ddsim", "mqt-qmap"].includes(c.id)) {
      for (const input of [{ numQubits: 0 }, { gates: [] }, { gates: [{ gate: "CX", targets: [0, 0] }] }, { gates: [{ gate: "RY", targets: [0], angle: NaN }] }, { gates: [{ gate: "X", targets: [0], angle: 1 }] }]) assert.throws(() => normalize(input));
    }
    if (c.id === "quri-parts-estimation") {
      assert.throws(() => normalize({ terms: [{ pauli: "Z", coefficient: 1 }] }));
      assert.doesNotThrow(() => normalize({ numQubits: 100, terms: [{ pauli: "I".repeat(100), coefficient: 1 }], execution: { threads: 2 } }));
    }
    if (c.id === "qdk-resource-estimation") {
      for (const input of [{ physicalErrorRate: 0 }, { physicalErrorRate: 1 }, { gateTimeNs: 0 }, { maxError: Infinity }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 1000 }));
    }
    if (c.id === "qualtran-resources") {
      for (const input of [{ bitsize: 0 }, { constant: 3 }, { operation: "less_than_constant", bitsize: 2, constant: 4 }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ bitsize: 1000000 }));
      assert.doesNotThrow(() => normalize({ operation: "less_than_constant", bitsize: 53, constant: Number.MAX_SAFE_INTEGER }));
    }
    if (c.id === "openfermion-mapping") {
      for (const input of [{ numModes: 0 }, { terms: [] }, { terms: [{ operators: [{ mode: 2, action: "create" }] }] }, { terms: [{ coefficient: { real: Infinity }, operators: [] }] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numModes: 10000 }));
    }
    if (c.id === "mqt-ddsim") {
      for (const input of [{ shots: 0 }, { seed: -1 }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 100, shots: 10000000, includeStatevector: false }));
    }
    if (c.id === "mqt-qmap") {
      for (const input of [{ numPhysicalQubits: 1 }, { coupling: [[0, 0]] }, { coupling: [[0, 1], [0, 1]] }, { coupling: [[0, 1]] }, { coupling: [[0, 3]] }]) assert.throws(() => normalize(input));
      assert.doesNotThrow(() => normalize({ numQubits: 100, numPhysicalQubits: 100, coupling: Array.from({ length: 99 }, (_, i) => [i, i + 1]) }));
    }
  });
}
