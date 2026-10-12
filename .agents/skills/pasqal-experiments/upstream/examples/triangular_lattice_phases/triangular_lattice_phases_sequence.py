#!/usr/bin/env python3
"""Three-sublattice order on a triangular Rydberg array — builder + observable.

Reproduces the equilibrium part of the protocol in

    S. Guo et al., "Order-by-disorder and emergent Kosterlitz-Thouless phase
    in a triangular Rydberg array", arXiv:2302.08963 (2023).

An adiabatic detuning ramp drives a rhombic patch of the triangular lattice from
the disordered phase into the √3×√3 three-sublattice (1/3-filling) density wave,
and the order parameter is read out from end-of-sequence bitstrings.

The observable is the **per-shot** three-sublattice order parameter

    m = (3/N) Σ_j (n_j - n̄) exp(i K·r_j),      K = (4π/3a)(1, 0)

averaged as ⟨|m|⟩ over shots. Taking the modulus *before* averaging is the whole
point: the ordered phase is three-fold degenerate — the three domains carry
phases {0, 2π/3, 4π/3} — so ⟨m⟩ averages to zero over a symmetric mixture of
domains that are each perfectly ordered. See README.md for what this replaces.

`omega_offset` and `delta_offset` are the calibration hooks: qpu-submit measures
them on hardware and passes them in, noise-emulate replays the same values so
the emulation matches what the QPU actually ran.
"""
from __future__ import annotations

import numpy as np
import pulser
from pulser import Pulse, Register, Sequence
from pulser.devices import AnalogDevice
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

# Module-level geometry, closed over by compute_observable. The observable needs
# the atom coordinates in the same order as the bitstrings, and a bitstring
# carries no geometry, so the two have to agree by construction here.
_L = 7
_SPACING_UM = 5.3

# Pulser expresses amplitude and detuning in rad/µs (= 2π × MHz); durations in ns.
_RAMP_NS = 100


def _rhombus_coords(L: int, spacing_um: float) -> np.ndarray:
    """(N,2) coordinates in µm, centred on the origin. Atom order is i*L + j.

    Rhombic patch of the triangular Bravais lattice a1 = (a, 0),
    a2 = (a/2, a√3/2) — the patch shape Guo et al. use, and the one whose
    three-sublattice partition is exact.
    """
    a1 = np.array([spacing_um, 0.0])
    a2 = np.array([spacing_um * 0.5, spacing_um * np.sqrt(3) / 2.0])
    pts = np.array([i * a1 + j * a2 for i in range(L) for j in range(L)])
    return pts - pts.mean(axis=0)


def _ordering_wavevector(spacing_um: float) -> np.ndarray:
    """K = (4π/3a)(1,0) — the Brillouin-zone corner dual to the 3-sublattice split.

    K·a1 = 4π/3 and K·a2 = 2π/3, so K·r = (2π/3)(2i + j): the phase depends only
    on (2i + j) mod 3, which *is* the sublattice index.
    """
    return np.array([4.0 * np.pi / (3.0 * spacing_um), 0.0])


def _build_register(L: int, spacing_um: float, device) -> Register:
    coords = _rhombus_coords(L, spacing_um)

    reach = float(np.linalg.norm(coords, axis=1).max())
    cap = getattr(device, "max_radial_distance", None)
    if cap is not None and reach > cap:
        raise ValueError(
            f"register reaches {reach:.1f} µm but {getattr(device, 'name', device)} "
            f"caps radial distance at {cap} µm. Reduce L (currently {L}) or target "
            f"a larger device — see README.md for the 49/100-atom variants."
        )
    n_max = getattr(device, "max_atom_num", None)
    if n_max is not None and len(coords) > n_max:
        raise ValueError(
            f"{L}×{L} = {len(coords)} atoms exceeds the "
            f"{getattr(device, 'name', device)} limit of {n_max}."
        )

    reg = Register.from_coordinates(coords, prefix="q")
    from pulser.devices import Device, VirtualDevice
    if isinstance(device, Device) and not isinstance(device, VirtualDevice):
        reg = reg.with_automatic_layout(device)

    # This observable is order-dependent: compute_observable rebuilds the
    # coordinates by index, so bitstring position j must still be atom j.
    # with_automatic_layout preserves both order and coordinates today; if a
    # future device or Pulser release stops doing so, fail loudly here rather
    # than return a plausible wrong ⟨|m|⟩.
    placed = np.array([reg.qubits[qid] for qid in reg.qubit_ids], dtype=float)
    if placed.shape != coords.shape or not np.allclose(placed, coords, atol=1e-6):
        raise ValueError(
            "register placement reordered or moved the atoms, which would "
            "silently invalidate the sublattice phases in compute_observable"
        )
    return reg


def build_sequence(
    device=None,
    omega_offset: float = 1.0,
    delta_offset: float = 0.0,
    R_offset: float = 1.0,
    **params,
) -> pulser.Sequence:
    """Build the adiabatic ramp into the three-sublattice ordered phase.

    device       : live Device from the cloud SDK, or None for local validation.
    omega_offset : multiplicative correction on Ω from calibration (1.0 = nominal).
    delta_offset : additive correction on the detuning, in MHz (0.0 = nominal).
    R_offset     : multiplicative correction on the lattice spacing.
    params       : L (atoms per side), spacing_um, omega_max_mhz,
                   delta_i_mhz, delta_f_mhz, tau_ns (ramp duration).
    """
    dev = device or AnalogDevice
    L = int(params.get("L", _L))
    spacing = float(params.get("spacing_um", _SPACING_UM)) * R_offset
    tau_ns = int(params["tau_ns"])

    omega = 2 * np.pi * float(params["omega_max_mhz"]) * omega_offset
    delta_i = 2 * np.pi * (float(params["delta_i_mhz"]) + delta_offset)
    delta_f = 2 * np.pi * (float(params["delta_f_mhz"]) + delta_offset)

    seq = Sequence(_build_register(L, spacing, dev), dev)
    seq.declare_channel("ising", "rydberg_global")

    # Ω is ramped up and down over _RAMP_NS rather than switched: hardware
    # rejects a sudden jump, and a jump would inject the excitations the
    # adiabatic ramp exists to avoid.
    seq.add(Pulse(RampWaveform(_RAMP_NS, 0.0, omega),
                  ConstantWaveform(_RAMP_NS, delta_i), 0.0), "ising")
    seq.add(Pulse(ConstantWaveform(tau_ns, omega),
                  RampWaveform(tau_ns, delta_i, delta_f), 0.0), "ising")
    seq.add(Pulse(RampWaveform(_RAMP_NS, omega, 0.0),
                  ConstantWaveform(_RAMP_NS, delta_f), 0.0), "ising")
    return seq


def order_parameter_per_shot(bitstring: str, coords: np.ndarray,
                             K: np.ndarray) -> float:
    """|m| for a single shot. See the module docstring for the definition."""
    n = np.fromiter((1.0 if c == "1" else 0.0 for c in bitstring[:len(coords)]),
                    dtype=float, count=len(coords))
    # Subtracting the per-shot mean removes the k=0 component, which does not
    # cancel exactly on a patch whose side is not a multiple of 3.
    amplitude = np.sum((n - n.mean()) * np.exp(1j * (coords @ K)))
    return float(abs(amplitude)) * 3.0 / len(coords)


def side_from_counts(counts: dict[str, int]) -> int:
    """Rhombus side L read off the shots, not assumed from the module constant.

    The same sequence file gets emulated at reduced L — locally, where 49 atoms
    are far past an exact emulator's reach, or on a tighter device — and the
    bitstrings shrink with it. Comparing against `_L` instead would skip every
    shot and return nan, which reads as "no order" rather than "wrong size", so a
    downsized check would look like failed physics. Returns 0 when the shot
    length is not L², because then the geometry behind the bitstring is unknown
    and guessing it would silently mislabel every atom's position.

    The spacing needs no such treatment: K ∝ 1/a and r ∝ a, so K·r is unchanged
    by it.
    """
    weight: dict[int, int] = {}
    for bitstring, count in counts.items():
        weight[len(bitstring)] = weight.get(len(bitstring), 0) + count
    if not weight:
        return 0
    n_atoms = max(weight, key=weight.get)
    side = int(round(np.sqrt(n_atoms)))
    return side if side * side == n_atoms else 0


def compute_observable(counts: dict[str, int]) -> float:
    """⟨|m|⟩ — the three-sublattice order parameter, averaged over shots.

    Shots whose bitstring is the wrong length are detection failures and are
    skipped rather than zero-padded, which would fake a disordered shot.
    """
    side = side_from_counts(counts)
    if side == 0:
        return float("nan")
    coords = _rhombus_coords(side, _SPACING_UM)
    K = _ordering_wavevector(_SPACING_UM)
    total = 0
    acc = 0.0
    for bitstring, count in counts.items():
        if len(bitstring) < len(coords):
            continue
        acc += count * order_parameter_per_shot(bitstring, coords, K)
        total += count
    return acc / total if total else float("nan")


def observable_floor(n_atoms: int) -> float:
    """⟨|m|⟩ of a disordered register: |m| is Rayleigh, mean sqrt(π/2N)."""
    return float(np.sqrt(np.pi / (2 * n_atoms)))


def _expect(label: str, got: float, want: float, tol: float,
            failures: list[str]) -> None:
    """Print a measured value against its analytic target, and record a failure.

    The smoke test asserts rather than reports: a printed number nobody compares
    would let a broken observable pass CI while still looking plausible.
    """
    ok = abs(got - want) <= tol
    print(f"  {'ok  ' if ok else 'FAIL'} {label}: {got:.4f} "
          f"(expect {want:.4f} ± {tol:g})")
    if not ok:
        failures.append(label)


if __name__ == "__main__":
    import json
    from pathlib import Path

    spec = json.loads(
        (Path(__file__).parent / "triangular_lattice_phases_spec.json").read_text())
    scan = spec["scan"]
    mid = scan["values"][len(scan["values"]) // 2]
    seq = build_sequence(device=None, **{**scan["fixed_params"], scan["variable"]: mid})
    n = len(seq.register.qubit_ids)
    print(f"Sequence OK: {seq.get_duration()} ns, {n} atoms")

    coords = _rhombus_coords(_L, _SPACING_UM)
    K = _ordering_wavevector(_SPACING_UM)
    N = len(coords)
    print(f"register: N={N}, max radial {np.linalg.norm(coords, axis=1).max():.1f} µm, "
          f"R_b/a = {(AnalogDevice.interaction_coeff / (2*np.pi*2.0))**(1/6) / _SPACING_UM:.2f}")

    # A perfect three-sublattice pattern should saturate the order parameter,
    # an empty register should give exactly zero, and independent 1/3-filling
    # should sit at the finite-size floor: for a disordered shot |m| is Rayleigh
    # distributed with mean sqrt(π/(2N)), the level below which a measured ⟨|m|⟩
    # carries no evidence of order at all.
    failures: list[str] = []
    sub = (2 * (np.arange(N) // _L) + np.arange(N) % _L) % 3
    # L = 7 is not a multiple of 3, so the three sublattices differ by one atom
    # (17/16/16) and |m| lands within a couple of percent of 1 rather than on it.
    for s in (0, 1, 2):
        bits = "".join("1" if k == s else "0" for k in sub)
        _expect(f"perfect order, sublattice {s}, ⟨|m|⟩",
                compute_observable({bits: 100}), 1.0, 0.05, failures)
    _expect("empty register, ⟨|m|⟩", compute_observable({"0" * N: 100}),
            0.0, 1e-12, failures)

    rng = np.random.default_rng(0)
    random_counts: dict[str, int] = {}
    for _ in range(2000):
        b = "".join("1" if rng.random() < 1 / 3 else "0" for _ in range(N))
        random_counts[b] = random_counts.get(b, 0) + 1
    # A disordered shot has |m| Rayleigh distributed with mean sqrt(π/2N): the
    # level below which a measured ⟨|m|⟩ is no evidence of order whatsoever.
    _expect("uncorrelated 1/3 filling, ⟨|m|⟩ at the finite-size floor",
            compute_observable(random_counts), observable_floor(N),
            0.03, failures)

    # Same observable at a second register size, because every route to hardware
    # passes through a downsized run: a local emulator cannot hold 49 atoms. The
    # side is inferred from the bitstring length, so this is the check that the
    # inference works — before the fix it skipped every shot and returned nan,
    # which reads as "no order" rather than "wrong size". L = 3 *is* a multiple
    # of 3, so the sublattices are exactly equal and |m| lands on 1 rather than
    # near it.
    small = 3
    n_small = small * small
    sub_small = (2 * (np.arange(n_small) // small) + np.arange(n_small) % small) % 3
    for s in (0, 2):
        bits = "".join("1" if k == s else "0" for k in sub_small)
        _expect(f"L=3 patch, perfect order, sublattice {s}, ⟨|m|⟩",
                compute_observable({bits: 100}), 1.0, 1e-9, failures)
    _expect("L=3 patch, disordered floor is higher (sqrt(pi/2N))",
            compute_observable({
                "".join("1" if rng.random() < 1 / 3 else "0" for _ in range(n_small)): 1
                for _ in range(4000)}),
            observable_floor(n_small), 0.05, failures)
    _expect("bitstring length that is no square register, ⟨|m|⟩ is nan",
            float(np.isnan(compute_observable({"0" * 10: 100}))), 1.0, 0,
            failures)

    if failures:
        raise SystemExit(f"✘ {len(failures)} check(s) failed: "
                         + "; ".join(failures))
