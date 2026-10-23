"""Complete-call adapter for the Rust port; does not install or mutate an SDK."""
import numpy as np
import qutip as qt

import qutip_wigner_rust


def wigner_rust(state, xvec, yvec, g=np.sqrt(2), *, offset=0):
    """Return a writable W[y_index, x_index] array; offset=0, Hermitian input."""
    if offset != 0:
        raise ValueError("This Rust port supports offset=0 only")
    scale = np.asarray(g)
    if scale.ndim != 0 or scale.dtype.kind not in "fiu" or np.iscomplexobj(scale):
        raise ValueError("A real scalar g is required")
    if not isinstance(state, qt.Qobj) or not (state.isket or state.isbra or state.isoper):
        raise TypeError("QuTiP ket, bra or Hermitian operator required")
    rho = state.proj() if state.isket or state.isbra else state
    if rho.dims != [[rho.shape[0]], [rho.shape[1]]]:
        raise ValueError("Single-mode Fock-basis input required")
    coordinates = []
    for source in [xvec, yvec]:
        value = np.asarray(source)
        if value.ndim != 1 or np.iscomplexobj(value):
            raise ValueError("Real 1D coordinates required")
        coordinates.append(np.asarray(value, dtype=np.float64))
    x, y = coordinates
    dense = np.asarray(rho.full(), dtype=np.complex128, order="C")
    buffer = qutip_wigner_rust.clenshaw(dense.tobytes(), dense.shape[0], x.tolist(), y.tolist(), float(scale))
    # Match QuTiP's writable, independently owned output array.
    return np.frombuffer(buffer, dtype=np.float64).reshape(len(y), len(x)).copy()
