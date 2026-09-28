"""Pinned MrMustard Gaussian operations with explicit Fock truncation reporting."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from mrmustard import settings
    from mrmustard.lab import Vacuum, Dgate, Sgate, Rgate, BSgate, S2gate, Attenuator

    if settings.HBAR != 2.0:
        raise ValueError("This adapter requires MrMustard's default HBAR=2")
    state = Vacuum(v["numModes"])
    constructors = {"D": Dgate, "S": Sgate, "R": Rgate, "BS": BSgate, "S2": S2gate, "LOSS": Attenuator}
    for operation in v["operations"]:
        kwargs = {key: value for key, value in operation.items() if key not in ["operation", "modes"]}
        if operation["operation"] == "R":
            kwargs["angle"] = kwargs.pop("theta")
        gate = constructors[operation["operation"]](**kwargs)[operation["modes"]]
        state = state >> gate
    probabilities = np.asarray(state.fock_probabilities([v["cutoff"]] * v["numModes"]), dtype=float)
    return {
        "numModes": v["numModes"], "cutoff": v["cutoff"], "hbar": 2,
        "quadratureOrder": "x0,...,xN-1,p0,...,pN-1",
        "means": np.asarray(state.means).tolist(), "covariance": np.asarray(state.cov).tolist(),
        "meanPhotons": np.asarray(state.number_means).tolist(),
        "fockProbabilities": [{"occupation": list(index), "probability": float(probabilities[index])} for index in np.ndindex(probabilities.shape)],
        "retainedProbability": float(probabilities.sum()),
    }, [
        "Gaussian phase-space moments do not use the Fock cutoff; Fock probabilities include occupations 0 through cutoff-1 in every mode and are not renormalized.",
        "Retained probability reports the truncated mass, subject to floating-point error; increase cutoff to assess truncation convergence. Output size grows as cutoff**numModes.",
        "This pinned compatibility adapter uses MrMustard 0.7.3. The upstream repository was archived on 2026-07-29.",
        "Only vacuum preparation, Gaussian gates and pure attenuation are exposed, without optimization, non-Gaussian states or measurement conditioning.",
    ]


if __name__ == "__main__":
    execute(compute)
