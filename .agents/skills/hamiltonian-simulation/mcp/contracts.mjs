import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/hamiltonian-simulation-result.schema.json" with { type: "json" };
import observationSchema from "../artifacts/observations.schema.json" with { type: "json" };

const inputSchema = { ...requestContract }, resultSchema = { ...resultContract };
delete inputSchema.$schema;
delete resultSchema.$schema;

export const definition = defineScienceTool({
  name: "simulate_hamiltonian",
  description: "Build an open Qiskit circuit for exp(-iHt) from real Pauli terms using Trotter-Suzuki or one seeded qDrift realization. Return OpenQASM 3, gate resources and optional statevector; independently compare the full unitary to SciPy expm when requested. Leftmost Pauli/state bit is q0. No automatic installation, file output, cloud or hardware calls. Prepare the locked environment explicitly first.",
  source: {
    name: "UnitaryLab Algorithms MIT adaptation",
    repository: "https://github.com/unitarylab/unitarylab_algorithms",
    commit: "a8362e374da2ec2c68f582db645a7782e45bfc4b",
    backend: "Qiskit 2.5.2 / NumPy 2.5.3 / SciPy 1.18.1",
  },
  inputSchema,
  observationSchema,
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
  resultSchema,
});

// This capability calls only the interpreter prepared by the explicit setup command.
definition.tool.annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
