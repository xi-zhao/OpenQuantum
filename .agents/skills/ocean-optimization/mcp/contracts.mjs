import { defineScienceTool, objectSchema as obj, arraySchema as arr, integerSchema as int } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const pair = obj({ i: count(0), j: count(0), bias: finite() });
const model = obj({ linear: arr(finite(), 1), quadratic: arr(pair, 0), offset: finite() });
export const definition = defineScienceTool({
  name: "sample_ocean_model",
  description: "Construct a user-defined binary or spin quadratic model with D-Wave Ocean dimod, convert between QUBO and Ising, and sample locally with ExactSolver or dwave-samplers simulated annealing. Classical CPU computation only; no Leap or quantum annealing hardware. Exact mode enumerates 2^N configurations. Requires explicitly prepared dependencies.",
  source: { name: "dimod + dwave-samplers", version: "0.12.22 + 1.8.0", repository: "https://github.com/dwavesystems/dimod" },
  inputSchema: obj({
    vartype: { type: "string", enum: ["BINARY", "SPIN"], default: "BINARY" },
    linear: { ...arr(finite(), 1), default: [-1, -1] },
    quadratic: { ...arr(pair, 0), default: [{ i: 0, j: 1, bias: 2 }] },
    offset: finite(undefined, 0),
    method: { type: "string", enum: ["exact", "simulated_annealing"], default: "exact" },
    numReads: count(1, 100), numSweeps: count(1, 1000), seed: int(0, 2147483647, 17),
  }),
  checkInput(v) {
    const seen = new Set();
    for (const { i, j } of v.quadratic) {
      if (i >= v.linear.length || j >= v.linear.length || i === j) throw new Error("Quadratic indices must be distinct and in range; put one-variable terms in linear");
      const key = [i, j].sort((a, b) => a - b).join(",");
      if (seen.has(key)) throw new Error("Duplicate quadratic pair");
      seen.add(key);
    }
  },
  resultSchema: obj({
    vartype: { type: "string", enum: ["BINARY", "SPIN"] },
    samples: arr(obj({ values: arr(int(-1, 1), 1), energy: finite(), numOccurrences: count() }), 1),
    binaryModel: model, spinModel: model,
    minimumEnergyFound: finite(), exhaustive: { type: "boolean" },
    backend: { type: "string", enum: ["dimod.ExactSolver", "dwave.samplers.SimulatedAnnealingSampler"] },
  }),
});
