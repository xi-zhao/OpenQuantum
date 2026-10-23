import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "simulate_mrmustard_optics",
  description: "Evolve vacuum through structured Gaussian optical gates and attenuation using pinned MrMustard. Return phase-space moments and unnormalized Fock probabilities up to the requested per-mode cutoff, including retained mass. Quadrature hbar=2; alpha=x+iy for displacement. Explicit setup required; archived upstream compatibility adapter, no hardware.",
  source: { name: "mrmustard", version: "0.7.3", repository: "https://github.com/XanaduAI/MrMustard" },
  inputSchema: obj({
    numModes: count(1, 1), cutoff: count(1, 8),
    operations: { ...arr(obj({ operation: { enum: ["D", "S", "R", "BS", "S2", "LOSS"] }, modes: arr(count(0), 1, 2),
      x: finite(), y: finite(), r: finite(0), phi: finite(), theta: finite(), transmissivity: { type: "number", minimum: 0, maximum: 1 },
    }, ["operation", "modes"]), 0), default: [{ operation: "D", modes: [0], x: 0.5, y: 0 }] },
  }),
  checkInput(v) {
    const parameters = { D: ["x", "y"], S: ["r", "phi"], R: ["theta"], BS: ["theta", "phi"], S2: ["r", "phi"], LOSS: ["transmissivity"] };
    for (const operation of v.operations) {
      const expected = parameters[operation.operation];
      if (expected.some(key => operation[key] === undefined) || Object.keys(operation).some(key => !["operation", "modes", ...expected].includes(key))) throw new Error("Each optical operation must contain exactly its documented parameters");
      const arity = ["BS", "S2"].includes(operation.operation) ? 2 : 1;
      if (operation.modes.length !== arity || new Set(operation.modes).size !== arity || operation.modes.some(mode => mode >= v.numModes)) throw new Error("Optical modes must be distinct, in range and match operation arity");
    }
  },
  resultSchema: obj({ numModes: count(), cutoff: count(), hbar: { const: 2 }, quadratureOrder: { const: "x0,...,xN-1,p0,...,pN-1" },
    means: arr(finite(), 2), covariance: arr(arr(finite(), 2), 2), meanPhotons: arr(finite(), 1),
    fockProbabilities: arr(obj({ occupation: arr(count(0), 1), probability: finite() }), 1), retainedProbability: finite(),
  }),
});
