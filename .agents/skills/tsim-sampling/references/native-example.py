import json
import numpy as np
import tsim
program = tsim.Circuit("X 0\nM 0\nDETECTOR rec[-1]")
sampler = program.compile_detector_sampler()
actual = sampler.sample(shots=12)
relative = sampler.sample(shots=12, use_detector_reference_sample=True, use_observable_reference_sample=True)
assert np.all(actual)
assert not np.any(relative)
with open("result.json", "w") as f:
    json.dump({"actualDetectorValues": np.asarray(actual).tolist(), "relativeFlips": np.asarray(relative).tolist(), "scientificValidation": "not_evaluated"}, f)
