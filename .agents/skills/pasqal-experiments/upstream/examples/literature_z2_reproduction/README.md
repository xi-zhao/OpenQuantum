# Z₂ ordering and Kibble-Zurek scaling on a ring

A linear detuning ramp of duration τ drives a 56-atom Rydberg ring across the
transition into the Z₂ (period-2) density wave. The correlation length ξ, read off
the connected correlator G(r), grows with τ — the Kibble-Zurek signature.

> A. Keesling *et al.*, *Quantum Kibble-Zurek mechanism and critical dynamics on a
> programmable Rydberg simulator*, Nature **568**, 207 (2019),
> [arXiv:1809.05540](https://arxiv.org/abs/1809.05540).

## Why it is here

An earlier iteration of this experiment aimed at a different phase and a
different observable. It survives, unchanged, as reference material inside
`spec-to-sequence`:

- [`skills/spec-to-sequence/references/chiral_potts_n21_sequence.py`](../../skills/spec-to-sequence/references/chiral_potts_n21_sequence.py)
  — Z₃ order on a ring, chiral-Potts universality, S(k = 2π/3)

The skill cites it as a pattern for a ring register, a ramp stack and a structure
factor, and it is worth reading for that. It is not a runnable experiment, and
the difference is what this directory records.

## Files

| File | Role |
|---|---|
| `literature_z2_reproduction_spec.json` | the spec, as `idea-to-spec` would emit it |
| `literature_z2_reproduction_sequence.py` | `build_sequence()` + `compute_observable()`, as `spec-to-sequence` would emit it |

Run the sequence file directly for its smoke test — no QPU, no credentials. It
compares the observable against values that are known analytically and **exits
non-zero** if any of them moves, so `scripts/check.sh` runs it on every push:

```bash
python literature_z2_reproduction_sequence.py
# Sequence OK: 1800 ns, 56 atoms
# ring: N=56, radius 45.5 µm, R_b/a = 1.26  (Z₂ lobe: 1 < R_b/a < 2)
#   ok   ideal Z₂, G(1): -0.2500 (expect -0.2500 ± 1e-09)
#   ok   ideal Z₂, G(2): +0.2500 (expect +0.2500 ± 1e-09)
#   ok   ideal Z₂, G(3): -0.2500 (expect -0.2500 ± 1e-09)
#   ok   ideal Z₂, ξ capped at N/2: +28.0000 (expect +28.0000 ± 1e-09)
#   ok   single domain, G(1) (nothing fluctuates): +0.0000 (expect +0.0000 ± 1e-12)
#   ok   synthetic ensemble, recovered ξ (target 2.0): +2.0033 (expect +2.0000 ± 0.15)
#   ok   synthetic ensemble, recovered ξ (target 4.0): +4.0409 (expect +4.0000 ± 0.4)
#   on AnalogDevice (N=40, τ=5800 ns): 6000 ns — Ω, δ and duration all within limits
#   ok   N=56 on AnalogDevice refused: … caps radial distance at 38 µm …
```

## Running it

The standard pipeline. Nothing here is special to any skill:

```bash
# emulate first — this is the gate, not a formality
python <skills>/validate-emu/support/run_emu_scan.py \
    --spec      literature_z2_reproduction_spec.json \
    --seq-file  literature_z2_reproduction_sequence.py \
    --out-dir   results/literature_z2_reproduction/emu/

# then hardware
python <skills>/qpu-submit/support/submit_qpu.py \
    --spec      literature_z2_reproduction_spec.json \
    --seq-file  literature_z2_reproduction_sequence.py \
    --out-dir   results/literature_z2_reproduction/qpu/

# then collect and compare
python <skills>/harvest-and-analyze/support/harvest_qpu.py \
    --spec      literature_z2_reproduction_spec.json \
    --seq-file  literature_z2_reproduction_sequence.py \
    --batch-ids results/literature_z2_reproduction/qpu/batch_ids.json \
    --emu-dir   results/literature_z2_reproduction/emu/ \
    --out-dir   results/literature_z2_reproduction/qpu/
```

## Why a ring rather than a chain

With periodic boundaries every atom has the same two neighbours, so G(r) averages
over N equivalent pairs. On an open chain the ends order differently from the
bulk, and that bias is worst exactly where ξ is largest — the regime the
experiment is about. The cost is field of view: the nearest-neighbour chord fixes
the radius at R = a / (2 sin(π/N)), which grows like N·a/2π. At N = 56 that is
**45.5 µm**; N = 96 needs ~78 µm and an SA1-class device.

That radius already exceeds the 38 µm cap of Pulser's bundled `AnalogDevice`, so
local validation uses the unconstrained `MockDevice` as a stand-in. Because a
mock device enforces nothing, the smoke test *also* rebuilds the longest sweep at
N = 40 on `AnalogDevice`, where the amplitude, detuning and duration limits are
real and checked.

## What the earlier iteration got wrong

**It measured a different phase.** The reference file targets Z₃ order and
S(k = 2π/3). This example targets Z₂, where the natural quantity is the
*connected* density-density correlator

```
G(r) = (1/N) Σ_i [ ⟨n_i n_{i+r}⟩ - ⟨n_i⟩⟨n_{i+r}⟩ ],   indices mod N
```

from which ξ follows by a log-linear fit — and ξ against τ is the Kibble-Zurek
observable the paper is about.

Connectedness is not decoration, and the smoke test makes the reason visible: a
*single* bitstring, however perfectly ordered, gives G(r) = 0 for every r > 0.
The correlator measures fluctuations across shots, not the pattern inside one.
Z₂ order appears as the two degenerate domains arriving with equal weight, which
is why G(r) alternates in sign and why the ideal ensemble gives exactly ∓0.25.

**It pointed at a design note that never existed.** The file's docstring
attributed its protocol to `notes/example3_chiral_potts_design_2026-05-24.md`.
There is no `notes/` directory in this repository and no commit ever removed one.
It also deferred to a `KNOWN_ISSUES` file and a "V2 bundle template" that appear
nowhere else here, and imported itself from a `sequences` package that does not
exist. All four pointers have since been replaced in place with the paper
citation and with the constraint each one was standing in for — a reader of that
file no longer has to chase documents that were never in this repository.

**It did not satisfy the pipeline contract.** It exports
`build_para_chiral_potts_ring_sequence`, not `build_sequence`, and no
`compute_observable`. It declares no `omega_offset`/`delta_offset`, which
`qpu-submit` requires and refuses to submit without — a builder that quietly
ignored them would run *uncalibrated* on hardware. And it is parametric
(`seq.declare_variable("tau_ns")`), whereas the pipeline submits one batch per
scan point.

**Its name disagreed with its default.** `chiral_potts_n21_sequence.py` defaults
to `DEFAULT_N = 15`.

**Devices were selected by string.** A `device_str` argument imported
`FRESNEL_CAN1` or `Ruby` from `pulser.devices` — which that file's own docstring
admits Pulser does not ship. This builder takes the live device object the cloud
SDK returns.

## Reading the observable

ξ is reported in lattice sites and **capped at N/2 = 28**, the largest separation
the ring can resolve. A longer correlation length is indistinguishable from true
long-range order on 56 atoms, and returning `inf` would poison the scan
comparison downstream. The ideal two-domain ensemble therefore reports 28.0,
meaning *ordered beyond this ring's reach*, not *ξ = 28*.

The fit uses G(r) only while |G(r)| stays above the shot-noise level of the data
(2/√shots), so the tail does not drag the slope. It is deliberately simple; the
smoke test verifies it recovers a known ξ to about 1% on a synthetic ensemble
with analytically fixed correlations. If a publication needs a careful fit with
error bars, do it in the analysis step, not here.

**a = 5.1 µm** gives R_b/a = 1.26 at Ω = 2π×2 MHz and the FRESNEL_CAN1-class C₆,
inside the Z₂ lobe (1 < R_b/a < 2) and clear of the 5 µm minimum trap spacing.
**τ stops at 5800 ns** so the sweep plus the two 100 ns amplitude edges fits a
6000 ns maximum sequence duration.

The register was sized against a stand-in, not against live device
specifications. `validate-emu` runs against the real device and will reject the
spec if it is tighter than assumed.
