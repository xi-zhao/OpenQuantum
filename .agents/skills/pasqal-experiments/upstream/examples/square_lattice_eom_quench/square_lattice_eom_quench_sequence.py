#!/usr/bin/env python3
"""EOM quench on an N×N square lattice — sequence builder + observable.

Extracted from `qpu-submit/support/submit_qpu.py`, which used to hard-code this
one experiment. It now lives here as a normal pipeline artifact: the same
`build_sequence` / `compute_observable` pair that `spec-to-sequence` produces,
consumed unchanged by validate-emu, qpu-submit and harvest-and-analyze.

Physics — a transverse-field Ising quench. The lattice spacing is chosen so
that the interaction sets the requested hx/J ratio, the drive is switched on
instantaneously in EOM mode at the mean-field detuning of the central site, and
the observable is the lattice-averaged Rydberg occupation ⟨n⟩ as a function of
the quench duration.

`omega_offset` and `delta_offset` are the calibration hooks: qpu-submit measures
them on hardware and passes them in, noise-emulate replays the same values so
the emulation matches what the QPU actually ran.
"""
from __future__ import annotations

import numpy as np
import pulser
from pulser import Register, Sequence
from pulser.devices import AnalogDevice
from pulser.register.special_layouts import SquareLatticeLayout

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

# Module-level constants closed over by compute_observable. The observable is
# geometry-independent here (a lattice average), so only N matters.
_N_SIDE = 5


def _square_coords(n_side: int, spacing: float) -> np.ndarray:
    return np.asarray(SquareLatticeLayout(n_side, n_side, spacing).coords)


def _build_register(n_side: int, spacing: float, device) -> Register:
    """N×N square register, laid out on traps the device can actually produce.

    The original submission script wrapped this in a hand-built checkerboard
    trap layout, but then called `with_automatic_layout` whenever the spacing
    was under 10 µm — which it always is at these parameters — so the
    hand-built layout was discarded every time. Only the automatic layout is
    kept here.
    """
    coords = _square_coords(n_side, spacing)
    reg    = Register.from_coordinates(coords, prefix="q")

    from pulser.devices import Device, VirtualDevice
    if isinstance(device, Device) and not isinstance(device, VirtualDevice):
        reg = reg.with_automatic_layout(device)
    return reg


def build_sequence(
    device=None,
    omega_offset: float = 1.0,
    delta_offset: float = 0.0,
    R_offset: float = 1.0,
    **params,
) -> pulser.Sequence:
    """Build the EOM quench sequence.

    device       : live Device from the cloud SDK, or None for local validation.
    omega_offset : multiplicative correction on Ω from calibration (1.0 = nominal).
    delta_offset : additive correction on the detuning, in MHz (0.0 = nominal).
    R_offset     : multiplicative correction on the lattice spacing.
    params       : N (atoms per side), hx (transverse-field ratio hx/J),
                   omega_max_mhz, t_ns (quench duration).
    """
    dev     = device or AnalogDevice
    n_side  = int(params.get("N", _N_SIDE))
    hx      = float(params["hx"])
    t_ns    = int(params["t_ns"])
    omega   = 2 * np.pi * float(params["omega_max_mhz"])

    C6      = dev.interaction_coeff
    spacing = (hx * 2 * C6 / (4 * omega)) ** (1 / 6) * R_offset

    # Mean-field detuning: the interaction energy a central atom feels when all
    # its neighbours are excited.
    coords = _square_coords(n_side, spacing)
    centre = (n_side // 2) * n_side + (n_side // 2)
    dist   = np.linalg.norm(coords - coords[centre], axis=-1)
    dist[centre] = np.inf
    delta  = C6 * np.sum(1.0 / dist**6) + 2 * np.pi * delta_offset

    seq = Sequence(_build_register(n_side, spacing, dev), dev)
    seq.declare_channel("ising", "rydberg_global")
    seq.enable_eom_mode("ising", amp_on=omega * omega_offset, detuning_on=delta)
    seq.add_eom_pulse("ising", duration=t_ns, phase=0.0)
    seq.disable_eom_mode("ising")
    return seq


def compute_observable(counts: dict[str, int]) -> float:
    """Lattice-averaged Rydberg occupation ⟨n⟩.

    Characters other than '0'/'1' are detection failures and are skipped rather
    than counted as ground state.
    """
    excited = 0
    measured = 0
    for bitstring, count in counts.items():
        for char in bitstring:
            if char == "1":
                excited += count
                measured += count
            elif char == "0":
                measured += count
    return excited / measured if measured else float("nan")


if __name__ == "__main__":
    import json
    from pathlib import Path

    spec = json.loads(
        (Path(__file__).parent / "square_lattice_eom_quench_spec.json").read_text())
    scan = spec["scan"]
    mid  = scan["values"][len(scan["values"]) // 2]
    seq  = build_sequence(device=None, **{**scan["fixed_params"], scan["variable"]: mid})
    n    = len(seq.register.qubit_ids)
    print(f"Sequence OK: {seq.get_duration()} ns, {n} atoms")

    # Asserted, not just printed: a value nobody compares lets a broken
    # observable pass CI while still looking plausible.
    failures = []
    for label, counts, want in (("vacuum", {"0" * n: 100}, 0.0),
                                ("all up", {"1" * n: 100}, 1.0)):
        got = compute_observable(counts)
        ok = abs(got - want) <= 1e-12
        print(f"  {'ok  ' if ok else 'FAIL'} compute_observable ({label}): "
              f"{got:.4f} (expect {want:.4f})")
        if not ok:
            failures.append(label)
    if failures:
        raise SystemExit(f"✘ compute_observable wrong for: {', '.join(failures)}")
