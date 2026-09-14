"""Matrix-free RY/CNOT states and Pauli expectations, q0 as the leftmost bit."""
import numpy as np


def parity_signs(indices, mask):
    parity = indices & mask
    for shift in (32, 16, 8, 4, 2, 1):
        parity = parity ^ (parity >> shift)
    return 1. - 2. * (parity & 1)


class PauliObjective:
    def __init__(self, num_qubits, layers, terms):
        self.n = num_qubits
        self.layers = layers
        # Reject an unrepresentable NumPy array before attempting an allocation.
        if num_qubits >= np.iinfo(np.intp).bits or 2**num_qubits > np.iinfo(np.intp).max // np.dtype(complex).itemsize:
            raise ValueError("Statevector exceeds the platform NumPy index/array-byte representation")
        self.indices = np.arange(2**num_qubits, dtype=np.uint64)
        self.terms = []
        for term in terms:
            flip = phase = y_count = 0
            for q, pauli in enumerate(term["pauli"]):
                bit = 1 << (num_qubits - 1 - q)
                if pauli in "XY":
                    flip |= bit
                if pauli in "YZ":
                    phase |= bit
                y_count += pauli == "Y"
            self.terms.append((term["coefficient"], flip, phase, 1j**y_count))

    def state(self, parameters):
        p = np.asarray(parameters, dtype=float)
        if p.shape != (self.n * (self.layers + 1),):
            raise ValueError("Wrong ansatz parameter dimensions")
        vector = np.zeros(len(self.indices), complex)
        vector[0] = 1
        offset = 0
        for layer in range(self.layers + 1):
            if layer:
                for control in range(self.n - 1):
                    enabled = (self.indices >> (self.n - 1 - control)) & 1
                    vector = vector[self.indices ^ (enabled << (self.n - 2 - control))]
            for site in range(self.n):
                angle = p[offset]
                offset += 1
                c, s = np.cos(angle / 2), np.sin(angle / 2)
                pairs = vector.reshape(-1, 2, 2**(self.n - 1 - site))
                a, b = pairs[:, 0, :].copy(), pairs[:, 1, :].copy()
                pairs[:, 0, :] = c * a - s * b
                pairs[:, 1, :] = s * a + c * b
        return vector

    def expectation(self, vector):
        energy = 0.
        for coefficient, flip, phase, y_phase in self.terms:
            signs = parity_signs(self.indices, phase)
            energy += coefficient * np.vdot(vector[self.indices ^ flip], y_phase * signs * vector).real
        return float(energy)
