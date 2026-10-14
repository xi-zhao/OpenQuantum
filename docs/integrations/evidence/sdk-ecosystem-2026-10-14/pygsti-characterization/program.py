import json
import pygsti
from pygsti.modelpacks import smq1Q_XYI
model = smq1Q_XYI.target_model()
program = pygsti.circuits.Circuit([("Gxpi2", 0), ("Gxpi2", 0)], line_labels=(0,))
probabilities = model.probabilities(program)
assert abs(float(probabilities[("1",)]) - 1) < 1e-12
data = pygsti.data.DataSet(outcome_labels=[("0",),("1",)])
data.add_count_dict(program, {("0",): 2, ("1",): 98})
data.done_adding_data()
assert data[program].total == 100
with open("result.json", "w") as f:
    json.dump({"idealProbabilities": {str(k): float(v) for k,v in probabilities.items()}, "syntheticCounts": {"0": 2, "1": 98}, "scientificValidation": "not_evaluated"}, f)
