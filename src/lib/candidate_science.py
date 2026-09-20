"""Explicit circuit/Pauli conventions shared by candidate-library adapters."""
import numpy as np


def qiskit_circuit(v):
    from qiskit import QuantumCircuit
    circuit = QuantumCircuit(v["numQubits"])
    for gate in v["gates"]:
        args = ([gate["angle"]] if "angle" in gate else []) + gate["targets"]
        getattr(circuit, gate["gate"].lower())(*args)
    return circuit


def metrics(circuit):
    from qiskit import transpile
    common = transpile(circuit, basis_gates=["u", "cx"], optimization_level=0, seed_transpiler=0)
    return {"gates": len(circuit.data), "depth": circuit.depth(),
            "twoQubitGates": sum(len(g.qubits) == 2 for g in circuit.data),
            "cxInCommonBasis": int(common.count_ops().get("cx", 0))}


def pauli_action(vector, terms):
    # Independent bit-index implementation: leftmost Pauli is q0 = least significant bit.
    indices = np.arange(vector.size)
    result = np.zeros_like(vector, dtype=complex)
    for term in terms:
        targets = indices.copy()
        phase = np.ones(vector.size, dtype=complex)
        for q, p in enumerate(term["pauli"]):
            bit = (indices >> q) & 1
            if p in "XY": targets ^= 1 << q
            if p == "Y": phase *= 1j * (1 - 2 * bit)
            if p == "Z": phase *= 1 - 2 * bit
        result[targets] += term["coefficient"] * phase * vector
    return result


def dense_hamiltonian(n, terms):
    d = 1 << n
    return np.column_stack([pauli_action(np.eye(d, dtype=complex)[:, i], terms) for i in range(d)])


def hea_state(n, layers, parameters):
    # Independent reconstruction of OpenQARP's fixed complex, linear RY/RZ/CX ansatz.
    vector = np.zeros(1 << n, dtype=complex)
    vector[0] = 1
    indices = np.arange(vector.size)
    for layer in range(layers):
        for q in range(n):
            theta = parameters[f"ry_{layer}_{q}"]
            c, s = np.cos(theta / 2), np.sin(theta / 2)
            low = indices[((indices >> q) & 1) == 0]
            high = low ^ (1 << q)
            a, b = vector[low].copy(), vector[high].copy()
            vector[low], vector[high] = c*a-s*b, s*a+c*b
        for q in range(n):
            theta = parameters[f"rz_{layer}_{q}"]
            vector *= np.exp(1j * theta / 2 * (2*((indices >> q) & 1)-1))
        for q in range(n - 1):
            low = indices[(((indices >> q) & 1) == 1) & (((indices >> (q+1)) & 1) == 0)]
            high = low ^ (1 << (q+1))
            vector[low], vector[high] = vector[high].copy(), vector[low].copy()
    return vector
