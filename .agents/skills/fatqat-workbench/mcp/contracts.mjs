import Ajv from "ajv";

export const FATQAT_REVISION = "39b75e30ae50ddb4a8c7b840847edce678aa814c";
export const FATQAT_VERSION = "0.1.0a1";
const integer = (minimum, maximum) => ({ type: "integer", minimum, maximum: maximum ?? Number.MAX_SAFE_INTEGER });
const number = (minimum, maximum) => ({ type: "number", minimum, maximum });
const object = (properties, required) => ({ type: "object", properties, required, additionalProperties: false });
export const GATES = Object.freeze({
  h: 1, x: 1, y: 1, z: 1, s: 1, sdg: 1, t: 1, tdg: 1, sx: 1,
  rx: 1, ry: 1, rz: 1, cx: 2, cz: 2, swap: 2, pair: 2, unpair: 2,
});
const operation = object({
  gate: { type: "string", enum: Object.keys(GATES) },
  qubits: { type: "array", minItems: 1, maxItems: 2, uniqueItems: true, items: integer(0) },
  angle: { ...number(undefined), description: "Rotation angle in radians; required only for rx/ry/rz." },
}, ["gate", "qubits"]);
const circuitSchema = object({
  backend: { type: "string", enum: ["general", "superconducting", "atom_array"], description: "Hardware profiles validate native instructions; they do not automatically compile or route. Atom sites are loaded at the start." },
  numQubits: integer(1),
  operations: { type: "array", items: operation },
  couplings: { type: "array", uniqueItems: true, items: { type: "array", minItems: 2, maxItems: 2, uniqueItems: true, items: integer(0) }, description: "Required for superconducting only: undirected native CZ edges on sites 0..numQubits-1. Empty means no CZ edges." },
  noise: object({
    channel: { type: "string", enum: ["depolarizing", "amplitude_damping", "phase_damping"] },
    probability: number(0, 1),
  }, ["channel", "probability"]),
  shots: { ...integer(0), default: 0, description: "Zero returns exact pre-measurement probabilities; positive adds separately sampled terminal measurements." },
  seed: { ...integer(0, 2147483647), default: 7 },
}, ["backend", "numQubits", "operations"]);
const transmonSchema = object({
  model: { type: "string", const: "transmon" },
  durationNs: number(0.01),
  amplitudeRadPerNs: number(0),
  phaseRad: number(undefined),
  target: integer(0, 1),
  samples: integer(2),
}, ["model", "durationNs", "amplitudeRadPerNs"]);
const rydbergSchema = object({
  model: { type: "string", const: "rydberg" },
  numAtoms: integer(1),
  spacingUm: { type: "number", exclusiveMinimum: 0 },
  durationUs: number(0.001),
  omegaRadPerUs: number(0),
  detuningRadPerUs: number(undefined),
  c6RadPerUsUm6: number(undefined),
  samples: integer(2),
}, ["model", "numAtoms", "spacingUm", "durationUs", "omegaRadPerUs"]);
// Keep the root object explicit for MCP and model-provider schema consumers.
const dynamicsSchema = {
  type: "object",
  properties: { ...transmonSchema.properties, ...rydbergSchema.properties, model: { type: "string", enum: ["transmon", "rydberg"] } },
  required: ["model"],
  additionalProperties: false,
  oneOf: [transmonSchema, rydbergSchema],
};
const outputSchema = object({
  schemaVersion: { type: "string", const: "1.0" },
  source: object({
    name: { type: "string", const: "FatQat" },
    version: { type: "string", const: FATQAT_VERSION },
    revision: { type: "string", const: FATQAT_REVISION },
    dependencyLockSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  }, ["name", "version", "revision", "dependencyLockSha256"]),
  input: { type: "object" },
  inputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  execution: { type: "object" },
  result: { type: "object" },
  checks: { type: "object" },
  scientificValidation: { type: "string", const: "not_evaluated" },
  limitations: { type: "array", items: { type: "string" } },
}, ["schemaVersion", "source", "input", "inputSha256", "execution", "result", "checks", "scientificValidation", "limitations"]);
const annotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
export const TOOLS = Object.freeze([
  {
    name: "simulate_fatqat_circuit", title: "FatQat 电路与硬件约束实验",
    description: "Run a seeded local FatQat circuit or native hardware-profile experiment and return exact probabilities, optional counts, state data and a plot. Qubit count, operations and shots follow user inputs. Noise acts independently on each operand after every unitary instruction, excluding pairing/loading. Profiles do not compile or route. First use may download the locked Python environment; no cloud/QPU execution or scientific acceptance.",
    inputSchema: circuitSchema, outputSchema, annotations,
  },
  {
    name: "simulate_fatqat_dynamics", title: "FatQat 脉冲动力学实验",
    description: "Run a constant-drive experiment and return a population time series, final state, explicit units/model document and plot. Transmon: synthetic two-transmon reference with three physical levels each, one driven site, ns and rad/ns. Rydberg: a user-selected number of fixed chain sites, global drive/detuning, us, micrometres and rad/us. All runs start in the ground state, without added noise. First use may download locked dependencies. Reference models are not live calibrations; no scientific acceptance.",
    inputSchema: dynamicsSchema, outputSchema, annotations,
  },
]);
const ajv = new Ajv({ allErrors: true, strict: false, strictNumbers: true });
const validators = new Map(TOOLS.map((tool) => [tool.name, ajv.compile(tool.inputSchema)]));
export const validateOutput = ajv.compile(outputSchema);

export function normalizeRequest(name, value) {
  const validate = validators.get(name);
  if (!validate) throw new TypeError(`Unknown tool: ${name}`);
  if (!validate(value)) throw new TypeError(`Invalid request: ${ajv.errorsText(validate.errors)}`);
  const result = structuredClone(value);
  if (name === "simulate_fatqat_dynamics") {
    result.samples ??= 21;
    if (result.model === "transmon") {
      result.phaseRad ??= 0;
      result.target ??= 0;
    } else {
      result.detuningRadPerUs ??= 0;
      result.c6RadPerUsUm6 ??= 180955.73684677208;
    }
    return result;
  }
  result.shots ??= 0;
  result.seed ??= 7;
  if (result.backend === "superconducting") {
    if (!result.couplings) throw new TypeError("superconducting requires explicit couplings");
    const edges = result.couplings.map((edge) => {
      if (edge.some((site) => site >= result.numQubits)) throw new RangeError("Coupling site is out of range");
      return [...edge].sort((a, b) => a - b).join(":");
    });
    if (new Set(edges).size !== edges.length) throw new TypeError("Couplings contain a repeated undirected edge");
  } else if (result.couplings) throw new TypeError("couplings is only valid for the superconducting profile");
  for (const operation of result.operations) {
    if (operation.qubits.length !== GATES[operation.gate] || operation.qubits.some((site) => site >= result.numQubits)) {
      throw new RangeError("Gate arity or qubit index is invalid");
    }
    const rotation = ["rx", "ry", "rz"].includes(operation.gate);
    if (rotation !== (operation.angle !== undefined)) throw new TypeError("Only rotations require an angle");
    if (["pair", "unpair"].includes(operation.gate) && result.backend !== "atom_array") {
      throw new TypeError("pair/unpair require the atom_array profile");
    }
  }
  return result;
}
