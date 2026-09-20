# Modified by OpenQuantum (2026-09-20): public SDK import McGate is adapted to MCGate; algorithm unchanged.
# cqlib_qml/algorithms/QKM.py
"""
Quantum Kernel Method implementation.

This module provides the Quantum Kernel Method (QKM) for computing kernel matrices
using quantum circuits. The kernel is defined as the fidelity between quantum states
encoded from classical data: K(x_i, x_j) = |⟨ψ(x_i)|ψ(x_j)⟩|^2.

The QKM can be used with various encoding strategies and supports both statevector
simulation and swap test for fidelity computation.

References:
    - Havlíček, V., et al. (2019). "Supervised learning with quantum-enhanced
      feature spaces." Nature, 567(7747), 209-212.

Examples:
    >>> from cqlib_qml.algorithms.QKM import QKM
    >>> from cqlib_qml.encoder import AmplitudeEncoder
    >>>
    >>> encoder = AmplitudeEncoder()
    >>> qkm = QKM(encoder=encoder, swap_test=False)
    >>>
    >>> # Compute kernel matrix
    >>> X = np.array([[0.5, 0.3], [0.8, 0.1]])
    >>> K = qkm.kernel(X)  # Self-kernel matrix
    >>> print(K.shape)
    (2, 2)
"""

import numpy as np
from typing import Optional, Union, List

from cqlib.circuit import Circuit, MCGate as McGate, StandardGate
from cqlib.qis.state import Statevector
from cqlib_qml.encoder import AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder


class QKM:
    """
    Quantum Kernel Method for cqlib.

    Computes kernel matrix K(x_i, x_j) = |⟨ψ(x_i)|ψ(x_j)⟩|^2,
    where |ψ(x)⟩ is the quantum state after encoding.

    The kernel measures the similarity between data points in a quantum
    feature space. Higher fidelity indicates more similar data points.

    Args:
        encoder: Encoding strategy. Must be one of:
            - AmplitudeEncoder: Amplitude encoding
            - AngleEncoder: Angle encoding
            - ZZFeatureEncoder: ZZFeatureMap style encoding
        swap_test: Whether to use swap test for fidelity computation.
            If False, uses statevector simulation (faster for classical simulation).
            If True, uses swap test circuit (more suitable for hardware).
            Defaults to False.

    Attributes:
        _encoder: The encoding strategy instance.
        _n_qubits: Number of qubits in the quantum circuit.
        _feature_dim: Dimension of input features.
        _swap_test: Whether swap test is enabled.
        _circuit_cache: Cache for encoded circuits to avoid recomputation.

    Raises:
        ValueError: If encoder type is not supported.

    Examples:
        >>> encoder = AngleEncoder(mode="dense")
        >>> qkm = QKM(encoder=encoder, swap_test=False)
        >>> X_train = np.array([[0.1, 0.2], [0.3, 0.4]])
        >>> X_test = np.array([[0.5, 0.6]])
        >>> K = qkm.kernel(X_train, X_test)
        >>> print(K)
        [[0.98 0.72]
         [0.72 0.45]]
    """

    def __init__(
        self,
        encoder: Union[AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder],
        swap_test: bool = False,
    ):
        """Initialize the Quantum Kernel Method.

        Args:
            encoder: Encoding strategy for data-to-quantum state mapping.
            swap_test: Enable swap test for fidelity computation.
                Defaults to False.

        Raises:
            ValueError: If encoder is not an instance of supported encoders.
        """
        if not isinstance(encoder, (AmplitudeEncoder, AngleEncoder, ZZFeatureEncoder)):
            raise ValueError(
                f"QKM only supports AmplitudeEncoder, AngleEncoder and ZZFeatureEncoder. "
                f"Got {type(encoder).__name__}."
            )
        self._encoder = encoder
        self._n_qubits = None
        self._feature_dim = None
        self._swap_test = swap_test
        self._circuit_cache = {}

    def _encode_data(self, X: np.ndarray) -> List[Circuit]:
        """
        Encode data into quantum circuits.

        This method converts input data into a list of quantum circuits
        using the specified encoding strategy. Results are cached for
        repeated data points to improve performance.

        Args:
            X (np.ndarray): Input data of shape (n_samples, n_features).

        Returns:
            List[Circuit]: List of quantum circuits, one per sample.

        Raises:
            ValueError: If encoding fails due to invalid input.

        Note:
            The encoder's __call__ method may return a single Circuit
            or a list of Circuits. This method handles both cases.
        """
        X = np.asarray(X)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        circuits = []
        for i, x in enumerate(X):
            cache_key = tuple(x) if isinstance(x, np.ndarray) else x
            if cache_key in self._circuit_cache:
                circuits.append(self._circuit_cache[cache_key])
                continue
            enc_circs = self._encoder(x)
            circuit = enc_circs[0] if isinstance(enc_circs, list) else enc_circs
            self._circuit_cache[cache_key] = circuit
            circuits.append(circuit)

        self._n_qubits = circuits[0].num_qubits
        return circuits

    def _fidelity_direct(self, cir_i: Circuit, cir_j: Circuit) -> float:
        """
        Compute fidelity using direct statevector inner product.

        This method computes the fidelity by first obtaining the statevectors
        of both circuits and then calculating their inner product.

        Args:
            cir_i (Circuit): First quantum circuit.
            cir_j (Circuit): Second quantum circuit.

        Returns:
            float: Fidelity F = |⟨ψ_i|ψ_j⟩|^2 in [0, 1].

        Note:
            This method is fast for classical simulation but not suitable
            for hardware execution.
        """
        # Get statevectors
        state_i = Statevector(self._n_qubits)
        state_i.apply_circuit(cir_i)

        state_j = Statevector(self._n_qubits)
        state_j.apply_circuit(cir_j)

        # Compute inner product
        inner_product = np.vdot(state_i.data, state_j.data)
        fidelity = np.abs(inner_product) ** 2

        return float(fidelity)

    def _fidelity_swap_test(self, cir_i: Circuit, cir_j: Circuit) -> float:
        """
        Compute fidelity using swap test circuit.

        This method computes the fidelity using a swap test circuit that
        measures the overlap between two quantum states. The fidelity is
        calculated from the probability of measuring the ancilla in |0⟩.

        Args:
            cir_i (Circuit): First quantum circuit.
            cir_j (Circuit): Second quantum circuit.

        Returns:
            float: Fidelity F = |⟨ψ|φ⟩|^2 in [0, 1].

        Note:
            This method is suitable for hardware execution but requires
            additional qubits (2*n_qubits + 1).
        """
        n_ancilla = 1
        total_qubits = 2 * self._n_qubits + n_ancilla
        ancilla_idx = 2 * self._n_qubits

        swap_circuit = Circuit(total_qubits)
        swap_circuit.compose(cir_i, list(range(self._n_qubits)))
        swap_circuit.compose(cir_j, list(range(self._n_qubits, 2 * self._n_qubits)))
        swap_circuit.h(ancilla_idx)
        for i in range(self._n_qubits):
            cswap = McGate(1, StandardGate.SWAP)
            swap_circuit.multi_control_gate(cswap, [ancilla_idx, i, i + self._n_qubits])
        swap_circuit.h(ancilla_idx)

        state = Statevector(total_qubits)
        state.apply_circuit(swap_circuit)
        prob0 = 0.0
        for i in range(1 << total_qubits):
            if (i >> ancilla_idx) & 1 == 0:
                prob0 += np.abs(state.data[i]) ** 2

        fidelity = 2 * prob0 - 1
        fidelity = np.clip(fidelity, 0.0, 1.0)

        return float(fidelity)

    def _fidelity(self, cir_i: Circuit, cir_j: Circuit) -> float:
        """
        Compute fidelity between two encoded states.

        This is a wrapper method that calls either the direct or swap test
        fidelity computation based on the `swap_test` flag.

        Args:
            cir_i (Circuit): First quantum circuit.
            cir_j (Circuit): Second quantum circuit.

        Returns:
            float: Fidelity value in [0, 1].
        """
        if self._swap_test:
            return self._fidelity_swap_test(cir_i, cir_j)
        else:
            return self._fidelity_direct(cir_i, cir_j)

    def kernel(self, X: np.ndarray, Y: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Compute the quantum kernel matrix.

        Computes the kernel matrix where K[i,j] = fidelity between encoded
        states of X[i] and Y[j]. If Y is None, computes the self-kernel matrix.

        Args:
            X (np.ndarray): First set of samples. Shape (n_samples1, n_features).
            Y (np.ndarray, optional): Second set of samples. Shape (n_samples2, n_features).
                If None, Y = X (self-kernel). Defaults to None.

        Returns:
            np.ndarray: Kernel matrix of shape (n_samples1, n_samples2).
                For self-kernel, the matrix is symmetric.

        Raises:
            ValueError: If feature dimensions don't match or input shapes are invalid.

        Examples:
            >>> X = np.random.randn(3, 4)
            >>> K = qkm.kernel(X)  # Self-kernel: (3, 3)
            >>> Y = np.random.randn(2, 4)
            >>> K = qkm.kernel(X, Y)  # Cross-kernel: (3, 2)
        """
        X = np.asarray(X)
        if X.ndim == 1:
            X = X.reshape(1, -1)
        symmetric = Y is None
        if symmetric:
            Y = X
        Y = np.asarray(Y)
        if Y.ndim == 1:
            Y = Y.reshape(1, -1)
        if X.shape[1] != Y.shape[1]:
            raise ValueError(
                f"Feature dimension mismatch: X has {X.shape[1]} features, " f"Y has {Y.shape[1]} features."
            )

        n_features = X.shape[1]
        if self._feature_dim is None:
            self._feature_dim = n_features
        elif n_features != self._feature_dim:
            raise ValueError(f"Feature dimension mismatch: expected {self._feature_dim}, " f"got {n_features}.")

        circuits_X = self._encode_data(X)
        circuits_Y = self._encode_data(Y) if not symmetric else circuits_X

        n1, n2 = len(X), len(Y)
        kernel = np.zeros((n1, n2))
        for i in range(n1):
            for j in range(n2):
                fid = self._fidelity(circuits_X[i], circuits_Y[j])
                kernel[i, j] = fid
                if symmetric:
                    kernel[j, i] = fid
        if symmetric:
            kernel += 1e-8 * np.eye(n1)

        return kernel

    def __call__(self, X: np.ndarray, Y: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Alias for kernel() method.

        Allows the QKM instance to be called directly as a function.

        Args:
            X (np.ndarray): First set of samples.
            Y (np.ndarray, optional): Second set of samples.

        Returns:
            np.ndarray: Kernel matrix.

        Examples:
            >>> kernel_matrix = qkm(X_train, X_test)
        """
        return self.kernel(X, Y)

    def clear_cache(self):
        """
        Clear the circuit cache.

        Use this method to free memory when working with large datasets
        or when the encoding strategy has changed.

        Examples:
            >>> qkm.clear_cache()  # Free cached circuits
        """
        self._circuit_cache = {}
