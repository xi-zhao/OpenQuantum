import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const text = { type: "string", minLength: 1 };
export const definition = defineScienceTool({
  name: "prepare_qua_pulse_program",
  description: "Build a Quantum Machines QUA program and OPX configuration for sequential constant pulses on one analog output. Voltages are in volts; pulse lengths and waits are in ns on the 4 ns OPX clock. Returns actual SDK serialization and standalone QUA source. This is local program construction, not QOP compilation, waveform simulation or hardware execution.",
  source: { name: "qm-qua", version: "1.4.1", repository: "https://github.com/qm-labs/qm-qua-sdk-public" },
  inputSchema: obj({
    pulses: { ...arr(obj({ amplitudeVolts: { ...finite(), minimum: -0.5, maximum: 0.5 }, durationNs: { ...count(16), multipleOf: 4 }, waitAfterNs: { ...count(0, 0), multipleOf: 4 } }), 1), default: [{ amplitudeVolts: 0.2, durationNs: 40, waitAfterNs: 16 }] },
    repetitions: { ...count(1, 1), maximum: 2147483647 },
  }),
  checkInput(v) {
    for (const p of v.pulses) {
      if (p.amplitudeVolts >= 0.5) throw new Error("OPX analog amplitude must be less than 0.5 V");
      if (p.waitAfterNs > 0 && p.waitAfterNs < 16) throw new Error("OPX waitAfterNs must be zero or at least 16 ns (4 clock cycles)");
    }
  },
  resultSchema: obj({ quaSource: text, configurationJson: text, programBase64: text, programBytes: count(), pulsesPerRepetition: count(), nominalDurationNs: count(), networkUsed: { const: false }, hardwareExecuted: { const: false } }),
});
