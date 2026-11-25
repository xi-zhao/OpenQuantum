import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { checkCircuit } from "../../../../src/lib/quantum-circuit-input.mjs";
import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/result.schema.json" with { type: "json" };
import observationContract from "../artifacts/observations.schema.json" with { type: "json" };
const { $schema: requestDraft, ...inputSchema } = requestContract;
const { $schema: resultDraft, ...resultSchema } = resultContract;
void requestDraft; void resultDraft;
export const definition = defineScienceTool({
  name: "optimize_pyzx_circuit",
  description: "Optimize Clifford+T circuits through PyZX ZX rewriting and extraction. Return input/output OpenQASM 2 and gate counts. Independent full-unitary comparison is optional; circuit size is determined by the user's resources. No measurements, hardware routing or guaranteed gate-count improvement.",
  source: {"name":"pyzx","version":"0.10.8","repository":"https://github.com/zxcalc/pyzx"},
  inputSchema, resultSchema, observationSchema: observationContract,
  checkInput: checkCircuit,
});
