import { createHash } from "node:crypto";
import { definition } from "../../.agents/skills/pennylane-differentiable/mcp/contracts.mjs";

// Analytic RY(theta)-GHZ data for delivery tests; not evidence of an SDK run.
export function scienceResultFixture(numQubits = 12) {
  const input = definition.normalize(definition.tool.name, {
    numQubits,
    gates: [{ gate: "RY", targets: [0], angle: 0.4 }, ...Array.from({ length: numQubits - 1 }, (_, index) => ({ gate: "CX", targets: [0, index + 1] }))],
    observables: ["Z" + "I".repeat(numQubits - 1), "X".repeat(numQubits)],
    trainableGateIndices: [0],
  });
  const amplitudes = Array.from({ length: 2 ** numQubits }, () => [0, 0]);
  amplitudes[0][0] = Math.cos(0.2);
  amplitudes.at(-1)[0] = Math.sin(0.2);
  return {
    schemaVersion: "1.0", source: definition.source, input,
    inputSha256: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    dependencyLockSha256: "a".repeat(64),
    result: {
      numQubits, amplitudes, probabilities: amplitudes.map(([real, imag]) => real ** 2 + imag ** 2),
      stateNormSquared: Math.cos(0.2) ** 2 + Math.sin(0.2) ** 2,
      expectations: [Math.cos(0.4), Math.sin(0.4)], jacobian: [[-Math.sin(0.4)], [Math.cos(0.4)]],
      trainableGateIndices: [0],
      bitOrder: definition.tool.outputSchema.properties.result.properties.bitOrder.const,
      angleUnit: "rad", backend: definition.tool.outputSchema.properties.result.properties.backend.const,
      gradientMethod: definition.tool.outputSchema.properties.result.properties.gradientMethod.const,
    },
    scientificValidation: "not_evaluated", limitations: ["Analytic delivery fixture only; no SDK or scientific Acceptance was executed."],
  };
}

export const scienceToolResponse = value => ({ content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value });
