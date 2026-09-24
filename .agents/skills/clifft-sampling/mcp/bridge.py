import sys
from collections import Counter
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, tensor_product
from science_reference import reference_plan


def compute(v):
    import numpy as np
    import clifft
    n, shots = v["numQubits"], v["shots"]
    reference = reference_plan(v["referenceMode"], n <= 6, "Independent dense density-matrix evolution", "Automatic dense reference is omitted above 6 qubits; required attempts it at the requested size.")
    rho = None
    if reference["status"] == "computed":
        dimension = 2 ** n
        rho = np.zeros((dimension, dimension), complex)
        rho[0, 0] = 1
        x = np.array([[0, 1], [1, 0]], complex)
        y = np.array([[0, -1j], [1j, 0]], complex)
        z = np.diag([1, -1]).astype(complex)
        matrices = {"H": np.array([[1, 1], [1, -1]]) / np.sqrt(2), "S": np.diag([1, 1j]), "T": np.diag([1, np.exp(1j * np.pi / 4)]), "X": x, "Y": y, "Z": z}
        def local(op, target):
            return tensor_product([op if q == target else np.eye(2) for q in range(n)])
    lines = []
    for instruction in v["gates"]:
        gate, targets = instruction["gate"], instruction["targets"]
        lines.append(gate + " " + " ".join(map(str, targets)))
        if rho is not None:
            if gate in matrices:
                operator = local(matrices[gate], targets[0])
            else:
                control, target = targets
                operator = np.zeros((dimension, dimension), complex)
                for column in range(dimension):
                    enabled = (column >> (n - 1 - control)) & 1
                    row = column ^ (1 << (n - 1 - target)) if gate == "CX" and enabled else column
                    operator[row, column] = -1 if gate == "CZ" and enabled and ((column >> (n - 1 - target)) & 1) else 1
            rho = operator @ rho @ operator.conj().T
        if v["noiseProbability"]:
            probability = v["noiseProbability"]
            lines.append(f"DEPOLARIZE1({probability}) " + " ".join(map(str, targets)))
            if rho is not None:
                for target in targets:
                    transformed = [local(pauli, target) for pauli in [x, y, z]]
                    rho = (1 - probability) * rho + probability / 3 * sum(op @ rho @ op.conj().T for op in transformed)
    lines.append("M " + " ".join(map(str, range(n))))
    circuit = "\n".join(lines)
    program = clifft.compile(circuit)
    width = int(program.peak_active_width)
    if v["maxActiveWidth"] is not None and width > v["maxActiveWidth"]:
        raise ValueError(f"Compiled peak active width {width} exceeds maxActiveWidth={v['maxActiveWidth']}")
    thread_count = __import__("os").environ.get("OMP_NUM_THREADS")
    options = {"threads": int(thread_count)} if thread_count else {}
    sampled = np.asarray(clifft.sample(program, shots=shots, seed=v["seed"], **options).measurements)
    if sampled.shape != (shots, n) or not np.isin(sampled, [0, 1]).all():
        raise ValueError("Clifft returned invalid measurement dimensions or values")
    counts = Counter("".join(map(str, row)) for row in sampled.astype(np.uint8))
    exact = np.diag(rho).real if rho is not None else None
    keys = [format(i, f"0{n}b") for i in range(2**n)] if exact is not None else sorted(counts)
    return {"outcomes": [{"bitstring": key, "count": counts[key], "probability": counts[key] / shots,
            "referenceProbability": float(exact[int(key, 2)]) if exact is not None else None} for key in keys],
        "outcomesCoverage": "complete" if exact is not None else "observed_only", "reference": reference,
        "shots": shots, "totalVariationDistance": float(sum(abs(counts[key] / shots - exact[int(key, 2)]) for key in keys) / 2) if exact is not None else None,
        "referenceTraceError": float(abs(np.trace(rho) - 1)) if rho is not None else None,
        "bitOrder": "left-to-right q0,q1,...", "circuit": circuit, "peakActiveWidth": width,
        "nonCliffordGates": sum(g["gate"] == "T" for g in v["gates"])}, [
        "Initial state |0...0>; independent per-target depolarization follows every gate; final Z measurement only.",
        "Frequencies have multinomial sampling uncertainty; observed_only omits unobserved bitstrings, not probability mass from the empirical distribution.",
        "Only the documented bounded Clifford+T gate set is exposed; loss/leakage continuations, dynamic circuits, performance claims and scientific acceptance are out of scope."]



def compute_qec(v):
    import hashlib
    import re
    import clifft
    import numpy as np
    circuit = v["stimCircuit"]
    # This is circuit data consumed by Clifft's parser, never Python or a shell.
    allowed = {"I", "X", "Y", "Z", "H", "S", "S_DAG", "T", "T_DAG", "CX", "CNOT",
        "CY", "CZ", "SWAP", "R", "RX", "RY", "M", "MX", "MY", "MR", "MRX", "MRY",
        "X_ERROR", "Y_ERROR", "Z_ERROR", "DEPOLARIZE1", "DEPOLARIZE2",
        "PAULI_CHANNEL_1", "PAULI_CHANNEL_2", "TICK", "QUBIT_COORDS", "SHIFT_COORDS",
        "DETECTOR", "OBSERVABLE_INCLUDE", "REPEAT"}
    cleaned = "\n".join(line.split("#", 1)[0] for line in circuit.splitlines())
    instructions = re.findall(r"(?:^|[{}])\s*([A-Za-z_][A-Za-z_0-9]*)", cleaned, re.M)
    if not instructions or any(op.upper() not in allowed for op in instructions):
        raise ValueError("Circuit contains instructions outside the documented fixed-shot Clifft subset")
    program = clifft.compile(circuit)
    if program.has_postselection or program.num_exp_vals:
        raise ValueError("Postselection and expectation-value records are not supported")
    width = int(program.peak_active_width)
    if v.get("maxActiveWidth") is not None and width > v["maxActiveWidth"]:
        raise ValueError("Compiled peak active width exceeds maxActiveWidth")
    result = clifft.sample(program, shots=v["shots"], seed=v["seed"],
                          **({"threads": v["execution"]["threads"]} if "threads" in v["execution"] else {}))
    outputs = {}
    for name, size in (("measurements", program.num_measurements),
                       ("detectors", program.num_detectors), ("observables", program.num_observables)):
        rows = np.asarray(getattr(result, name))
        if rows.shape != (v["shots"], size) or not np.isin(rows, [0, 1]).all():
            raise ValueError("Clifft returned invalid " + name + " dimensions or values")
        outputs[name] = ["".join(map(str, row)) for row in rows.astype(np.uint8)]
    return {**outputs, "shots": v["shots"], "numQubits": int(program.num_qubits),
        "numMeasurements": int(program.num_measurements), "numDetectors": int(program.num_detectors),
        "numObservables": int(program.num_observables), "peakActiveWidth": width,
        "circuitSha256": hashlib.sha256(circuit.encode()).hexdigest(),
        "recordOrder": "left-to-right measurement record index / detector declaration index / observable id",
        "detectorConvention": "raw parity of referenced measurement records; no automatic reference-sample subtraction",
        "decoded": False}, [
        "CPU, fixed-shot sampling of the documented Stim-format subset; CUDA, loss, leakage and postselection are excluded.",
        "Detector and observable bits are raw record parities, not automatically normalized detection events or logical failures.",
        "No detector error model, matching weights or decoder is inferred; non-Clifford sampling does not establish PyMatching compatibility.",
        "Seed reproducibility is limited to the fixed backend, version, scheduling and batching; frequencies carry sampling uncertainty.",
        "This call reports execution facts only; scientific acceptance remains not_evaluated."]


execute(lambda v: compute_qec(v) if "stimCircuit" in v else compute(v))
