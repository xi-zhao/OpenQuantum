import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, tensor_product


def compute(v):
    import numpy as np
    from tenpy.models.spins import SpinChain
    from tenpy.networks.mps import MPS
    from tenpy.algorithms import dmrg
    n = v["numSites"]
    model = SpinChain({"L": n, "S": 0.5, "Jx": v["jx"], "Jy": v["jy"], "Jz": v["jz"],
        "hx": v["hx"], "hz": v["hz"], "bc_MPS": "finite", "conserve": None})
    psi = MPS.from_product_state(model.lat.mps_sites(), ["up" if i%2==0 else "down" for i in range(n)], bc="finite", unit_cell_width=n)
    engine = dmrg.TwoSiteDMRGEngine(psi, model, {"mixer": True, "max_sweeps": v["maxSweeps"],
        "min_sweeps": 1, "N_sweeps_check": 1, "max_E_err": 1e-10,
        "trunc_params": {"chi_max": v["maxBondDimension"], "svd_min": 1e-12}})
    energy, psi = engine.run()
    sx = np.array([[0,1],[1,0]])/2
    sy = np.array([[0,-1j],[1j,0]])/2
    sz = np.diag([1.,-1.])/2
    def site(op, index):
        return tensor_product([op if i==index else np.eye(2) for i in range(n)])
    # Construct the reference from the stated spin convention, without the TeNPy MPO.
    h = np.zeros((2**n, 2**n), complex)
    for i in range(n):
        h -= v["hx"]*site(sx,i) + v["hz"]*site(sz,i)
    for i in range(n-1):
        for strength, op in [(v["jx"],sx),(v["jy"],sy),(v["jz"],sz)]:
            h += strength*tensor_product([op if j in (i,i+1) else np.eye(2) for j in range(n)])
    exact = float(np.linalg.eigvalsh(h)[0])
    return {"energy": float(energy), "exactGroundEnergy": exact, "energyError": float(energy)-exact,
        "siteSz": psi.expectation_value("Sz").real.tolist(), "entropy": psi.entanglement_entropy().tolist(),
        "maxBondDimensionUsed": int(max(psi.chi)), "normError": float(abs(psi.overlap(psi)-1)),
        "sweeps": int(engine.sweeps),
        "hamiltonian": "sum (Jx Sx_i Sx_j + Jy Sy_i Sy_j + Jz Sz_i Sz_j) - sum (hx Sx_i + hz Sz_i); S=Pauli/2; open chain"}, [
        "Finite open chains only, S=1/2; energy units are those of the supplied couplings.",
        "A limited-bond, limited-sweep DMRG run may remain above the ground state; inspect energyError.",
        "Dense diagonalization is a small-system reference, not evidence for large-system convergence or central acceptance."]


execute(compute)
