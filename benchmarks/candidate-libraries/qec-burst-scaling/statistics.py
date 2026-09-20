from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class BinomialEstimate:
    failures: int
    shots: int
    p_hat: float
    ci_low: float
    ci_high: float


def wilson_interval(k: int, n: int, z: float = 1.959963984540054) -> tuple[float, float]:
    if n <= 0:
        raise ValueError("n must be positive")
    if not (0 <= k <= n):
        raise ValueError("k must satisfy 0 <= k <= n")

    p = k / n
    z2 = z * z
    denom = 1 + z2 / n
    center = (p + z2 / (2 * n)) / denom
    half = z * math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denom
    return max(0.0, center - half), min(1.0, center + half)


def summarize_binomial(k: int, n: int) -> BinomialEstimate:
    lo, hi = wilson_interval(k, n)
    return BinomialEstimate(k, n, k / n, lo, hi)
