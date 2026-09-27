import { differentiableCircuitDefinition } from "../../../../src/lib/sdk-differentiable.mjs";

export const definition = differentiableCircuitDefinition({
  "name": "differentiate_pennylane_circuit",
  "source": {
    "name": "pennylane",
    "version": "0.45.1",
    "repository": "https://github.com/PennyLaneAI/pennylane"
  },
  "backend": "default.qubit (CPU)",
  "gradientMethod": "PennyLane Autograd backpropagation"
});
