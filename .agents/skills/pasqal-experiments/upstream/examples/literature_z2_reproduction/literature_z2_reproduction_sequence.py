#!/usr/bin/env python3
"""Z₂ ordering on a Rydberg ring — builder + correlator observable.

Reproduces the protocol of

    A. Keesling et al., "Quantum Kibble-Zurek mechanism and critical dynamics
    on a programmable Rydberg simulator", Nature 568, 207 (2019).

A linear detuning ramp of duration τ drives the array across the transition into
the Z₂ (period-2) density wave. The correlation length ξ extracted from the
connected density-density correlator

    G(r) = (1/N) Σ_i [ ⟨n_i n_{i+r}⟩ - ⟨n_i⟩⟨n_{i+r}⟩ ],   indices mod N

grows with τ; its scaling is the Kibble-Zurek signature. `compute_observable`
returns that ξ, in lattice sites.

**The register is a ring, not a chain.** With periodic boundaries every atom has
the same two neighbours, so G(r) is a clean average over N equivalent pairs. On
an open chain the ends order differently from the bulk and that bias grows
exactly where ξ is largest — the regime the experiment is about.

`omega_offset` and `delta_offset` are the calibration hooks: qpu-submit measures
them on hardware and passes them in, noise-emulate replays the same values so
the emulation matches what the QPU actually ran.
"""
from __future__ import annotations

import numpy as np
import pulser
from pulser import Pulse, Register, Sequence
from pulser.devices import MockDevice
from pulser.waveforms import ConstantWaveform, RampWaveform

# Provenance: marks every serialized sequence as produced by this toolkit.
# 0.0.0 is a deliberate sentinel — this file is committed, not generated, so it
# claims no toolkit release. A generated sequence writes the real version here,
# and its smoke test rejects 0.0.0: copy the header, never the version.
try:
    from pulser.sequence.metadata import store_package_version_metadata
except ImportError:      # older pulser has no sequence metadata
    pass
else:
    store_package_version_metadata("neutral-atom-toolkit", "0.0.0")

# Module-level geometry, closed over by compute_observable: a bitstring carries
# no geometry, so the atom count the observable assumes and the one the builder
# places have to agree by construction.
_N_ATOMS = 56
_SPACING_UM = 5.1

_RAMP_NS = 100


def _ring_coords(n_atoms: int, spacing_um: float) -> np.ndarray:
    """(N,2) coordinates in µm. Atom i sits at angle 2πi/N, so the geometric
    neighbours of atom i are atoms (i±1) mod N and the bitstring index *is* the
    ring position.

    The nearest-neighbour chord is `spacing_um`, which fixes the radius at
    R = a / (2 sin(π/N)) — the constraint that makes a large ring expensive in
    field of view: R grows like N·a/2π.
    """
    radius = spacing_um / (2.0 * np.sin(np.pi / n_atoms))
    theta = 2 * np.pi * np.arange(n_atoms) / n_atoms
    return np.stack([radius * np.cos(theta), radius * np.sin(theta)], axis=-1)


def _build_register(n_atoms: int, spacing_um: float, device) -> Register:
    coords = _ring_coords(n_atoms, spacing_um)

    reach = float(np.linalg.norm(coords, axis=1).max())
    cap = getattr(device, "max_radial_distance", None)
    if cap is not None and reach > cap:
        raise ValueError(
            f"a {n_atoms}-atom ring at {spacing_um} µm spacing needs a radius of "
            f"{reach:.1f} µm, but {getattr(device, 'name', device)} caps radial "
            f"distance at {cap} µm. Reduce N or target a larger device — see "
            f"README.md for the 56/96-atom variants."
        )
    n_max = getattr(device, "max_atom_num", None)
    if n_max is not None and n_atoms > n_max:
        raise ValueError(
            f"{n_atoms} atoms exceeds the {getattr(device, 'name', device)} "
            f"limit of {n_max}."
        )

    reg = Register.from_coordinates(coords, prefix="q")
    from pulser.devices import Device, VirtualDevice
    if isinstance(device, Device) and not isinstance(device, VirtualDevice):
        reg = reg.with_automatic_layout(device)

    # G(r) is order-dependent: compute_observable treats bitstring position i as
    # ring position i. with_automatic_layout preserves order and coordinates
    # today; if that ever changes, fail here rather than return a plausible
    # wrong correlation length.
    placed = np.array([reg.qubits[qid] for qid in reg.qubit_ids], dtype=float)
    if placed.shape != coords.shape or not np.allclose(placed, coords, atol=1e-6):
        raise ValueError(
            "register placement reordered or moved the atoms, which would "
            "silently invalidate the ring distances in compute_observable"
        )
    return reg


def build_sequence(
    device=None,
    omega_offset: float = 1.0,
    delta_offset: float = 0.0,
    R_offset: float = 1.0,
    **params,
) -> pulser.Sequence:
    """Build the Kibble-Zurek detuning ramp.

    device       : live Device from the cloud SDK, or None for local validation.
                   The local default is Pulser's unconstrained MockDevice, not
                   AnalogDevice: a 56-atom ring needs a ~45 µm radius and
                   AnalogDevice caps radial distance at 38 µm, so the bundled
                   analog stand-in cannot hold this register at all.
    omega_offset : multiplicative correction on Ω from calibration (1.0 = nominal).
    delta_offset : additive correction on the detuning, in MHz (0.0 = nominal).
    R_offset     : multiplicative correction on the ring spacing.
    params       : N_atoms, spacing_um, omega_max_mhz, delta_i_mhz, delta_f_mhz,
                   tau_ns (sweep duration).
    """
    dev = device or MockDevice
    n_atoms = int(params.get("N_atoms", _N_ATOMS))
    spacing = float(params.get("spacing_um", _SPACING_UM)) * R_offset
    tau_ns = int(params["tau_ns"])

    omega = 2 * np.pi * float(params["omega_max_mhz"]) * omega_offset
    delta_i = 2 * np.pi * (float(params["delta_i_mhz"]) + delta_offset)
    delta_f = 2 * np.pi * (float(params["delta_f_mhz"]) + delta_offset)

    seq = Sequence(_build_register(n_atoms, spacing, dev), dev)
    seq.declare_channel("ising", "rydberg_global")

    # Ω is ramped rather than switched: hardware rejects a sudden jump, and here
    # a jump would also inject the excitations the slow sweep exists to avoid.
    seq.add(Pulse(RampWaveform(_RAMP_NS, 0.0, omega),
                  ConstantWaveform(_RAMP_NS, delta_i), 0.0), "ising")
    seq.add(Pulse(ConstantWaveform(tau_ns, omega),
                  RampWaveform(tau_ns, delta_i, delta_f), 0.0), "ising")
    seq.add(Pulse(RampWaveform(_RAMP_NS, omega, 0.0),
                  ConstantWaveform(_RAMP_NS, delta_f), 0.0), "ising")
    return seq


def correlation_function(counts: dict[str, int],
                        n_atoms: int = _N_ATOMS) -> np.ndarray:
    """G(r) for r = 0 … N//2, averaged over the ring. G(0) is the variance.

    Only r ≤ N//2 is returned: on a ring G(r) = G(N-r), so the rest is redundant.

    A single bitstring, however ordered, gives G(r) = 0 for every r > 0 — the
    correlator is *connected*, so it measures fluctuations across shots, not the
    pattern within one. Z₂ order shows up as the two degenerate domains
    appearing with equal weight, which is what makes G(r) alternate in sign.
    """
    total = 0
    first = np.zeros(n_atoms)
    second = np.zeros((n_atoms, n_atoms))
    for bitstring, count in counts.items():
        if len(bitstring) < n_atoms:
            continue  # detection failure: skip rather than zero-pad
        bits = np.fromiter((1.0 if c == "1" else 0.0 for c in bitstring[:n_atoms]),
                           dtype=float, count=n_atoms)
        first += count * bits
        second += count * np.outer(bits, bits)
        total += count
    if total == 0:
        return np.full(n_atoms // 2 + 1, np.nan)

    first /= total
    second /= total
    connected = second - np.outer(first, first)

    index = np.arange(n_atoms)
    return np.array([connected[index, (index + r) % n_atoms].mean()
                     for r in range(n_atoms // 2 + 1)])


def register_size_from_counts(counts: dict[str, int]) -> int:
    """Register size read off the shots, not assumed from the module constant.

    The same sequence file is emulated at reduced N — locally, where 56 atoms do
    not fit, or on a device that caps out lower — and the bitstrings get shorter
    with it. An observable that kept comparing against `_N_ATOMS` would skip
    every shot and return nan, which reads as "no signal" rather than "wrong
    size": a downsized run would look like failed physics. Take the modal length,
    so a handful of truncated detections cannot redefine the register.
    """
    weight: dict[int, int] = {}
    for bitstring, count in counts.items():
        weight[len(bitstring)] = weight.get(len(bitstring), 0) + count
    return max(weight, key=weight.get) if weight else 0


def compute_observable(counts: dict[str, int]) -> float:
    """Z₂ correlation length ξ, in lattice sites.

    ξ comes from a straight-line fit of ln|G(r)| against r, since Z₂ order decays
    as G(r) ~ (-1)^r exp(-r/ξ). Points are used only while |G(r)| stays above the
    shot-noise level of the data, so the fit is not dragged by the tail.

    ξ is capped at N/2, the largest separation the ring can resolve: a longer
    correlation length is indistinguishable from true long-range order here, and
    reporting `inf` would poison the downstream scan comparison.
    """
    n_atoms = register_size_from_counts(counts)
    if n_atoms < 4:                      # too short to fit three usable radii
        return float("nan")

    total = sum(count for bits, count in counts.items() if len(bits) >= n_atoms)
    if total == 0:
        return float("nan")

    correlator = correlation_function(counts, n_atoms)
    ceiling = n_atoms / 2.0

    # Connected correlators are averages of bounded products, so their standard
    # error scales as 1/sqrt(shots); 2σ is where the tail stops carrying signal.
    noise_floor = 2.0 / np.sqrt(total)

    usable_r, usable_log = [], []
    for r in range(1, n_atoms // 2 + 1):
        magnitude = abs(correlator[r])
        if not np.isfinite(magnitude) or magnitude < noise_floor:
            break
        usable_r.append(r)
        usable_log.append(np.log(magnitude))

    if len(usable_r) < 3:
        return float("nan")

    slope = np.polyfit(usable_r, usable_log, 1)[0]
    if slope >= 0:
        return ceiling  # no decay resolved: ordered beyond this ring's reach
    return float(min(-1.0 / slope, ceiling))


def _domain_wall_ensemble(n_atoms: int, xi: float, shots: int,
                          rng: np.random.Generator) -> dict[str, int]:
    """Synthetic Z₂ ensemble whose correlation length is known analytically.

    Walk around the ring flipping the Z₂ sublattice with probability p per bond.
    Two sites r apart agree unless an odd number of flips separates them, which
    gives correlations decaying as (1-2p)^r — that is, ξ = -1/ln(1-2p).

    The wall count is forced even. An odd count cannot close a ring: the walk
    would come back out of phase with itself, leaving one inconsistent bond, and
    pairs straddling it would read as uncorrelated. That seam suppresses G(r) by
    a factor (1 - r/N) and biases the recovered ξ low by several percent — an
    artefact of the generator that would otherwise look like a flaw in the fit.
    """
    p = (1.0 - np.exp(-1.0 / xi)) / 2.0
    counts: dict[str, int] = {}
    for _ in range(shots):
        while True:
            walls = rng.random(n_atoms) < p
            if walls.sum() % 2 == 0:
                break
        phase = (np.cumsum(walls) - walls) % 2      # flips strictly before site i
        phase = (phase + int(rng.integers(0, 2))) % 2
        bits = "".join("1" if (i + phase[i]) % 2 == 0 else "0"
                       for i in range(n_atoms))
        counts[bits] = counts.get(bits, 0) + 1
    return counts


def _expect(label: str, got: float, want: float, tol: float,
            failures: list[str]) -> None:
    """Print a measured value against its analytic target, and record a failure.

    The smoke test asserts rather than reports: a printed number nobody compares
    would let a broken observable pass CI while still looking plausible.
    """
    ok = abs(got - want) <= tol
    print(f"  {'ok  ' if ok else 'FAIL'} {label}: {got:+.4f} "
          f"(expect {want:+.4f} ± {tol:g})")
    if not ok:
        failures.append(label)


if __name__ == "__main__":
    import json
    from pathlib import Path

    spec = json.loads(
        (Path(__file__).parent / "literature_z2_reproduction_spec.json").read_text())
    scan = spec["scan"]
    mid = scan["values"][len(scan["values"]) // 2]
    seq = build_sequence(device=None, **{**scan["fixed_params"], scan["variable"]: mid})
    n = len(seq.register.qubit_ids)
    print(f"Sequence OK: {seq.get_duration()} ns, {n} atoms")

    coords = _ring_coords(_N_ATOMS, _SPACING_UM)
    from pulser.devices import AnalogDevice
    r_b = (AnalogDevice.interaction_coeff
           / (2 * np.pi * scan["fixed_params"]["omega_max_mhz"])) ** (1 / 6)
    print(f"ring: N={_N_ATOMS}, radius {np.linalg.norm(coords, axis=1).max():.1f} µm, "
          f"R_b/a = {r_b / _SPACING_UM:.2f}  (Z₂ lobe: 1 < R_b/a < 2)")

    failures: list[str] = []

    # The two degenerate Z₂ domains in equal weight: perfect long-range order,
    # so G(r) must be exactly (-1)^r/4 with no decay, and ξ must saturate.
    even = "".join("1" if i % 2 == 0 else "0" for i in range(_N_ATOMS))
    ideal = {even: 500, even.translate(str.maketrans("01", "10")): 500}
    g = correlation_function(ideal, _N_ATOMS)
    for r in (1, 2, 3):
        _expect(f"ideal Z₂, G({r})", g[r], 0.25 * (-1) ** r, 1e-9, failures)
    _expect("ideal Z₂, ξ capped at N/2", compute_observable(ideal),
            _N_ATOMS / 2, 1e-9, failures)

    # One domain alone: the connected correlator is identically zero, which is a
    # property of G, not a bug — see correlation_function's docstring. This is
    # also the check that fails first if the disconnected part stops being
    # subtracted, which would turn G into a plain occupation product.
    _expect("single domain, G(1) (nothing fluctuates)",
            correlation_function({even: 500}, _N_ATOMS)[1], 0.0, 1e-12, failures)

    # The same observable on a smaller ring, because every route to hardware
    # passes through a downsized run: an exact local emulator holds nothing like
    # 56 atoms. N is inferred from the bitstring length, so this is the check
    # that the inference works — reading it from the module constant instead
    # skips every shot and returns nan, which reads as "no order" rather than
    # "wrong size". G(r) = (-1)^r/4 is N-independent for perfect Z₂ order; the ξ
    # ceiling is not, and must follow the ring it was measured on.
    small = 20
    even_small = "".join("1" if i % 2 == 0 else "0" for i in range(small))
    ideal_small = {even_small: 500,
                   even_small.translate(str.maketrans("01", "10")): 500}
    g_small = correlation_function(ideal_small, small)
    for r in (1, 2):
        _expect(f"N=20 ring, ideal Z₂, G({r})", g_small[r], 0.25 * (-1) ** r,
                1e-9, failures)
    _expect("N=20 ring, ξ capped at its own N/2", compute_observable(ideal_small),
            small / 2, 1e-9, failures)

    rng = np.random.default_rng(0)
    for target, tol in ((2.0, 0.15), (4.0, 0.40)):
        recovered = compute_observable(
            _domain_wall_ensemble(_N_ATOMS, target, 4000, rng))
        _expect(f"synthetic ensemble, recovered ξ (target {target:.1f})",
                recovered, target, tol, failures)

    # MockDevice enforces nothing, so the pulse amplitudes and durations above
    # are still unchecked. Rebuild the longest sweep on a real constrained device
    # at the largest N that fits its field of view, which does exercise them.
    reduced = 40
    longest = max(scan["values"])
    seq = build_sequence(device=AnalogDevice,
                         **{**scan["fixed_params"], "N_atoms": reduced,
                            scan["variable"]: longest})
    print(f"  on {AnalogDevice.name} (N={reduced}, τ={longest} ns): "
          f"{seq.get_duration()} ns — Ω, δ and duration all within device limits")
    try:
        build_sequence(device=AnalogDevice,
                       **{**scan["fixed_params"], scan["variable"]: longest})
        failures.append("a 56-atom ring was accepted by a 38 µm device")
        print(f"  FAIL N={_N_ATOMS} on {AnalogDevice.name} was not refused")
    except ValueError as exc:
        print(f"  ok   N={_N_ATOMS} on {AnalogDevice.name} refused: {exc}")

    if failures:
        raise SystemExit(f"✘ {len(failures)} check(s) failed: "
                         + "; ".join(failures))
