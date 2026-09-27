import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const positive = (value) => ({ ...finite(0, value), exclusiveMinimum: 0 });
const position = arr(finite(), 2, 2);
const probability = { type: "number", minimum: 0 };
export const definition = defineScienceTool({
  name: "simulate_bloqade_analog",
  description: "Evolve a user-defined 2D Rydberg atom array with Bloqade Analog's local Python emulator. Global Rabi amplitude, detuning and phase are piecewise linear on common time segments. Start in all-ground state; return site populations, final complex amplitudes and numerical state-vector probabilities. Coordinates use um, durations us, angular frequencies rad/us and phase rad. Full Hilbert space; no blockade truncation, cloud submission or hardware calibration. Requires explicitly prepared dependencies.",
  source: { name: "bloqade-analog", version: "0.16.9", repository: "https://github.com/QuEraComputing/bloqade-analog" },
  inputSchema: obj({
    atomPositionsUm: { ...arr(position, 1), default: [[0, 0], [6, 0]] },
    durationsUs: { ...arr(positive(), 1), default: [0.5, 0.5] },
    rabiRadPerUs: { ...arr(finite(0), 2), default: [0, 5, 0] },
    detuningRadPerUs: { ...arr(finite(), 2), default: [-5, 0, 5] },
    phaseRad: { ...arr(finite(), 2), default: [0, 0, 0] },
    timeSteps: count(1, 20),
    atol: positive(1e-9),
    rtol: positive(1e-9),
  }),
  checkInput(v) {
    const duration = v.durationsUs.reduce((sum, dt) => sum + dt, 0);
    if (!Number.isFinite(duration)) throw new Error("Total duration must be finite");
    for (const key of ["rabiRadPerUs", "detuningRadPerUs", "phaseRad"]) {
      if (v[key].length !== v.durationsUs.length + 1) throw new Error(`${key} needs one value at every segment endpoint`);
    }
    const seen = new Set();
    for (const [x, y] of v.atomPositionsUm) {
      const key = `${x},${y}`;
      if (seen.has(key)) throw new Error("Atom positions must be distinct");
      seen.add(key);
    }
  },
  resultSchema: obj({
    timesUs: arr(finite(0), 2),
    rydbergPopulations: arr(arr(probability, 1), 2),
    finalOutcomes: arr(obj({ bits: { type: "string", pattern: "^[01]+$" }, probability, amplitude: arr(finite(), 2, 2) }), 2),
    maxNormError: finite(0),
    atomCount: count(),
    hilbertDimension: count(2),
    c6RadPerUsUm6: { const: 2 * Math.PI * 862690 },
    backend: { const: "bloqade.analog Python emulator" },
    bitOrder: { const: "leftmost bit is atomPositionsUm[0]; 0=ground, 1=Rydberg" },
    model: { type: "string", minLength: 1 },
    units: obj({ position: { const: "um" }, time: { const: "us" }, angularFrequency: { const: "rad/us" }, phase: { const: "rad" } }),
  }),
});
