import os
import sys
from pathlib import Path

os.environ["JAX_ENABLE_X64"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan


def compute(v):
    import jax
    import jax.numpy as jnp
    import numpy as np
    import dynamiqs as dq
    from scipy.integrate import solve_ivp

    jax.config.update("jax_enable_x64", True)
    x = np.array([[0., 1.], [1., 0.]], complex)
    z = np.diag([1., -1.]).astype(complex)
    lower = np.array([[0., 1.], [0., 0.]], complex)
    psi = {"ground": np.array([1., 0.]), "excited": np.array([0., 1.]), "plus": np.array([1., 1.]) / np.sqrt(2)}[v["initialState"]]
    rho0 = np.outer(psi, psi.conj()).astype(complex)
    times = np.linspace(0, v["duration"], v["steps"] + 1)
    qx, qz = dq.asqarray(jnp.asarray(x)), dq.asqarray(jnp.asarray(z))
    jump = dq.asqarray(jnp.asarray(np.sqrt(v["dampingRate"]) * lower))
    initial = dq.asqarray(jnp.asarray(rho0))

    def evolve(drive):
        h = (drive * qx + v["detuning"] * qz) / 2
        return dq.mesolve(h, [jump], initial, jnp.asarray(times), method=dq.method.Tsit5(rtol=1e-9, atol=1e-11), progress_meter=False).states.to_jax()

    def final_population(drive):
        return jnp.real(evolve(drive)[-1, 1, 1])

    # One JAX trace handles the whole amplitude batch, including derivatives.
    states = np.asarray(jax.vmap(evolve)(jnp.asarray(v["drives"], dtype=jnp.float64)))
    gradients = np.asarray(jax.vmap(jax.grad(final_population))(jnp.asarray(v["drives"], dtype=jnp.float64)))

    def reference(drive):
        h = (drive * x + v["detuning"] * z) / 2
        l = np.sqrt(v["dampingRate"]) * lower
        product = l.conj().T @ l
        def rhs(_time, flat):
            r = flat.reshape(2, 2)
            return (-1j * (h @ r - r @ h) + l @ r @ l.conj().T - (product @ r + r @ product) / 2).ravel()
        solution = solve_ivp(rhs, (0, v["duration"]), rho0.ravel(), t_eval=times, rtol=1e-10, atol=1e-12)
        if not solution.success:
            raise ValueError("Independent Lindblad reference failed to converge")
        return solution.y.T.reshape(-1, 2, 2)[:, 1, 1].real

    reference_info = reference_plan(v["referenceMode"], len(v["drives"]) <= 8 and v["steps"] <= 100,
        "Independent Lindblad integration and finite differences",
        "Automatic reference is omitted for larger sweeps; required attempts it at the requested size.")
    references = finite = None
    if reference_info["status"] == "computed":
        references = np.array([reference(drive) for drive in v["drives"]])
        delta = 1e-4
        finite = np.array([(reference(d + delta)[-1] - reference(d - delta)[-1]) / (2 * delta) for d in v["drives"]])
    populations = states[:, :, 1, 1].real
    return {"times": times.tolist(), "excitedPopulations": populations.tolist(), "reference": reference_info, "referencePopulations": references.tolist() if references is not None else None,
        "driveGradients": gradients.tolist(), "finiteDifferenceGradients": finite.tolist() if finite is not None else None,
        "maxPopulationDeviation": float(np.max(abs(populations - references))) if references is not None else None, "maxGradientDeviation": float(np.max(abs(gradients - finite))) if finite is not None else None,
        "maxTraceError": float(np.max(abs(np.trace(states, axis1=-2, axis2=-1) - 1))),
        "minimumEigenvalue": float(np.linalg.eigvalsh(states).min()),
        "model": "H=(drive X + detuning Z)/2; L=sqrt(gamma)|0><1|; hbar=1", "device": jax.default_backend()}, [
        "Time and all rates use one consistent user-chosen unit; drive and detuning are angular frequencies.",
        "Gradients are of the final excited-state population with respect to drive, holding the other inputs fixed.",
        "A small qubit model with amplitude damping only; no fitted hardware model, pulse optimisation, GPU benchmark or scientific acceptance."]


execute(compute)
