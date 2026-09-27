"""TensorCircuit exact contraction with JAX CPU reverse-mode derivatives."""
from pathlib import Path
import os
import sys
os.environ["JAX_PLATFORMS"] = "cpu"
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_differentiable import check_representation, format_result


def compute(value):
    import jax
    jax.config.update("jax_enable_x64", True)
    import jax.numpy as jnp
    import tensorcircuit as tc
    import numpy as np
    check_representation(value)
    tc.set_backend("jax")
    tc.set_dtype("complex128")
    trainable = {index: column for column, index in enumerate(value["trainableGateIndices"])}
    parameters = jnp.array([value["gates"][i]["angle"] for i in value["trainableGateIndices"]], dtype=jnp.float64)

    def circuit(params):
        model = tc.Circuit(value["numQubits"])
        for index, item in enumerate(value["gates"]):
            operation = getattr(model, "cnot" if item["gate"] == "CX" else item["gate"].lower())
            if item["gate"] in ["RX", "RY", "RZ"]:
                angle = params[trainable[index]] if index in trainable else item["angle"]
                operation(*item["targets"], theta=angle)
            else:
                operation(*item["targets"])
        return model

    def expectations(params):
        model = circuit(params)
        return jnp.stack([jnp.real(model.expectation_ps(**{
            letter.lower(): [wire for wire, symbol in enumerate(word) if symbol == letter]
            for letter in "XYZ"
        })) for word in value["observables"]])

    means = expectations(parameters)
    jacobian = jax.jacrev(expectations)(parameters) if trainable else np.empty((len(means), 0))
    return format_result(value, circuit(parameters).state(), means, jacobian,
                         "TensorCircuit contraction with JAX CPU complex128", "JAX reverse-mode autodifferentiation")


if __name__ == "__main__":
    execute(compute)
