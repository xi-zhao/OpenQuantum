import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const text = { type: "string" };
const optionalText = { anyOf: [text, { type: "null" }] };
export const definition = defineScienceTool({
  name: "query_qcarchive_singlepoints",
  description: "Read QCArchive singlepoint records by IDs or method/program/basis filters using QCPortal. Return molecular geometry in bohr, charge, multiplicity, calculation specification, energy in hartree when present, status and provenance. Configure QCPORTAL_ADDRESS and optional paired username/password in settings; no credentials or endpoints in input. No computation submission, record modification or file downloads. Requires explicitly prepared dependencies.",
  source: { name: "qcportal", version: "0.70", repository: "https://github.com/MolSSI/QCFractal" },
  inputSchema: obj({
    recordIds: { ...arr(count(1), 1), uniqueItems: true },
    program: text, method: text, basis: text,
    limit: { ...count(1), default: 10 },
    requestTimeoutSeconds: { ...finite(Number.MIN_VALUE), default: 30 },
  }, ["limit", "requestTimeoutSeconds"]),
  checkInput(value) {
    if (value.recordIds && ["program", "method", "basis"].some(key => value[key] !== undefined)) throw new Error("Use recordIds or search filters, not both");
    if (value.recordIds && value.recordIds.length > value.limit) throw new Error("limit must include all requested recordIds");
  },
  resultSchema: obj({
    server: text, serverVersion: text, returned: count(0), queryLimit: count(1),
    records: arr(obj({
      recordId: count(1), status: text, moleculeId: count(1),
      program: text, driver: text, method: text, basis: optionalText,
      energyHartree: { anyOf: [finite(), { type: "null" }] },
      molecule: obj({ symbols: arr(text, 1), geometryBohr: arr(arr(finite(), 3, 3), 1), charge: finite(), multiplicity: count(1) }),
      provenance: arr(obj({ creator: text, version: text, routine: text }), 0),
    }), 0),
    networkUsed: { const: true }, recordsModified: { const: false },
  }),
});
