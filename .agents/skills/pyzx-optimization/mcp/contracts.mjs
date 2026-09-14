import { defineScienceTool, objectSchema as obj, numberSchema as num, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { circuitSchema, checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
const metrics = obj({ gates: int(0, 8192), twoQubitGates: int(0, 8192), tCount: int(0, 8192) });
export const definition = defineScienceTool({
  name: "optimize_pyzx_circuit",
  description: "Optimize a 1–6 qubit unitary Clifford+T circuit using PyZX ZX rewriting and extraction. Return input/output OpenQASM 2, gate counts and an independent dense unitary comparison up to global phase. No measurements, hardware routing or guaranteed gate-count improvement.",
  source: { name: "pyzx", version: "0.10.6", repository: "https://github.com/zxcalc/pyzx" },
  inputSchema: obj(circuitSchema(6, 64)),
  checkInput: checkCircuit,
  resultSchema: obj({ inputQasm: { type: "string", minLength: 1, maxLength: 100000 }, optimizedQasm: { type: "string", minLength: 1, maxLength: 100000 }, before: metrics, after: metrics, unitaryMaxError: num(0, 2), equivalenceTolerance: { const: 1e-8 }, equivalentUpToGlobalPhase: { type: "boolean" }, bitOrder: { const: "left-to-right q0,q1,..." } }),
});
