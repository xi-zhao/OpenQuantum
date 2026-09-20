from __future__ import annotations

from dataclasses import dataclass

import stim


@dataclass(frozen=True)
class BurstSpec:
    qubits: tuple[int, ...]
    start_round: int
    duration: int
    p_burst: float

    @property
    def rounds(self) -> range:
        return range(self.start_round, self.start_round + self.duration)


def build_background_circuit(
    *,
    distance: int,
    rounds: int,
    p0: float,
    basis: str = "x",
    after_clifford_depolarization: float = 0.0,
    before_measure_flip_probability: float = 0.0,
    after_reset_flip_probability: float = 0.0,
):
    """Generate the controlled baseline circuit.

    By default (all circuit-level params left at 0), only round-start
    data-qubit depolarization is enabled -- this is the phenomenological-
    only model used throughout Phase 0-A (Experiments 0-10), and makes
    burst variables independently controllable for the mechanism-discovery
    phase. Passing nonzero after_clifford_depolarization /
    before_measure_flip_probability / after_reset_flip_probability turns on
    genuine circuit-level noise (gate noise, measurement noise, reset
    noise) -- used starting with Experiment 11 to check whether the
    scaling results found under the simplified model still hold under a
    more realistic noise model.
    """
    if distance < 2:
        raise ValueError("distance must be >= 2")
    if rounds < 1:
        raise ValueError("rounds must be >= 1")
    if not (0 < p0 < 0.75):
        raise ValueError("This starter expects 0 < p0 < 0.75")
    if basis not in {"x", "z"}:
        raise ValueError("basis must be 'x' or 'z'")

    return stim.Circuit.generated(
        f"surface_code:rotated_memory_{basis}",
        distance=distance,
        rounds=rounds,
        before_round_data_depolarization=p0,
        after_clifford_depolarization=after_clifford_depolarization,
        before_measure_flip_probability=before_measure_flip_probability,
        after_reset_flip_probability=after_reset_flip_probability,
    )


def _extra_depolarizing_probability(p0: float, p_target: float) -> float:
    """Extra DEPOLARIZE1 probability q such that D(q)∘D(p0)=D(p_target).

    Stim's DEPOLARIZE1(p) applies I with 1-p and each X/Y/Z with p/3.
    Composition gives p_target = p0 + q - (4/3) p0 q.
    """
    if not (0 <= p0 < 0.75):
        raise ValueError("p0 must be in [0, 0.75)")
    if not (p0 <= p_target < 0.75):
        raise ValueError("p_target must satisfy p0 <= p_target < 0.75")
    denom = 1.0 - 4.0 * p0 / 3.0
    q = (p_target - p0) / denom
    if not (0 <= q < 0.75):
        raise ValueError(f"Required extra depolarization q={q} is invalid")
    return q


_TICKS_PER_ROUND = 7
# Empirically verified (see git history / CLAUDE.md) for Stim's
# "surface_code:rotated_memory_*" circuit family across d=3,5,7,9, both
# with and without circuit-level noise enabled: each syndrome-extraction
# round is always exactly 7 TICK-separated layers, and the per-round
# background noise (before_round_data_depolarization) always lands
# immediately after the round's FIRST tick, before any gate/measurement
# noise for that round. This is what lets round boundaries be found
# reliably even when after_clifford_depolarization / measurement /
# reset noise are also enabled (which -- unlike TICK count -- change how
# many DEPOLARIZE1/DEPOLARIZE2/X_ERROR/Z_ERROR lines appear per round, so
# counting those directly, as an earlier version of this function did,
# breaks under circuit-level noise).


def _round_tick_positions(background_circuit) -> tuple[list[str], list[int]]:
    """Flatten background_circuit and return (lines, tick_indices) where
    tick_indices[k] is the line index of round k's FIRST tick -- the point
    where per-round noise (background or burst) gets inserted."""
    flat = background_circuit.flattened()
    lines = str(flat).splitlines()

    all_ticks = [i for i, line in enumerate(lines) if line.strip() == "TICK"]
    if len(all_ticks) % _TICKS_PER_ROUND != 0:
        raise RuntimeError(
            f"Expected a multiple of {_TICKS_PER_ROUND} TICKs, got {len(all_ticks)} -- "
            "the circuit structure this function assumes may have changed."
        )
    rounds = len(all_ticks) // _TICKS_PER_ROUND
    round_start_ticks = [all_ticks[r * _TICKS_PER_ROUND] for r in range(rounds)]
    return lines, round_start_ticks


def inject_burst(background_circuit, *, p0: float, burst: BurstSpec):
    """Return a circuit with a CONSTANT extra noise level inserted at the
    start of each targeted round (immediately after that round's first
    TICK, the same point where the round's own background noise is
    inserted by Stim's circuit generator -- see _TICKS_PER_ROUND above).
    """
    if burst.duration < 1:
        raise ValueError("burst.duration must be >= 1")
    if burst.start_round < 0:
        raise ValueError("burst.start_round must be >= 0")

    round_p_targets = [burst.p_burst] * burst.duration
    return inject_burst_profile(
        background_circuit, p0=p0, qubits=burst.qubits,
        start_round=burst.start_round, round_p_targets=round_p_targets,
    )


def inject_burst_profile(
    background_circuit, *, p0: float, qubits: tuple[int, ...],
    start_round: int, round_p_targets: list[float],
):
    """Generalization of inject_burst: round_p_targets[i] is the target
    total depolarizing probability for round (start_round + i), letting the
    burst strength vary round-to-round -- e.g. an exponential-decay
    temporal profile (see exponential_decay_profile below) instead of a
    constant plateau. round_p_targets values equal to p0 are a no-op for
    that round (no extra noise inserted).
    """
    if start_round < 0:
        raise ValueError("start_round must be >= 0")
    if not round_p_targets:
        raise ValueError("round_p_targets must be non-empty")

    lines, round_start_ticks = _round_tick_positions(background_circuit)
    duration = len(round_p_targets)
    if start_round + duration > len(round_start_ticks):
        raise ValueError(
            f"Burst extends past available rounds: have {len(round_start_ticks)}, "
            f"requested end={start_round + duration}"
        )

    targets = " ".join(str(q) for q in qubits)
    insertions: dict[int, str] = {}
    for offset, p_target in enumerate(round_p_targets):
        if p_target <= p0:
            continue  # no extra noise this round
        q_extra = _extra_depolarizing_probability(p0, p_target)
        line_index = round_start_ticks[start_round + offset]
        insertions[line_index] = f"DEPOLARIZE1({q_extra:.17g}) {targets}"

    out = []
    for i, line in enumerate(lines):
        out.append(line)
        if i in insertions:
            out.append(insertions[i])

    return stim.Circuit("\n".join(out) + "\n")


def exponential_decay_profile(p0: float, p_peak: float, tau: float, n_rounds: int) -> list[float]:
    """Round-by-round p(t) = p0 + (p_peak - p0) * exp(-t/tau) for t =
    0, 1, ..., n_rounds-1, matching a hardware transient that jumps to
    p_peak and relaxes back toward background with time constant tau
    (in rounds). Feed directly into inject_burst_profile's round_p_targets.
    """
    if tau <= 0:
        raise ValueError("tau must be positive")
    import math
    return [p0 + (p_peak - p0) * math.exp(-t / tau) for t in range(n_rounds)]
