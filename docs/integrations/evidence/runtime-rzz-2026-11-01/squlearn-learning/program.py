import json
import numpy as np
from squlearn import Executor
from squlearn.encoding_circuit import ChebyshevPQC
from squlearn.kernel import FidelityKernel
executor = Executor("pennylane", seed=17, caching=False)
encoding = ChebyshevPQC(2, num_features=1, num_layers=1)
kernel = FidelityKernel(encoding, executor, parameter_seed=17, caching=False)
matrix = kernel.evaluate(np.array([[-0.7], [0.0], [0.6]]))
assert matrix.shape == (3,3)
assert np.allclose(np.diag(matrix), 1.0, atol=1e-10)
assert np.allclose(matrix, matrix.T, atol=1e-10)
with open("result.json", "w") as f:
    json.dump({"kernel": matrix.tolist(), "executor": "pennylane local CPU", "scientificValidation": "not_evaluated"}, f)
