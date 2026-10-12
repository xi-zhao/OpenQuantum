# EOM quench on a square lattice

A transverse-field Ising quench: 5×5 Rydberg atoms, the drive switched on
instantaneously in EOM mode at the mean-field detuning, and the lattice-averaged
occupation ⟨n⟩ read out as a function of the quench duration.

## Why it is here

This experiment used to *be* the `qpu-submit` skill. `submit_qpu.py` took
`--N --hx --omega` and rebuilt this register, this pulse schedule and this
observable in Python, ignoring the `experiment_spec.json` contract the three
upstream skills produce. Any user arriving with their own sequence was silently
redirected into somebody else's physics.

So it moved out here, as an ordinary pair of pipeline artifacts — a spec and a
sequence file — and the skill became what its description always claimed:
a submitter for whatever `spec-to-sequence` produced.

## Files

| File | Role |
|---|---|
| `square_lattice_eom_quench_spec.json` | the spec, as `idea-to-spec` would emit it |
| `square_lattice_eom_quench_sequence.py` | `build_sequence()` + `compute_observable()`, as `spec-to-sequence` would emit it |

Run the sequence file directly for its smoke test:

```bash
python square_lattice_eom_quench_sequence.py
# Sequence OK: 1740 ns, 25 atoms
```

## Running it

Exactly the standard pipeline — nothing about this experiment is special to any
skill:

```bash
# emulate first
python <skills>/validate-emu/support/run_emu_scan.py \
    --spec      square_lattice_eom_quench_spec.json \
    --seq-file  square_lattice_eom_quench_sequence.py \
    --out-dir   results/square_lattice_eom_quench/emu/

# then hardware
python <skills>/qpu-submit/support/submit_qpu.py \
    --spec      square_lattice_eom_quench_spec.json \
    --seq-file  square_lattice_eom_quench_sequence.py \
    --out-dir   results/square_lattice_eom_quench/qpu/

# then collect and compare
python <skills>/harvest-and-analyze/support/harvest_qpu.py \
    --spec      square_lattice_eom_quench_spec.json \
    --seq-file  square_lattice_eom_quench_sequence.py \
    --batch-ids results/square_lattice_eom_quench/qpu/batch_ids.json \
    --emu-dir   results/square_lattice_eom_quench/emu/ \
    --out-dir   results/square_lattice_eom_quench/qpu/
```

## What changed on the way out, and why

**hx/J = 6 is not an arbitrary choice.** It is the paramagnetic regime, where
the device noise model tracks hardware most closely. That is what made this a
usable end-to-end test of the pipeline rather than an interesting physics
result — and it is why this experiment, unlike the literature reproductions in
the sibling directories, was never published.

**The lattice spacing is derived, not specified.** `build_sequence` computes it
from `hx`, `omega` and the live `C6`, so that the interaction sets the requested
hx/J. Writing a spacing into the spec would silently contradict `hx`.

**10 scan points instead of 75.** The original script submitted one *parametric*
batch holding 75 jobs, one per observation time. The pipeline contract is a
non-parametric `build_sequence`, so a scan means one batch per point — better
provenance and a uniform harvest path, at the cost of one queue slot per point.
For a fine time series, prefer fewer points or accept the queue.

**The checkerboard trap layout is gone.** The original built a hand-made
reservoir layout, then called `with_automatic_layout` whenever the spacing was
below 10 µm — which it always is at these parameters. The hand-built layout was
discarded on every run; only the automatic one is kept.

**The readout correction moved, and stopped being automatic.** The original
`collect_qpu.py` applied a false-positive/false-negative correction to per-site
⟨σᶻ⟩ on the way to the plot, so every number it produced was corrected and the
comparison band was drawn around a corrected curve. That is the wrong default
here: the noisy emulation this pipeline compares against already contains both
detection rates, so correcting the QPU side alone tilts the accept/reject test.

`compute_observable` therefore returns the raw ⟨n⟩ and the verdict compares raw
to noisy. The correction lives in
[`harvest-and-analyze`](../../skills/harvest-and-analyze/SKILL.md) as an explicit
step that reads the raw counts file and writes its own output, which is also
where the constraint is documented: inverting per site is exact for a density
and for anything affine in it, and does not carry over to a correlator.

⟨n⟩ here is affine in the site densities, so this example is one where the
corrected number is meaningful.
