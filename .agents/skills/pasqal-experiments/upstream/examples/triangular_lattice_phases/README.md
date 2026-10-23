# Three-sublattice order on a triangular array

An adiabatic detuning ramp drives a 49-atom rhombic patch of the triangular
lattice from the disordered phase into the √3×√3 three-sublattice (1/3-filling)
density wave, and the order parameter is read out per shot.

> S. Guo *et al.*, *Order-by-disorder and emergent Kosterlitz-Thouless phase in
> a triangular Rydberg array*, [arXiv:2302.08963](https://arxiv.org/abs/2302.08963)
> (2023).

## Why it is here

This is the corrected form of an experiment the pipeline had already attempted
once. The earlier iteration survives, unchanged, as reference material inside
`spec-to-sequence`:

- [`skills/spec-to-sequence/references/guo_triangular_sqrt3_sequence.py`](../../skills/spec-to-sequence/references/guo_triangular_sqrt3_sequence.py)
- [`skills/spec-to-sequence/references/guo_triangular_analysis.py`](../../skills/spec-to-sequence/references/guo_triangular_analysis.py)

Those files stay where they are: the skill cites them as patterns for a
triangular register, an adiabatic ramp stack and a structure factor, and they are
useful for exactly that. What they are not is a runnable experiment — and the gap
between the two is the point of this directory.

## Files

| File | Role |
|---|---|
| `triangular_lattice_phases_spec.json` | the spec, as `idea-to-spec` would emit it |
| `triangular_lattice_phases_sequence.py` | `build_sequence()` + `compute_observable()`, as `spec-to-sequence` would emit it |

Run the sequence file directly for its smoke test — no QPU, no credentials. It
compares the observable against values that are known analytically and **exits
non-zero** if any of them moves, so `scripts/check.sh` runs it on every push:

```bash
python triangular_lattice_phases_sequence.py
# Sequence OK: 2200 ns, 49 atoms
# register: N=49, max radial 27.5 µm, R_b/a = 1.21
#   ok   perfect order, sublattice 0, ⟨|m|⟩: 1.0196 (expect 1.0000 ± 0.05)
#   ok   perfect order, sublattice 1, ⟨|m|⟩: 0.9897 (expect 1.0000 ± 0.05)
#   ok   perfect order, sublattice 2, ⟨|m|⟩: 0.9897 (expect 1.0000 ± 0.05)
#   ok   empty register, ⟨|m|⟩: 0.0000 (expect 0.0000 ± 1e-12)
#   ok   uncorrelated 1/3 filling, ⟨|m|⟩ at the finite-size floor: 0.1763 (expect 0.1790 ± 0.03)
```

The last line is what a *disordered* array measures — see "Reading the
observable" below for why that matters.

## Running it

The standard pipeline. Nothing here is special to any skill:

```bash
# emulate first — this is the gate, not a formality
python <skills>/validate-emu/support/run_emu_scan.py \
    --spec      triangular_lattice_phases_spec.json \
    --seq-file  triangular_lattice_phases_sequence.py \
    --out-dir   results/triangular_lattice_phases/emu/

# then hardware
python <skills>/qpu-submit/support/submit_qpu.py \
    --spec      triangular_lattice_phases_spec.json \
    --seq-file  triangular_lattice_phases_sequence.py \
    --out-dir   results/triangular_lattice_phases/qpu/

# then collect and compare
python <skills>/harvest-and-analyze/support/harvest_qpu.py \
    --spec      triangular_lattice_phases_spec.json \
    --seq-file  triangular_lattice_phases_sequence.py \
    --batch-ids results/triangular_lattice_phases/qpu/batch_ids.json \
    --emu-dir   results/triangular_lattice_phases/emu/ \
    --out-dir   results/triangular_lattice_phases/qpu/
```

## What the earlier iteration got wrong

**The observable was the one the physics cannot use.** The reference files
compute S(K), the shot-averaged structure factor, plus a mean density. The
ordered phase here is three-fold degenerate — the three sublattice domains carry
phases {0, 2π/3, 4π/3} — so a quantity averaged across shots is averaging over
domains that are each perfectly ordered. This example instead forms the
three-sublattice order parameter **per shot**,

```
m = (3/N) Σ_j (n_j - n̄) exp(i K·r_j),   K = (4π/3a)(1,0)
```

and reports ⟨|m|⟩: the modulus taken *before* the average, so degenerate domains
add instead of cancelling.

**The analysis module could not be imported at all.** As shipped,
`guo_triangular_analysis.py` opened with
`from sequences.guo_triangular_sqrt3_sequence import …`. There is no `sequences`
package in this repository, so importing it raised `ModuleNotFoundError` — it was
written against a layout that no longer exists. The import has since been
corrected in place, so the file is at least readable as the pattern the skill
cites it for.

**Neither file satisfies the pipeline contract.** They export
`build_guo_sequence`, not `build_sequence`, and no `compute_observable` at all.
The builder declares no `omega_offset`/`delta_offset`, which `qpu-submit`
requires and refuses to submit without — a builder that silently ignored them
would run *uncalibrated* on hardware. And the sequence is parametric
(`seq.declare_variable("tau_ns")`), whereas the pipeline submits one batch per
scan point and expects a concrete sequence back.

**Devices were selected by string.** A `device_str` argument imported
`FRESNEL_CAN1` or `Ruby` from `pulser.devices` — which that file's own docstring
admits Pulser does not ship. This builder takes the live device object the cloud
SDK returns, and falls back to Pulser's bundled analog device for local work.

**Nothing checked whether the register fits.** This one validates the atom count
and the radial extent against whatever device it is handed, and names the fix in
the error:

```
register reaches 41.3 µm but AnalogDevice caps radial distance at 38 µm.
Reduce L (currently 10) or target a larger device
```

It also asserts that atom *order* survives trap assignment, because
`compute_observable` reconstructs coordinates by index — a reordering would
return a plausible, wrong ⟨|m|⟩ rather than fail.

## Reading the observable

⟨|m|⟩ has a floor, and it is not small. For a disordered shot |m| is Rayleigh
distributed with mean √(π/2N) — **0.179 on 49 atoms**. So a measured ⟨|m|⟩ of 0.18
here is not weak order, it is no order at all. The smoke test prints the floor
next to the measurement so that comparison cannot be skipped.

Taking the modulus *per shot* is the other thing the smoke test protects. Average
`m` itself instead — the natural mistake, and what any shot-averaged quantity
amounts to here — and sublattice 0 still reads 1.0 while sublattices 1 and 2
collapse, because their domain phases are no longer folded in.

## Parameters, and why these

**a = 5.3 µm is not copied from the paper, it is derived from the regime.** At
Ω = 2π×2 MHz and the FRESNEL_CAN1-class C₆, the blockade radius is R_b = 6.4 µm,
so a = 5.3 µm gives **R_b/a = 1.21**: an atom blockades its six nearest
neighbours but not the next-nearest, which is what selects three-sublattice order
over anything else. Guo *et al.* quote R_b ≈ 1.2a. The earlier iteration used
a = 5.0 µm, exactly at the minimum trap spacing, with no margin.

**N = 49 (L = 7) is the FRESNEL_CAN1-class variant.** L = 10 (N = 100) reaches
41.3 µm and needs an SA1-class field of view; the builder refuses it on smaller
devices rather than letting the submission fail later.

**τ stops at 5800 ns** so that the sweep plus the two 100 ns amplitude edges fits
a 6000 ns maximum sequence duration.

The register was sized against Pulser's bundled `AnalogDevice` as a stand-in, not
against live device specifications. `validate-emu` runs against the real device
and will reject the spec if it is tighter than assumed.
