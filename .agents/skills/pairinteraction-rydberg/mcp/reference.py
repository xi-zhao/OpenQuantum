"""Separate matrix reference; checks numerics, not the atomic database or model."""
import numpy as np


def second_order_reference(matrix, model_indices):
    """Hermitian quasi-degenerate second order from explicit sums over Q states."""
    h = np.asarray(matrix, dtype=float)
    model = list(model_indices)
    exterior = [index for index in range(len(h)) if index not in model]
    result = h[np.ix_(model, model)].copy()
    correction = np.zeros_like(result)
    max_ratio, min_gap = 0.0, float("inf")
    for q in exterior:
        coupling = h[model, q]
        if not np.any(coupling):
            continue
        gaps = h[model, model] - h[q, q]
        for a, value in enumerate(coupling):
            if value == 0:
                continue
            if abs(gaps[a]) < 1e-8:
                raise ValueError("Coupled external state is degenerate with the model space; enlarge the physical model")
            min_gap = min(min_gap, abs(float(gaps[a])))
            max_ratio = max(max_ratio, abs(float(value / gaps[a])))
            for b, other in enumerate(coupling):
                if other != 0:
                    if abs(gaps[b]) < 1e-8:
                        raise ValueError("Coupled external degeneracy invalidates second-order perturbation theory")
                    correction[a, b] += 0.5 * value * other * (1 / gaps[a] + 1 / gaps[b])
    if not np.isfinite(min_gap):
        raise ValueError("No coupled intermediate states; requested basis cannot describe the interaction")
    return result + correction, correction, max_ratio, min_gap
