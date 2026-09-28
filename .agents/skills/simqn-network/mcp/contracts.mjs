import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { finiteSchema as finite, countSchema as count } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "simulate_simqn_link",
  description: "Simulate independent transmissions of Werner entanglement over one SimQN quantum link with constant delay, loss and distance-dependent decoherence. Seconds and metres; no network access, hardware, routing or QKD key generation. Explicit dependency preparation required.",
  source: { name: "SimQN (qns)", version: "0.2.3", repository: "https://github.com/QNLab-USTC/SimQN" },
  inputSchema: obj({
    attempts: count(1, 10), intervalSeconds: finite(0, 0.01), delaySeconds: finite(0, 0.005),
    dropProbability: { type: "number", minimum: 0, maximum: 1, default: 0 },
    initialFidelity: { type: "number", minimum: 0, maximum: 1, default: 0.9 },
    lengthMeters: finite(0, 1000), decoherencePerMeter: finite(0, 0),
    timeSlotsPerSecond: count(1, 1000000000),
    seed: { type: "integer", minimum: 0, maximum: 4294967295, default: 7 },
  }),
  checkInput(v) {
    const end = (v.attempts - 1) * v.intervalSeconds + v.delaySeconds + 2 / v.timeSlotsPerSecond;
    if (!Number.isFinite(end) || end * v.timeSlotsPerSecond > Number.MAX_SAFE_INTEGER) throw new Error("Simulated time must have a finite, safely representable tick count");
    if (!Number.isFinite(v.lengthMeters * v.decoherencePerMeter)) throw new Error("Distance times decoherence must be finite");
  },
  resultSchema: obj({
    transmitted: count(), received: count(0), dropped: count(0), deliveryFraction: { type: "number", minimum: 0, maximum: 1 },
    arrivals: arr(obj({ attempt: count(0), timeSeconds: finite(0), fidelity: finite(0) }), 0),
    simulatedDurationSeconds: finite(0), eventCount: count(0),
    model: { const: "independent Werner-state transmissions; unlimited bandwidth; no memories or swapping" },
  }),
});
