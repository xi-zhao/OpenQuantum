import json
import numpy as np
import piquasso as pq
with pq.Program() as program:
    pq.Q() | pq.StateVector([1, 1])
    pq.Q(0, 1) | pq.Beamsplitter(theta=np.pi/4)
state = pq.PureFockSimulator(d=2, config=pq.Config(cutoff=3)).execute(program).state
probabilities = [float(state.get_particle_detection_probability(x)) for x in [(2,0),(1,1),(0,2)]]
assert np.allclose(probabilities, [0.5, 0, 0.5], atol=1e-10)
with open("result.json", "w") as f:
    json.dump({"outputStates": [[2,0],[1,1],[0,2]], "probabilities": probabilities, "scientificValidation": "not_evaluated"}, f)
