# cqlib_qml/encoder/ZZFeature.py
"""
ZZFeatureMap style encoder.

This encoder implements the ZZFeatureMap encoding, which encodes features
as phases in RZ gates and creates entanglement using RZZ gates between
qubits. It's inspired by the feature maps used in quantum kernel methods.

References:
    - Havlíček, V., et al. (2019). "Supervised learning with quantum-enhanced
      feature spaces." Nature.

Examples:
    >>> from cqlib_qml.encoder import ZZFeatureEncoder
    >>> import numpy as np
    >>>
    >>> # Linear entanglement
    >>> encoder = ZZFeatureEncoder(n_repeats=2, entanglement="linear")
    >>> data = np.array([0.5, 0.3, 0.7])
    >>> circuits = encoder(data)
    >>>
    >>> # Full entanglement
    >>> encoder = ZZFeatureEncoder(n_repeats=1, entanglement="full")
    >>> circuits = encoder(data)
"""

import numpy as np
from typing import List
from cqlib.circuit import Circuit


class ZZFeatureEncoder:
    """
    ZZFeatureMap style encoder with entanglement.

    Encodes features by:
        1. Applying Hadamard gates to all qubits
        2. Encoding features as RZ rotations (2π * feature)
        3. Creating entanglement with RZZ gates

    Args:
        n_repeats (int): Number of times to repeat the encoding layers.
            Defaults to 2.
        entanglement (str): Entanglement pattern.
            Options: "linear", "full", "circular".
            Defaults to "linear".

    Attributes:
        _n_repeats (int): Number of repetitions.
        _entanglement (str): Entanglement pattern.

    Raises:
        ValueError: If entanglement pattern is not supported.

    Examples:
        >>> # Linear entanglement: nearest-neighbor connections
        >>> encoder = ZZFeatureEncoder(n_repeats=3, entanglement="linear")
        >>>
        >>> # Full entanglement: all-to-all connections
        >>> encoder = ZZFeatureEncoder(n_repeats=1, entanglement="full")
        >>>
        >>> # Circular entanglement: ring topology
        >>> encoder = ZZFeatureEncoder(n_repeats=2, entanglement="circular")
    """

    __ENTANGLEMENT = ["linear", "full", "circular"]

    def __init__(
        self,
        n_repeats: int = 2,
        entanglement: str = "linear",
    ):
        """
        Initialize a ZZFeatureEncoder instance.

        Args:
            n_repeats (int): Number of repetitions. Defaults to 2.
            entanglement (str): Entanglement pattern. Defaults to "linear".

        Raises:
            ValueError: If entanglement pattern is not supported.
        """
        if entanglement not in ZZFeatureEncoder.__ENTANGLEMENT:
            raise ValueError(
                f"ZZFeatureMap only supports three entanglements: "
                f"'linear', 'full', and 'circular', got '{entanglement}'."
            )
        self._n_repeats = n_repeats
        self._entanglement = entanglement

    def _get_entanglement_pairs(self, n_qubits: int) -> List[tuple]:
        """
        Get qubit pairs for entanglement based on the pattern.

        Args:
            n_qubits (int): Number of qubits.

        Returns:
            List[tuple]: List of (i, j) qubit pairs.

        Examples:
            >>> encoder = ZZFeatureEncoder(entanglement="linear")
            >>> pairs = encoder._get_entanglement_pairs(4)
            >>> print(pairs)
            [(0, 1), (1, 2), (2, 3)]
        """
        pairs = []
        if self._entanglement == "linear":
            for i in range(n_qubits - 1):
                pairs.append((i, i + 1))
        elif self._entanglement == "circular":
            for i in range(n_qubits - 1):
                pairs.append((i, i + 1))
            pairs.append((n_qubits - 1, 0))
        elif self._entanglement == "full":
            for i in range(n_qubits):
                for j in range(i + 1, n_qubits):
                    pairs.append((i, j))
        return pairs

    def __call__(self, data: np.ndarray) -> List[Circuit]:
        """
        Encode data using ZZFeatureMap style.

        Args:
            data (np.ndarray): Input data of shape (n_samples, n_features).
                Should match n_qubits.

        Returns:
            List[Circuit]: List of circuits with ZZFeatureMap encoding.

        Examples:
            >>> # Single sample
            >>> circuits = encoder(np.array([0.5, 0.3, 0.7]))
            >>>
            >>> # Multiple samples
            >>> data = np.array([[0.5, 0.3], [0.7, 0.2]])
            >>> circuits = encoder(data)
        """
        data = np.array([data]) if data.ndim == 1 else data
        n_qubits = len(data) if data.ndim == 1 else data.shape[1]
        enc_cirs = []
        for vec in data:
            circuit = Circuit(n_qubits)
            for _ in range(self._n_repeats):
                # Apply Hadamard gates
                for i in range(n_qubits):
                    circuit.h(i)
                # Encode features as RZ rotations
                for i in range(n_qubits):
                    circuit.rz(i, vec[i] * 2 * np.pi)
                # Apply entanglement
                pairs = self._get_entanglement_pairs(n_qubits)
                for i, j in pairs:
                    circuit.rzz(i, j, (np.pi - vec[i]) * (np.pi - vec[j]))
            enc_cirs.append(circuit)

        return enc_cirs
