import { differentiableCircuitDefinition } from "../../../../src/lib/sdk-differentiable.mjs";

export const definition = differentiableCircuitDefinition({
  "name": "differentiate_deepquantum_circuit",
  "source": {
    "name": "deepquantum",
    "version": "4.5.0",
    "repository": "https://github.com/TuringQ/deepquantum"
  },
  "backend": "QubitCircuit state vector (CPU)",
  "gradientMethod": "PyTorch reverse-mode autodifferentiation"
});
