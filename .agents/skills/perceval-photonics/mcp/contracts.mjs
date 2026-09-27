import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "simulate_perceval_photonics",
  description: "Compute lossless indistinguishable-photon Fock probabilities for a user-defined beam-splitter/phase-shifter network using real Perceval SLOS. BS uses the Hadamard convention and angleRad theta; PS uses exp(i*angleRad). No hardware, cloud, arbitrary code, file access or installation. Requires explicit dependency setup.",
  source: { name: "perceval-quandela", version: "1.3.0", repository: "https://github.com/Quandela/Perceval" },
  inputSchema: obj({
    inputOccupation: { ...arr(count(0), 1), default: [1, 1] },
    operations: { ...arr(obj({ gate: { enum: ["BS", "PS"] }, modes: arr(count(0), 1, 2), angleRad: finite() }), 0), default: [{ gate: "BS", modes: [0, 1], angleRad: Math.PI / 2 }] },
  }),
  checkInput(v) {
    if (!Number.isSafeInteger(v.inputOccupation.reduce((a, b) => a + b, 0))) throw new Error("Photon count is not safely representable");
    for (const op of v.operations) {
      if (op.modes.length !== (op.gate === "BS" ? 2 : 1)) throw new Error("BS requires two modes and PS one mode");
      if (new Set(op.modes).size !== op.modes.length || op.modes.some(m => m >= v.inputOccupation.length)) throw new Error("Operation modes must be distinct and within inputOccupation");
    }
  },
  resultSchema: obj({
    modeCount: count(), photonCount: count(0), totalProbability: finite(0),
    outcomes: arr(obj({ occupation: arr(count(0), 1), probability: finite(0) }), 1),
    unitary: arr(arr(arr(finite(), 2, 2), 1), 1),
    backend: { const: "Perceval SLOSBackend" },
    modeOrder: { const: "occupation[i] and unitary row/column i refer to input mode i" },
  }),
});
