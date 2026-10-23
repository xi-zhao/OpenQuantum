import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const positive = { ...finite(0), exclusiveMinimum: 0 };
const text = { type: "string", minLength: 1 };
export const definition = defineScienceTool({
  name: "compile_laboneq_pulses",
  description: "Compile sequential constant or Gaussian pulses for a standalone Zurich Instruments HDAWG RF channel using LabOne Q in emulation mode. Input lengths and delays are seconds, amplitude is normalized to the configured output range. Returns compiled sequencer code, compiler timing, and the SDK output waveform snippet. Emulation connects to no instrument and models instrument output signals, not quantum state dynamics.",
  source: { name: "laboneq", version: "26.7.0", repository: "https://github.com/zhinst/laboneq" },
  inputSchema: obj({
    pulses: { ...arr(obj({ shape: { enum: ["constant", "gaussian"] }, amplitude: { ...finite(), minimum: -1, maximum: 1 }, lengthSeconds: positive, delayAfterSeconds: finite(0, 0) }), 1), default: [{ shape: "constant", amplitude: 0.2, lengthSeconds: 80e-9, delayAfterSeconds: 40e-9 }] },
    repetitions: { ...count(1, 1), maximum: 2147483647 },
    snippetStartSeconds: finite(0, 0), snippetLengthSeconds: { ...positive, default: 1e-6 },
  }),
  resultSchema: obj({
    sequencers: arr(obj({ filename: text, source: text }), 1), totalExecutionSeconds: finite(0),
    timeSeconds: arr(finite()), real: arr(finite()), imag: arr(finite()),
    sampleRateHz: { const: 2400000000 }, networkUsed: { const: false }, hardwareExecuted: { const: false }, simulationKind: { const: "instrument-output-waveforms" },
  }),
});
