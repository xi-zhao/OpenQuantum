import { defineScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";

import requestContract from "../inputs/request.schema.json" with { type: "json" };
import resultContract from "../artifacts/ldpc-result.schema.json" with { type: "json" };
import observationContract from "../artifacts/observations.schema.json" with { type: "json" };
const { $schema: requestDraft, ...inputSchema } = requestContract;
const { $schema: resultDraft, ...resultSchema } = resultContract;
void requestDraft; void resultDraft;

export const definition = defineScienceTool({
  name: "decode_ldpc_syndromes",
  description: "Decode binary parity-check matrices with pinned BP+LSD and independently replay each syndrome over GF(2). Matrix dimensions, batch size and iteration count are chosen by the user; logical success is not inferred.",
  source: { name: "ldpc", version: "2.4.1", repository: "https://github.com/quantumgizmos/ldpc" },
  inputSchema,
  observationSchema: observationContract,
  checkInput(v) {
    const n = v.parityCheck[0].length, m = v.parityCheck.length;
    if (v.parityCheck.some(row => row.length !== n)) throw new Error("parityCheck must be rectangular");
    if (v.syndromes.some(row => row.length !== m)) throw new Error("Each syndrome length must equal the number of checks");
    if (v.parityCheck.some(row => !row.some(Boolean))) throw new Error("Empty parity checks are unsupported; remove zero rows and their zero syndromes");
    if (v.trueErrors && (v.trueErrors.length !== v.syndromes.length || v.trueErrors.some((row, i) => row.length !== n
      || v.parityCheck.some((h, k) => h.reduce((s, a, j) => s ^ (a & row[j]), 0) !== v.syndromes[i][k])))) throw new Error("trueErrors must match every syndrome");
    if (v.logicalObservables?.some(row => row.length !== n)) throw new Error("logicalObservables must have n columns");
    // Inconsistent syndromes can crash or stall the upstream C++ decoder.
    for (const syndrome of v.syndromes) {
      const rows = v.parityCheck.map((row, i) => [...row, syndrome[i]]);
      let pivot = 0;
      for (let column = 0; column < n && pivot < m; column++) {
        const found = rows.findIndex((row, i) => i >= pivot && row[column] === 1);
        if (found < 0) continue;
        [rows[pivot], rows[found]] = [rows[found], rows[pivot]];
        for (let i = pivot + 1; i < m; i++) if (rows[i][column]) {
          for (let j = column; j <= n; j++) rows[i][j] ^= rows[pivot][j];
        }
        pivot++;
      }
      if (rows.some(row => !row.slice(0,n).some(Boolean) && row[n])) throw new Error("Syndrome is inconsistent with parityCheck over GF(2)");
    }
  },
  resultSchema,
});
