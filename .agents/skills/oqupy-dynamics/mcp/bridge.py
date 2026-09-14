import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    import oqupy
    x = np.array([[0, 1], [1, 0]], complex)
    y = np.array([[0, -1j], [1j, 0]], complex)
    z = np.diag([1., -1.]).astype(complex)
    psi = {"ground": np.array([1., 0.]), "excited": np.array([0., 1.]), "plus": np.array([1., 1.]) / np.sqrt(2)}[v["initialState"]]
    initial = np.outer(psi, psi.conj())
    system = oqupy.System((v["tunneling"] * x + v["bias"] * z) / 2)
    bath = oqupy.Bath(z / 2, oqupy.PowerLawSD(alpha=v["alpha"], zeta=1, cutoff=v["cutoff"], cutoff_type="exponential", temperature=v["temperature"]))
    dt = v["duration"] / v["steps"]
    parameters = oqupy.TempoParameters(dt=dt, dkmax=v["memorySteps"], epsrel=1e-7)
    # TEMPO 0.5.0 floors end_time/dt. One upward ULP prevents a requested
    # integer step count (e.g. 0.1 / (0.1 / 11)) from rounding just below it.
    end_time = np.nextafter(v["duration"], np.inf)
    if int(end_time / dt) != v["steps"]:
        raise ValueError("Cannot represent the requested TEMPO step count")
    dynamics = oqupy.tempo_compute(system, bath, initial, start_time=0., end_time=end_time, parameters=parameters, progress_type="silent")
    states = np.asarray(dynamics.states)
    times = np.asarray(dynamics.times)
    if len(times) != v["steps"] + 1 or abs(times[-1] - v["duration"]) > 1e-9:
        raise ValueError("OQuPy returned a time grid outside the requested duration")
    bloch = np.array([[np.trace(r @ op).real for op in [x, y, z]] for r in states])
    return {"times": times.tolist(), "bloch": bloch.tolist(), "maxTraceError": float(np.max(abs(np.trace(states, axis1=1, axis2=2) - 1))),
        "minimumEigenvalue": float(np.linalg.eigvalsh(states).min()), "memoryTime": dt * v["memorySteps"], "timestep": dt,
        "relativeSvdTolerance": 1e-7, "model": "H=(tunneling X+bias Z)/2; bath coupling Z/2; J(w)=2 alpha w exp(-w/cutoff); hbar=kB=1"}, [
        "Initially factorized qubit and thermal Gaussian bath; ground/excited label the Z computational basis, not the interacting equilibrium state.",
        "TEMPO uses finite timestep, finite bath memory and SVD truncation; repeat with smaller timestep at fixed physical memory, and separately increase memory, before interpreting convergence.",
        "The SVD tolerance is not a bound on physical observable error; no convergence or scientific acceptance is declared."]


execute(compute)
