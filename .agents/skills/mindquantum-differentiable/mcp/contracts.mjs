import { differentiableCircuitDefinition } from "../../../../src/lib/sdk-differentiable.mjs";

export const definition = differentiableCircuitDefinition({
  "name": "differentiate_mindquantum_circuit",
  "source": {
    "name": "mindquantum",
    "version": "0.12.0",
    "repository": "https://github.com/mindspore-ai/mindquantum"
  },
  "backend": "mqvector CPU complex128",
  "gradientMethod": "MindQuantum adjoint expectation gradient"
});
