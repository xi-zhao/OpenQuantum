import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "schedule_qblox_pulses",
  description: "Build a Qblox Scheduler baseband square-pulse train, resolve relative timing with its offline timing pass, and sample each pulse with the SDK waveform generator. Durations/gaps are seconds; amplitudes are dimensionless. Returns an SDK schedule and envelope samples, not hardware Q1ASM compilation or qubit dynamics.",
  source: { name: "qblox-scheduler", version: "1.0.0b8", repository: "https://gitlab.com/qblox/packages/software/qblox-scheduler" },
  inputSchema: obj({
    pulses: { ...arr(obj({ amplitude: finite(), durationSeconds: { ...finite(0), exclusiveMinimum: 0 }, gapAfterSeconds: finite(0, 0) }), 1), default: [{ amplitude: 0.2, durationSeconds: 40e-9, gapAfterSeconds: 16e-9 }, { amplitude: -0.1, durationSeconds: 24e-9, gapAfterSeconds: 0 }] },
    repetitions: count(1, 1),
    sampleRateHz: { ...finite(0, 1e9), exclusiveMinimum: 0 },
  }),
  resultSchema: obj({
    scheduleJson: { type: "string", minLength: 1 },
    durationSeconds: finite(0),
    pulses: arr(obj({ index: count(0), startSeconds: finite(0), durationSeconds: finite(0), sampleRateHz: finite(0), samples: arr(finite(), 1) }), 1),
    networkUsed: { const: false }, hardwareExecuted: { const: false },
  }),
});
