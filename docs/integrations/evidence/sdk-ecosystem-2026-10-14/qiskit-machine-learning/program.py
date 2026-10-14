import json
import numpy as np
from qiskit.circuit.library import z_feature_map
from qiskit_machine_learning.kernels import FidelityStatevectorKernel
from qiskit_machine_learning.algorithms import QSVC
x = np.array([[0.0,0.1], [0.2,0.0], [2.7,2.9], [2.9,2.7]])
y = np.array([0,0,1,1])
kernel = FidelityStatevectorKernel(feature_map=z_feature_map(2, reps=1))
matrix = kernel.evaluate(x)
assert matrix.shape == (4,4)
assert np.allclose(np.diag(matrix), 1.0)
classifier = QSVC(quantum_kernel=kernel)
classifier.fit(x,y)
prediction = classifier.predict(x)
with open("result.json", "w") as f:
    json.dump({"kernel": matrix.tolist(), "trainingPredictions": prediction.tolist(), "scientificValidation": "not_evaluated"}, f)
