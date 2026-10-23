import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "simulate_lightworks_photonics",
  description: "Simulate a lossless indistinguishable-photon Fock input through a Lightworks beam-splitter/phase-shifter network with the permanent backend. BS uses power reflectivity r and Rx convention [[sqrt(r),i*sqrt(1-r)],[i*sqrt(1-r),sqrt(r)]]. PS uses exp(i*phaseRad). Return amplitudes, probabilities and mode unitary. No cloud, hardware or implicit installation.",
  source: { name: "lightworks", version: "2.3.5", repository: "https://github.com/Aegiq/lightworks" },
  inputSchema: obj({
    inputOccupation: { ...arr(count(0), 1), default: [1, 1] },
    operations: { ...arr(obj({ gate: { enum: ["BS", "PS"] }, modes: arr(count(0), 1, 2), reflectivity: { ...finite(0), maximum: 1 }, phaseRad: finite() }, ["gate", "modes"]), 0), default: [{ gate: "BS", modes: [0, 1], reflectivity: 0.5 }] },
  }),
  checkInput(v) {
    if (!Number.isSafeInteger(v.inputOccupation.reduce((a, b) => a + b, 0))) throw new Error("Photon count must be safely representable");
    for (const op of v.operations) {
      if (op.modes.length !== (op.gate === "BS" ? 2 : 1) || new Set(op.modes).size !== op.modes.length || op.modes.some(m => m >= v.inputOccupation.length)) throw new Error("Operation modes must have correct arity, be distinct and in range");
      if ((op.gate === "BS") !== (op.reflectivity !== undefined) || (op.gate === "PS") !== (op.phaseRad !== undefined)) throw new Error("BS requires only reflectivity; PS requires only phaseRad");
    }
  },
  resultSchema: obj({
    modeCount: count(), photonCount: count(0), totalProbability: finite(0),
    outcomes: arr(obj({ occupation: arr(count(0), 1), amplitude: arr(finite(), 2, 2), probability: finite(0) }), 1),
    unitary: arr(arr(arr(finite(), 2, 2), 1), 1),
    backend: { const: "Lightworks permanent Simulator" },
    modeOrder: { const: "occupation[i] and unitary row/column i refer to mode i" },
  }),
});
