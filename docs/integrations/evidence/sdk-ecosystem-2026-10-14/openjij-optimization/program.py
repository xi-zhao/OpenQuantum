import json
import openjij as oj
response = oj.SASampler().sample_ising({0: -0.73, 1: 0.19}, {(0, 1): -0.31}, num_reads=12, num_sweeps=100, seed=17)
for row in response.data():
    s = row.sample
    expected = -0.73*s[0] + 0.19*s[1] - 0.31*s[0]*s[1]
    assert abs(row.energy - expected) < 1e-12
with open("result.json", "w") as f:
    json.dump({"sample": {str(k): int(v) for k,v in response.first.sample.items()}, "energy": float(response.first.energy), "method": "classical SA", "scientificValidation": "not_evaluated"}, f)
