import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "evaluate_merlin_layer",
  description: "Evaluate a local CPU float64 MerLin photonic layer over batches of phase values. A lossless Fock input passes through Rx-convention beam splitters and parameterized phase shifters. Return all Fock probabilities and autograd gradients of one selected output probability with respect to phases in circuit order. Angles are radians; no training loop, cloud or hardware.",
  source: { name: "merlinquantum", version: "0.4.1", repository: "https://github.com/merlinquantum/merlin" },
  inputSchema: obj({
    numModes: count(1, 2), occupation: { ...arr(count(0), 1), default: [1, 0] },
    targetOccupation: { ...arr(count(0), 1), default: [1, 0] },
    operations: { ...arr(obj({ operation: { enum: ["BS", "PS"] }, modes: arr(count(0), 1, 2), theta: finite() }, ["operation", "modes"]), 1),
      default: [{ operation: "BS", modes: [0, 1], theta: Math.PI / 2 }, { operation: "PS", modes: [0] }, { operation: "BS", modes: [0, 1], theta: Math.PI / 2 }] },
    phases: { ...arr(arr(finite(), 1), 1), default: [[0.7]] },
  }),
  checkInput(v) {
    if (v.occupation.length !== v.numModes || v.targetOccupation.length !== v.numModes) throw new Error("Occupation vectors must contain numModes entries");
    const sum = values => values.reduce((total, value) => total + BigInt(value), 0n);
    if (sum(v.occupation) === 0n) throw new Error("MerLin's SLOS backend requires at least one input photon");
    if (sum(v.occupation) !== sum(v.targetOccupation)) throw new Error("Lossless input and target must have equal photon number");
    let phases = 0;
    for (const operation of v.operations) {
      const arity = operation.operation === "BS" ? 2 : 1;
      if (operation.modes.length !== arity || new Set(operation.modes).size !== arity || operation.modes.some(mode => mode >= v.numModes)) throw new Error("Optical modes must be distinct, in range and match operation arity");
      if ((operation.operation === "BS") !== (operation.theta !== undefined)) throw new Error("Only a BS operation takes theta; PS angles come from phases in circuit order");
      if (operation.operation === "PS") phases++;
    }
    if (!phases || v.phases.some(row => row.length !== phases)) throw new Error("Each phase row must match the number of PS operations, with at least one PS");
  },
  resultSchema: obj({ numModes: count(), backend: { const: "MerLin QuantumLayer CPU float64" },
    basis: arr(arr(count(0), 1), 1), probabilities: arr(arr(finite(0), 1), 1),
    targetProbabilities: arr(finite(0), 1), phaseGradients: arr(arr(finite(), 1), 1),
    probabilitySums: arr(finite(0), 1), phaseConvention: { const: "radians in PS occurrence order; BS uses cos(theta/2) and i*sin(theta/2)" },
  }),
});
