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
    reference = reference_plan(v["referenceMode"], n <= 6, "Independent dense density-matrix evolution", "Auto reference selects up to 6 qubits; use required to request a larger reference.")
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
    if v.get("maxActiveWidth") is not None and width > v["maxActiveWidth"]:
        raise ValueError(f"Compiled peak active width {width} exceeds maxActiveWidth={v['maxActiveWidth']}")
    sampled = np.asarray(clifft.sample(program, shots=shots, seed=v["seed"], threads=v["execution"]["threads"]).measurements)
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


execute(compute)
