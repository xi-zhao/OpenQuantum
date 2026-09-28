"""Baidu's local simulator called in process; no QEnv.commit or cloud backend."""
import os
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute
from sdk_expansion_circuits import check_statevector_representation, statevector_result, UNITARY_LIMITATIONS


def compute(v):
    n = v["numQubits"]
    check_statevector_representation(n)
    # This backend represents n qubits as an n-dimensional NumPy 1.x tensor.
    import numpy as np
    if n > np.MAXDIMS:
        raise ValueError("QCompute's NumPy tensor representation supports at most MAXDIMS axes")
    os.environ["OUTPUTPATH"] = str(ROOT / ".openquantum/cache/qcompute-simulation")
    import QCompute as qc
    from QCompute.Define import Settings
    from QCompute.OpenSimulator.local_baidu_sim2.Simulator import runSimulator
    Settings.outputInfo = False
    Settings.inProcessSimulator = True
    env = qc.QEnv()
    env.backend(qc.BackendName.LocalBaiduSim2)
    register = env.Q.createList(n)
    # Touch idle registers so publication retains their positions.
    for q in register:
        qc.ID(q)
    for item in v["gates"]:
        gate = getattr(qc, item["gate"])
        if "angle" in item:
            gate = gate(item["angle"])
        gate(*[register[q] for q in item["targets"]])
    # OutputState requires terminal measurement metadata but does not collapse state.
    qc.MeasureZ(*env.Q.toListPair())
    env.publish()
    result = runSimulator(["-mt", "dense", "-a", "matmul", "-mm", "output_state", "-shots", "1", "-s", "1"], env.program)
    # QCompute stores q0 on the last tensor axis; normalize API output to q0 first.
    state = np.asarray(result.state).reshape([2] * n).transpose(list(reversed(range(n)))).reshape(-1)
    # Vendor RZ is diag(1, exp(i*theta)); normalize to exp(-i*theta*Z/2).
    phase = -sum(item["angle"] / 2 for item in v["gates"] if item["gate"] == "RZ")
    state = np.exp(1j * phase) * state
    result = statevector_result(state, n, "QCompute local_baidu_sim2 output_state")
    result["globalPhaseCorrectionRadians"] = float(phase)
    return result, UNITARY_LIMITATIONS + [
        "QCompute RZ uses a phase-gate convention. Returned amplitudes include exp(i*globalPhaseCorrectionRadians) so every rotation follows exp(-i*theta*Pauli/2).",
        "Fixed legacy QCompute 3.3.5 requires its isolated Python 3.10 and NumPy 1.26 environment. SDK import creates a workspace cache directory.",
    ]


if __name__ == "__main__":
    execute(compute)
