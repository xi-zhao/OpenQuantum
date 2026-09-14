import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, tensor_product


def compute(v):
    import numpy as np
    import clifft
    n, shots = v["numQubits"], v["shots"]
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
            for target in targets:
                transformed = [local(pauli, target) for pauli in [x, y, z]]
                rho = (1 - probability) * rho + probability / 3 * sum(op @ rho @ op.conj().T for op in transformed)
    lines.append("M " + " ".join(map(str, range(n))))
    circuit = "\n".join(lines)
    sampled = np.asarray(clifft.sample(clifft.compile(circuit), shots=shots, seed=v["seed"]).measurements)
    if sampled.shape != (shots, n) or not np.isin(sampled, [0, 1]).all():
        raise ValueError("Clifft returned invalid measurement dimensions or values")
    indices = sampled.astype(np.int64) @ (2 ** np.arange(n - 1, -1, -1))
    counts = np.bincount(indices, minlength=dimension)
    exact = np.diag(rho).real
    return {"outcomes": [{"bitstring": format(i, f"0{n}b"), "count": int(counts[i]), "probability": float(counts[i] / shots), "referenceProbability": float(exact[i])} for i in range(dimension)],
        "shots": shots, "totalVariationDistance": float(np.sum(abs(counts / shots - exact)) / 2), "referenceTraceError": float(abs(np.trace(rho) - 1)),
        "bitOrder": "left-to-right q0,q1,...", "circuit": circuit, "nonCliffordGates": sum(g["gate"] == "T" for g in v["gates"])}, [
        "Initial state |0...0>; independent per-target depolarization follows every gate; final Z measurement only.",
        "Exact describes the simulator model, not finite-shot estimates; frequencies have multinomial sampling uncertainty.",
        "Only the documented bounded Clifford+T gate set is exposed; loss/leakage continuations, dynamic circuits, performance claims and scientific acceptance are out of scope."]


execute(compute)
