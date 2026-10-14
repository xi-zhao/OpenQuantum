import json
import jax
jax.config.update("jax_enable_x64", True)
import jaxquantum as jqt
import numpy as np
state = jqt.basis(5, 2)
a = jqt.destroy(5)
number = a.dag() @ a
mean = float(np.real(jqt.overlap(number, state.to_dm())))
assert abs(mean - 2) < 1e-10
assert np.isclose(np.asarray(state.to_dm().tr()).real, 1.0)
with open("result.json", "w") as f:
    json.dump({"occupation": mean, "densityMatrix": [[[float(v.real),float(v.imag)] for v in row] for row in np.asarray(state.to_dm().data)], "scientificValidation": "not_evaluated"}, f)
