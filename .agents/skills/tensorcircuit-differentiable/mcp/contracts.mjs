import { differentiableCircuitDefinition } from "../../../../src/lib/sdk-differentiable.mjs";

export const definition = differentiableCircuitDefinition({
  "name": "differentiate_tensorcircuit_circuit",
  "source": {
    "name": "tensorcircuit-ng",
    "version": "1.10.0",
    "repository": "https://github.com/tensorcircuit/tensorcircuit-ng"
  },
  "backend": "TensorCircuit-NG contraction with JAX CPU complex128",
  "gradientMethod": "JAX reverse-mode autodifferentiation"
});
