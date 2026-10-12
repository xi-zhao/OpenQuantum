# Pulser primitives — what is controllable, and what is measurable

Read this when a candidate method has to be mapped onto real controls. A method
that needs a control the target device does not expose is not a candidate.

**Verify device-specific limits against the device, never against memory.** The
downstream skills read them off the device object (`max_atom_num`,
`min_atom_distance`, `max_radial_distance`, `max_sequence_duration`,
`interaction_coeff`, channel maxima, `supports_eom()`); a note that asserts a
number instead of naming where it comes from will be contradicted by
`idea-to-spec`.

---

## Two physical modes

### Rydberg–Ising

- **Controls**: Rabi amplitude Ω, detuning δ, phase, atom geometry, global
  addressing, local or weighted detuning where supported.
- **Interaction**: long-range density–density coupling set by atom distances,
  typically ∝ 1/r⁶ — so **geometry *is* the interaction graph**, and it is not
  freely programmable.
- **Natural uses**: Ising ground-state preparation, ordered phases, quantum phase
  transitions, quenches, correlation dynamics, combinatorial optimization,
  correlated sampling.

### XY

- **Controls**: a microwave channel where supported, the initial excitation
  pattern, geometry, interaction time, a compatible device mode.
- **Natural uses**: excitation transport, spin exchange, correlation spreading,
  quantum walks, excitation-preserving dynamics.
- **Always verify device support before proposing it.** XY is not available
  everywhere, and a method that needs it is blocked, not merely harder.

---

## Register geometry

Geometry sets the interaction graph, the interaction strength, the lattice type,
frustration, the neighbourhood structure and the boundary effects.

Check: minimum atom distance, maximum register extent, device layout, filling
fraction, coordinate-to-bitstring ordering, loading constraints.

Choose the geometry for the physics, not for the device's pre-calibrated
layouts. A device that `requires_layout` but `accepts_new_layouts` (the Fresnel
devices do) takes any register that validates: build it, call
`with_automatic_layout(device)`, and construct `Sequence(reg, device)` — if that
does not raise, the geometry is allowed. `device.pre_calibrated_layouts` is a
list of layouts already calibrated, not a list of what the device supports.
Only when `accepts_new_layouts` is False must the register come from one of
them. Never rule out a geometry (a square or King's grid, say) because no
pre-calibrated layout matches it.

## Addressing

- **Global** — adiabatic ramps, global quenches, ordered-state preparation, QAA,
  homogeneous dynamics. This is the common case and the one every device has.
- **DMM (Detuning Map Modulator)**, where supported — MWIS weights, non-uniform
  linear QUBO terms, local fields, controlled symmetry breaking, spatial detuning
  gradients. Check the device exposes a DMM, and its weight and amplitude
  constraints.
- **SLM mask**, where supported — structured initialization, masking atoms during
  preparation, preparing a subregister before the main evolution. A specific case
  of a DMM, so it depends on the same hardware support.
- **Local channels**, where supported — localized excitation preparation,
  defects, transport protocols, non-uniform initial conditions, local control.
  **Prefer a DMM when it can carry the method**: local channels are the scarcer
  capability, and DMM support is expected on real devices sooner.
- **EOM mode** — fast control changes, quench-like protocols, repeated pulse
  blocks, short-time dynamics. Check availability and modulation constraints.

## Parametrized sequences

Parameter scans, variational loops, pulse optimization, repeated experiments,
time-series reconstruction. Anything with a scan axis wants this.

---

## Measurement constraints — the section that kills the most methods

**A QPU returns sampled final bitstrings.** Prefer an observable computable from
those and nothing else:

excitation density · objective value · independent-set validity · success
probability · approximation ratio · one- and two-point correlations · connected
correlations · staggered order · sublattice order · structure factor ·
domain-wall density · defect density · correlation length · occupation by site ·
transport probability · classically post-processed kernel features

An observable requiring the full wavefunction — entanglement entropy, fidelity to
a target state, a full amplitude — may be available in emulation and **not on
hardware**. Say which side of that line a candidate sits on, in the note, before
anyone plans a submission around it.

Two further consequences worth stating to the user early:

- **Shot noise is part of the observable.** A quantity needing many shots per
  point to resolve is a cost, and QPU shots are metered.
- **Bond dimension is an accuracy knob, not a size knob.** An MPS emulation of a
  large register at a low bond dimension runs happily and returns a smooth,
  plausible, quietly wrong curve. Do not plan on finding the right value: either
  the register is inside the emulator's calibrated envelope, or the validation
  moves to a smaller **sub-system** that keeps the same structure and the real
  size is measured on hardware.
