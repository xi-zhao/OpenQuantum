import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { referenceModeSchema, referenceAwareResultSchema, nullable } from "../../../../src/lib/science-reference.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const vector = arr(arr(num(-1.00000001, 1.00000001), 2, 2), 2);
const resultSchema = referenceAwareResultSchema({ nodes: arr(int(0), 1), edges: arr(arr(int(0), 2, 2), 0), inputNodes: arr(int(0), 1), outputNodes: arr(int(0), 1), maxSpace: int(1), pattern: { type: "string", minLength: 1 }, simulation: obj({ status: { enum: ["computed", "not_run"] }, backend: { const: "statevector" }, reason: { type: "string", minLength: 1 } }), referenceStatevector: nullable(vector), branches: arr(obj({ seed: int(0, Number.MAX_SAFE_INTEGER), statevector: vector, fidelity: nullable(num(0, 1.00000001)), normError: num(0), measurements: arr(obj({ node: int(0), outcome: int(0, 1) }), 0) }), 0), maxInfidelity: nullable(num(0, 1)), bitOrder: { const: "left-to-right logical q0,q1,... mapped by outputNodes" } }, ["referenceStatevector", "maxInfidelity"]);
resultSchema.allOf.push({
  if: { properties: { reference: { properties: { status: { const: "computed" } } } } },
  then: { properties: { branches: { minItems: 1, items: { properties: { fidelity: { type: "number" } } } } } },
  else: { properties: { branches: { items: { properties: { fidelity: { type: "null" } } } } } },
}, {
  if: { properties: { simulation: { properties: { status: { const: "not_run" } } } } },
  then: { properties: { branches: { maxItems: 0 }, reference: { properties: { status: { const: "not_run" } } } } },
  else: { properties: { branches: { minItems: 1 } } },
});
export const definition = defineScienceTool({
  name: "simulate_graphix_pattern",
  description: "Generate and optimize a Graphix MBQC pattern, resource graph and measurement order. simulate=false generates the pattern without state simulation. Optional statevector simulation returns corrected sampled branches; independent gate-model reference is separately selectable. Size is determined by the user's resources.",
  source: { name: "graphix", version: "0.4", repository: "https://github.com/TeamGraphix/graphix" },
  inputSchema: obj({ ...circuitSchema(undefined, undefined, true), simulate: { type: "boolean", default: true }, initialState: { type: "string", enum: ["zero", "plus"], default: "zero" }, branches: int(1, undefined, 4), seed: int(0, 2147483647, 7), referenceMode: referenceModeSchema }),
  checkInput(v) {
    checkCircuit(v);
    if (!Number.isSafeInteger(v.seed + v.branches - 1)) throw new Error("Branch seeds must be exactly representable integers");
    if (!v.simulate && v.referenceMode === "required") throw new Error("An output-state reference requires simulate=true");
  },
  resultSchema,
});
