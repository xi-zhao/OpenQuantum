import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, tensor_product


def compute(v):
    import numpy as np
    from scipy.integrate import solve_ivp
    from mqt.yaqs import AnalogSimParams, Hamiltonian, NoiseModel, Observable, Simulator, State
    n = v["numQubits"]
    parameters = AnalogSimParams(observables=[Observable("z", sites=i) for i in range(n)],
        elapsed_time=v["duration"], dt=v["duration"] / v["steps"], num_traj=v["trajectories"],
        max_bond_dim=v["maxBondDimension"], svd_threshold=1e-10, krylov_tol=1e-10,
        random_seed=v["seed"], order=2)
    # YAQS uses arange(T+dt), which can add an unwanted step due to rounding.
    parameters.times = np.linspace(0., v["duration"], v["steps"] + 1)
    noise = NoiseModel([{"name": "lowering", "sites": [i], "strength": v["dampingRate"]} for i in range(n)]) if v["dampingRate"] else None
    run = Simulator(parallel=False, show_progress=False).run(State(length=n, initial="zeros"),
        Hamiltonian.ising(length=n, J=v["coupling"], g=v["field"]), parameters, noise)
    z = np.diag([1., -1.]); x = np.array([[0., 1.], [1., 0.]])
    def site(operator, index):
        return tensor_product([operator if i == index else np.eye(2) for i in range(n)])
    zs = [site(z, i) for i in range(n)]
    h = -v["coupling"] * sum(zs[i] @ zs[i+1] for i in range(n-1)) - v["field"] * sum(site(x, i) for i in range(n))
    jumps = [np.sqrt(v["dampingRate"]) * site(np.array([[0.,1.],[0.,0.]]), i) for i in range(n)]
    products = [j.conj().T @ j for j in jumps]
    dim = 2**n
    rho = np.zeros((dim, dim), complex); rho[0,0] = 1.
    def derivative(_time, flat):
        r = flat.reshape(dim,dim)
        dr = -1j*(h @ r - r @ h)
        for j, jj in zip(jumps, products):
            dr += j @ r @ j.conj().T - (jj @ r + r @ jj)/2
        return dr.ravel()
    times = np.asarray(run.times)
    if len(times) != v["steps"] + 1 or not np.isclose(times[-1], v["duration"], atol=1e-12, rtol=0):
        raise ValueError("YAQS returned a time grid outside the requested duration")
    reference = solve_ivp(derivative, (0.,float(times[-1])), rho.ravel(), t_eval=times, rtol=1e-9, atol=1e-11)
    if not reference.success:
        raise ValueError("Dense Lindblad reference did not converge")
    matrices = reference.y.T.reshape(-1,dim,dim)
    ref_z = np.array([[np.trace(r @ op).real for r in matrices] for op in zs])
    values = np.asarray(run.expectation_values)
    trajectory_count = int(run.trajectories[0].shape[0])
    sem = np.array([np.std(t, axis=0, ddof=1)/np.sqrt(trajectory_count) for t in run.trajectories]).real if trajectory_count > 1 else np.zeros_like(values)
    return {"times": times.tolist(), "siteZ": values.tolist(), "referenceSiteZ": ref_z.tolist(),
        "standardErrors": sem.tolist(), "maxAbsoluteDeviation": float(np.max(np.abs(values-ref_z))),
        "effectiveTrajectories": trajectory_count,
        "hamiltonian": "-J sum Z_i Z_(i+1) - g sum X_i; hbar=1",
        "jumpOperator": "sqrt(gamma) |0><1| at every site",
        "referenceTraceError": float(max(abs(np.trace(r)-1) for r in matrices))}, [
        "All times and rates use one consistent user-chosen unit with hbar=1; initial state is |0...0>.",
        "Standard errors describe finite-trajectory sampling only; time-step and tensor truncation bias remain.",
        "This small-chain comparison does not reproduce large-system performance or establish scientific acceptance."]


execute(compute)
