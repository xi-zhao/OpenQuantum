import assert from "node:assert/strict";
import test from "node:test";
import { definition as cudaq } from "../.agents/skills/cudaq-simulation/mcp/contracts.mjs";
import { definition as qcarchive } from "../.agents/skills/qcarchive-query/mcp/contracts.mjs";
import { definition as netqasm, simulationDefinition } from "../.agents/skills/netqasm-network/mcp/contracts.mjs";
import { SDK_EXPANSION_IO } from "./fixtures/sdk-expansion-io.mjs";
import { registerScienceProtocolTests } from "./helpers/science-protocol.mjs";

registerScienceProtocolTests(SDK_EXPANSION_IO, { cancellationId: "cudaq-simulation" });

test("SDK I/O boundaries reject credentials, endpoints, source code and inconsistent selectors", () => {
  for (const definition of [cudaq, qcarchive, netqasm, simulationDefinition]) {
    for (const extra of [{ code: "arbitrary()" }, { apiKey: "sentinel" }, { endpoint: "https://example.invalid" }, { password: "sentinel" }, { backend: "hardware" }]) {
      assert.throws(() => definition.normalize(definition.tool.name, extra));
    }
  }
  const call = input => qcarchive.normalize(qcarchive.tool.name, input);
  assert.throws(() => call({ recordIds: [1], method: "hf" }), /recordIds/);
  assert.throws(() => call({ recordIds: [1, 2], limit: 1 }), /limit/);
  assert.throws(() => call({ recordIds: [1, 1] }));
  assert.throws(() => call({ requestTimeoutSeconds: 0 }));
  assert.equal(call({ limit: 10000 }).limit, 10000);
  assert.equal(cudaq.normalize(cudaq.tool.name, { numQubits: 64, shots: 0 }).numQubits, 64);
  assert.throws(() => cudaq.normalize(cudaq.tool.name, { numQubits: 1, gates: [{ gate: "CX", targets: [0, 0] }] }));
  assert.throws(() => simulationDefinition.normalize(simulationDefinition.tool.name, { linkNoise: 1.1 }));
});
