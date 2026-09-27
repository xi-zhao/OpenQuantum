import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";
import { analogControls, analogResult, checkPositions } from "../../../../src/lib/sdk-devices.mjs";
export const definition = defineScienceTool({
  name: "simulate_pulser_rydberg",
  description: "Construct a real Pulser Sequence and simulate a global Rydberg drive on a 2D fixed atom register with local QuTiP. Each pulse has linear amplitude/detuning endpoints and constant phase. Durations are integer ns; angular frequencies rad/us; positions um. Return raw state amplitudes and site populations. No cloud/QPU or hardware constraints; fixed Rb70S C6. Explicit setup required.",
  source: { name: "pulser-core + pulser-simulation", version: "1.9.1", repository: "https://github.com/pasqal-io/Pulser" },
  inputSchema: obj({ atomPositionsUm: { ...arr(arr(finite(), 2, 2), 1), default: [[0, 0], [7, 0]] },
    pulses: { ...arr(obj({ durationNs: count(1), amplitudeRadPerUs: arr(finite(0), 2, 2), detuningRadPerUs: arr(finite(), 2, 2), phaseRad: finite() }), 1), default: [
      { durationNs: 500, amplitudeRadPerUs: [0, 4], detuningRadPerUs: [0, 0], phaseRad: 0 },
      { durationNs: 500, amplitudeRadPerUs: [4, 0], detuningRadPerUs: [0, 0], phaseRad: 0 },
    ] }, ...analogControls }),
  checkInput(v) {
    checkPositions(v.atomPositionsUm);
    const total = v.pulses.reduce((sum, pulse) => sum + pulse.durationNs, 0);
    if (!Number.isSafeInteger(total) || total < 4) throw new Error("Pulser simulation requires a representable total duration of at least 4 ns");
    for (const p of v.pulses) if (p.durationNs === 1 && (p.amplitudeRadPerUs[0] !== p.amplitudeRadPerUs[1] || p.detuningRadPerUs[0] !== p.detuningRadPerUs[1])) throw new Error("A one-sample pulse cannot encode unequal linear endpoints");
  },
  resultSchema: obj(analogResult),
});
