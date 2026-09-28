import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

export const definition = defineScienceTool({
  name: "compile_oqc_qat_pulses",
  description: "Build OQC QAT low-level square/Gaussian pulse instructions, resolve their sample timeline and evaluate complex baseband buffers using the offline EchoEngine. Durations and sigma are ns on a fixed 1 ns model; phases are radians. This returns compiler waveform buffers, not quantum-state simulation or QCaaS execution.",
  source: { name: "qat-compiler", version: "3.5.0", repository: "https://github.com/oqc-community/qat" },
  inputSchema: obj({ pulses: { ...arr(obj({
    shape: { enum: ["square", "gaussian"], default: "square" }, amplitude: finite(),
    phaseRadians: finite(-Number.MAX_VALUE, 0), durationNs: count(), sigmaNs: { ...finite(0, 4), exclusiveMinimum: 0 },
    waitAfterNs: count(0, 0),
  }), 1), default: [{ shape: "square", amplitude: 0.2, phaseRadians: 0, durationNs: 40, sigmaNs: 4, waitAfterNs: 16 }] } }),
  resultSchema: obj({
    instructions: arr({ type: "string", minLength: 1 }, 1),
    timeline: arr(obj({ kind: { enum: ["pulse", "wait"] }, startSample: count(0), endSample: count(1) }), 1),
    sampleRateHz: { const: 1e9 }, real: arr(finite(), 1), imag: arr(finite(), 1),
    durationNs: count(), networkUsed: { const: false }, hardwareExecuted: { const: false },
  }),
});
