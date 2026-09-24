import { defineScienceTool, objectSchema as obj } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite, listSchema as list, executionSchema } from "../../../../src/lib/science-execution.mjs";
import { nullable, referenceModeSchema, referenceAwareResultSchema } from "../../../../src/lib/science-reference.mjs";

const complex = { type: "array", items: finite(), minItems: 2, maxItems: 2 };
const state = list(complex);
const term = obj({ pauli: { type: "string", pattern: "^[IXYZ]+$" }, coefficient: finite() });
export const definition = defineScienceTool({
  name: "simulate_hamiltonian",
  description: "Build an open Qiskit circuit for exp(-iHt) from real Pauli terms using Trotter-Suzuki or one seeded qDrift realization. Return OpenQASM 3, gate resources and optional statevector; independently compare the full unitary to SciPy expm when requested. Leftmost Pauli/state bit is q0. No automatic installation, file output, cloud or hardware calls. Prepare the locked environment explicitly first.",
  source: {
    name: "UnitaryLab Algorithms MIT adaptation",
    repository: "https://github.com/unitarylab/unitarylab_algorithms",
    commit: "a8362e374da2ec2c68f582db645a7782e45bfc4b",
    backend: "Qiskit 2.5.2 / NumPy 2.5.3 / SciPy 1.18.1",
  },
  inputSchema: obj({
    numQubits: count(1),
    terms: list(term),
    time: finite(),
    method: { enum: ["trotter", "qdrift"], default: "trotter" },
    steps: { ...count(1, 32), description: "Exact number of Trotter slices or qDrift sampled Pauli rotations; not an error guarantee." },
    order: { ...count(1), description: "Trotter only: 1 or an even order; defaults to 2." },
    seed: { ...count(0), description: "qDrift only: reproducible NumPy PCG64 seed; defaults to 0." },
    outputMode: { enum: ["statevector", "circuit"], default: "statevector" },
    initialState: { anyOf: [{ enum: ["zero", "plus"] }, state], default: "zero" },
    referenceMode: referenceModeSchema,
    execution: executionSchema,
  }, ["numQubits", "terms", "time"]),
  checkInput(v) {
    if (v.terms.some(t => t.pauli.length !== v.numQubits)) throw new Error("Pauli length must equal numQubits; leftmost character is q0");
    if (v.method === "trotter") {
      if (v.seed !== undefined) throw new Error("seed is only used by qdrift");
      v.order ??= 2;
      if (v.order !== 1 && v.order % 2) throw new Error("Trotter order must be 1 or even");
    } else {
      if (v.order !== undefined) throw new Error("order is only used by trotter");
      v.seed ??= 0;
    }
    if (v.outputMode === "circuit" && v.initialState !== "zero") throw new Error("initialState requires outputMode=statevector");
    if (Array.isArray(v.initialState)) {
      if (Math.log2(v.initialState.length) !== v.numQubits) throw new Error("initialState needs 2^numQubits complex pairs in q0-first order");
      const norm = v.initialState.reduce((s, [re, im]) => s + re * re + im * im, 0);
      if (!Number.isFinite(norm) || Math.abs(norm - 1) > 1e-10) throw new Error("initialState must have squared norm 1 within 1e-10; it is not silently normalized");
    }
    const lambda = v.terms.reduce((s, t) => s + Math.abs(t.coefficient), 0);
    if (!Number.isFinite(lambda) || !Number.isFinite(lambda * v.time)) throw new Error("Coefficient/time scale overflows finite floating-point representation");
  },
  resultSchema: referenceAwareResultSchema({
    method: { enum: ["trotter", "qdrift"] },
    numQubits: count(1),
    steps: count(1),
    order: nullable(count(1)),
    seed: nullable(count(0)),
    terms: list(term, 0),
    identityCoefficient: finite(),
    lambda: finite(0),
    pauliRotations: count(0),
    sampledTermCounts: list(count(0), 0),
    sequenceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    openQasm3: { type: "string", minLength: 1 },
    circuit: obj({
      depth: count(0), gates: count(0), twoQubitGates: count(0), globalPhase: finite(),
      gateCounts: { type: "object", additionalProperties: count(0) },
    }),
    statevector: nullable(state),
    stateNorm: nullable(finite(0)),
    unitaryFrobeniusError: nullable(finite(0)),
    unitarySpectralError: nullable(finite(0)),
    convention: { const: "leftmost Pauli and statevector bit is q0; hbar=1; circuit implements exp(-iHt)" },
    interpretation: { enum: ["deterministic product formula", "one seeded random circuit; not an ensemble channel error or error guarantee"] },
  }, ["unitaryFrobeniusError", "unitarySpectralError"]),
});

// This capability calls only the interpreter prepared by the explicit setup command.
definition.tool.annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
