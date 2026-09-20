# cqlib_qml/encoder/angle.py
"""
Angle encoding for quantum data representation.

Angle encoding maps classical data features to rotation angles of
quantum gates. This is one of the simplest and most commonly used
encoding methods in quantum machine learning.

Two encoding modes are available:
    - classical: Each feature maps to one RY gate on a separate qubit
    - dense: Two features are encoded per qubit using RY and RZ gates

Examples:
    >>> from cqlib_qml.encoder import AngleEncoder
    >>> import numpy as np
    >>>
    >>> # Classical mode (one feature per qubit)
    >>> encoder = AngleEncoder(mode="classical")
    >>> data = np.array([0.5, 0.3, 0.7])
    >>> circuits = encoder(data)  # Uses 3 qubits
    >>>
    >>> # Dense mode (two features per qubit)
    >>> encoder = AngleEncoder(mode="dense")
    >>> data = np.array([0.5, 0.3, 0.7, 0.2])
    >>> circuits = encoder(data)  # Uses 2 qubits
"""

import numpy as np
from cqlib.circuit import Circuit


class AngleEncoder:
    """
    Angle encoder for quantum data representation.

    Encodes classical data as rotation angles on quantum gates.
    Supports two modes:
        - classical: Each feature is encoded as RY(2*x) on a separate qubit
        - dense: Two features per qubit: RY(2*theta) and RZ(phi)

    The factor of 2 in RY gates maps data from [0, 1] to [0, 2π],
    allowing full rotation range.

    Args:
        mode (str): Encoding mode. Options: "classical" or "dense".
            Defaults to "classical".

    Attributes:
        _mode (str): Current encoding mode.

    Raises:
        ValueError: If mode is not "classical" or "dense".

    Examples:
        >>> # Classical mode
        >>> encoder = AngleEncoder(mode="classical")
        >>> circuits = encoder(np.array([0.5, 0.3, 0.7]))
        >>>
        >>> # Dense mode
        >>> encoder = AngleEncoder(mode="dense")
        >>> circuits = encoder(np.array([0.5, 0.3, 0.7, 0.2]))
    """

    __MODE = ["classical", "dense"]

    def __init__(self, mode: str = "classical"):
        """
        Initialize an AngleEncoder instance.

        Args:
            mode (str): Encoding mode. Must be "classical" or "dense".
                Defaults to "classical".

        Raises:
            ValueError: If mode is not supported.
        """
        if mode not in AngleEncoder.__MODE:
            raise ValueError(f"Angle encoding only supports two modes: 'classical' and 'dense', " f"got '{mode}'.")
        self._mode = mode

    def __call__(self, data: np.ndarray) -> list:
        """
        Encode data using angle encoding.

        Args:
            data (np.ndarray): Input data array. Can be 1D (single sample)
                or 2D (multiple samples).

        Returns:
            list: List of Circuit objects with angle encoding.

        Examples:
            >>> # Single sample
            >>> circuits = encoder(np.array([0.5, 0.3]))
            >>>
            >>> # Multiple samples
            >>> data = np.array([[0.5, 0.3], [0.7, 0.2]])
            >>> circuits = encoder(data)
        """
        data = np.array([data]) if data.ndim == 1 else data
        n_dim = len(data) if data.ndim == 1 else data.shape[1]
        if self._mode == "classical":
            enc_cirs = []
            for vec in data:
                circuit = Circuit(n_dim)
                for i, x in enumerate(vec):
                    circuit.ry(i, 2 * x)
                enc_cirs.append(circuit)
        else:  # dense mode
            enc_cirs = []
            for vec in data:
                n_qubits = (n_dim + 1) // 2
                circuit = Circuit(n_qubits)
                for i in range(n_qubits):
                    theta = vec[2 * i] if 2 * i < n_dim else 0
                    phi = vec[2 * i + 1] if 2 * i + 1 < n_dim else 0
                    circuit.ry(i, 2 * theta)
                    circuit.rz(i, phi)
                enc_cirs.append(circuit)

        return enc_cirs
