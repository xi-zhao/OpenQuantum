import { differentiableCircuitDefinition } from "../../../../src/lib/sdk-differentiable.mjs";

export const definition = differentiableCircuitDefinition({
  "name": "differentiate_tensorcircuit_circuit",
  "source": {
    "name": "tensorcircuit",
    "version": "0.12.0",
    "repository": "https://github.com/tencent-quantum-lab/tensorcircuit"
  },
  "backend": "TensorCircuit contraction with JAX CPU complex128",
  "gradientMethod": "JAX reverse-mode autodifferentiation"
});
