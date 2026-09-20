# Modified by OpenQuantum (2026-09-20): public SDK import McGate is adapted to MCGate; algorithm unchanged.
# cqlib_qml/encoder/amplitude.py
"""
Amplitude encoding for quantum data representation.

Amplitude encoding maps classical data vectors to the amplitudes of
quantum states. This is a highly efficient encoding method that can
represent 2^n-dimensional data using only n qubits.

The encoding is performed recursively using controlled-RY gates to
prepare arbitrary quantum states from the |0⟩ state.

References:
    - Grover, L. (2000). "Synthesis of quantum superpositions"

Examples:
    >>> from cqlib_qml.encoder import AmplitudeEncoder
    >>> import numpy as np
    >>>
    >>> # Single sample
    >>> encoder = AmplitudeEncoder()
    >>> data = np.array([1.0, 0.0, 0.0, 0.0])
    >>> circuits = encoder(data)
    >>>
    >>> # Multiple samples
    >>> data = np.array([[1.0, 0.0], [0.0, 1.0]])
    >>> circuits = encoder(data)
"""

import numpy as np
from cqlib.circuit import Circuit, MCGate as McGate


class AmplitudeEncoder:
    """
    Amplitude encoder for quantum state preparation.

    This encoder maps classical data vectors to quantum state amplitudes.
    The input vector is normalized and padded to length 2^n, then a
    recursive circuit is constructed using RY gates and controlled
    operations.

    The encoding algorithm:
        1. Normalize the input vector
        2. Pad to length 2^n where n = ceil(log2(len(vec)))
        3. Recursively split the vector into halves
        4. Apply RY gates with angles determined by the norms of halves
        5. Use controlled operations for the recursive structure

    Args:
        None

    Attributes:
        None

    Raises:
        ValueError: If input vector is zero (cannot be normalized).

    Examples:
        >>> encoder = AmplitudeEncoder()
        >>>
        >>> # Encode a 2D vector (uses 1 qubit)
        >>> circuits = encoder(np.array([0.6, 0.8]))
        >>>
        >>> # Encode a 4D vector (uses 2 qubits)
        >>> circuits = encoder(np.array([0.5, 0.5, 0.5, 0.5]))
    """

    def __init__(self):
        """Initialize an AmplitudeEncoder instance."""
        pass

    def __call__(self, data: np.ndarray) -> list:
        """
        Encode data using amplitude encoding.

        Args:
            data (np.ndarray): Input data array. Can be 1D (single sample)
                or 2D (multiple samples). Each sample will be normalized
                and padded to length 2^n.

        Returns:
            list: List of Circuit objects with amplitude encoding.
                Each circuit represents one encoded sample.

        Raises:
            ValueError: If the input vector is zero (norm = 0).

        Examples:
            >>> # Single sample
            >>> circuits = encoder(np.array([0.5, 0.3]))
            >>>
            >>> # Multiple samples
            >>> data = np.array([[0.5, 0.3], [0.7, 0.2]])
            >>> circuits = encoder(data)
        """
        data = np.array([data]) if data.ndim == 1 else data
        enc_circs = []
        for vec in data:
            norm = np.linalg.norm(vec)
            if norm == 0:
                raise ValueError("Cannot encode zero vector.")
            vec = vec / np.linalg.norm(vec)
            n_qubits = int(np.ceil(np.log2(len(vec))))
            padded_vec = np.zeros(1 << n_qubits, dtype=np.complex128)
            padded_vec[: len(vec)] = vec
            circuit = Circuit(n_qubits)
            self._build_recursive(padded_vec, list(range(n_qubits - 1, -1, -1)), circuit)
            enc_circs.append(circuit)

        return enc_circs

    def _build_recursive(self, data: np.ndarray, qubits: list, circuit: Circuit) -> None:
        """
        Recursively build the amplitude encoding circuit.

        Args:
            data (np.ndarray): Normalized data vector.
            qubits (list): List of qubit indices (from highest to lowest).
            circuit (Circuit): Circuit to build.

        Note:
            This method modifies the circuit in-place.
        """
        n = len(qubits)
        if n == 0 or len(data) == 1:
            return

        current_q = qubits[0]
        remaining_q = qubits[1:]

        half = len(data) // 2
        left_norm = np.sqrt(sum(abs(data[i]) ** 2 for i in range(half)))
        right_norm = np.sqrt(sum(abs(data[i]) ** 2 for i in range(half, len(data))))

        total = np.sqrt(left_norm**2 + right_norm**2)
        if total > 1e-10:
            if left_norm > 0:
                theta = 2 * np.arccos(left_norm / total)
            else:
                theta = np.pi
        else:
            theta = 0

        circuit.ry(current_q, theta)

        if left_norm > 1e-10 and half > 0:
            left_data = data[:half] / left_norm
            if len(remaining_q) > 0:
                sub_cir = Circuit(len(remaining_q))
                self._build_recursive(left_data, remaining_q, sub_cir)
                for op in sub_cir.operations:
                    instruction = op.instruction
                    sub_qubits = [qid.index for qid in op.qubits]
                    params = op.params
                    if instruction.is_standard:
                        gate = instruction.standard_gate
                        cgate = McGate(1, gate)
                        circuit.x(current_q)
                        circuit.multi_control_gate(cgate, [current_q] + [remaining_q[i] for i in sub_qubits], params)
                        circuit.x(current_q)
                    elif instruction.is_mcgate:
                        gate = instruction.mc_gate
                        base_gate = gate.base_gate
                        cgate = McGate(1 + gate.num_ctrl_qubits, base_gate)
                        circuit.x(current_q)
                        circuit.multi_control_gate(cgate, [current_q] + [remaining_q[i] for i in sub_qubits], params)
                        circuit.x(current_q)

        if right_norm > 1e-10 and half > 0:
            right_data = data[half:] / right_norm
            if len(remaining_q) > 0:
                sub_cir = Circuit(len(remaining_q))
                self._build_recursive(right_data, remaining_q, sub_cir)
                for op in sub_cir.operations:
                    instruction = op.instruction
                    sub_qubits = [qid.index for qid in op.qubits]
                    params = op.params
                    if instruction.is_standard:
                        gate = instruction.standard_gate
                        cgate = McGate(1, gate)
                        circuit.multi_control_gate(cgate, [current_q] + [remaining_q[i] for i in sub_qubits], params)
                    elif instruction.is_mcgate:
                        gate = instruction.mc_gate
                        base_gate = gate.base_gate
                        cgate = McGate(1 + gate.num_ctrl_qubits, base_gate)
                        circuit.multi_control_gate(cgate, [current_q] + [remaining_q[i] for i in sub_qubits], params)
