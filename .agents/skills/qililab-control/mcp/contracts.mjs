import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "compile_qililab_pulses",
  description: "Compile a structured sequence of Qililab square I/Q pulses and waits into one Qblox sequencer program using the real Qililab compiler. Durations are integer ns on the 4 ns instruction grid; amplitudes are normalized DAC values. Returns Q1ASM and waveform tables without creating a platform, opening instruments or running hardware.",
  source: { name: "qililab", version: "0.33.3", repository: "https://github.com/qilimanjaro-tech/qililab" },
  inputSchema: obj({ pulses: { ...arr(obj({
    iAmplitude: { ...finite(-1), maximum: 1 }, qAmplitude: { ...finite(-1, 0), maximum: 1 },
    durationNs: { ...count(4), multipleOf: 4 }, waitAfterNs: { ...count(0, 0), multipleOf: 4 },
  }), 1), default: [{ iAmplitude: 0.2, qAmplitude: 0, durationNs: 40, waitAfterNs: 16 }] } }),
  resultSchema: obj({
    program: { type: "string", minLength: 1 }, sequenceJson: { type: "string", minLength: 1 },
    waveforms: arr(obj({ name: { type: "string", minLength: 1 }, index: count(0), samples: arr(finite(), 1) }), 1),
    requestedDurationNs: count(), sampleRateHz: { const: 1e9 },
    networkUsed: { const: false }, hardwareExecuted: { const: false },
  }),
});
