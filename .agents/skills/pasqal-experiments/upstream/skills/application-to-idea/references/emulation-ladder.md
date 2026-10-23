# What each size costs to check, and why start small

Read this before writing the note's **Size plan**. The point of settling size
during a scoping conversation is that it decides whether the experiment can be
checked before it is bought.

## The ladder

| Where it runs | Reach | Cost | What it establishes |
|---|---|---|---|
| Exact state vector, the user's machine | up to ~14 atoms (memory goes as 2^N) | seconds, free | the implementation is right and the observable moves |
| MPS, the user's machine or a GPU cluster | tens of atoms, bond-dimension-dependent | minutes to hours, free | the shape of the signal at a size closer to the real one |
| Cloud MPS emulator | the real size, degrading past N ≳ 60–100 | queue time, metered | whether the signal survives the real device's noise |
| QPU | the real size | billed shots, not recallable | the measurement |

`validate-emu` runs the first and third rungs and is the gate before hardware;
`noise-emulate` is the diagnostic on the second and third. Neither is this
skill's to run — but a size plan that no rung can check is not a plan.

## Why the small run first — explain it, do not just do it

**The small run is the only free error message you get.** Almost every failure
caught at 9 atoms is an implementation failure, not a physics one: a wavevector
with a wrong sign, an observable that returns the same number for every scan
point, a ramp too fast to be adiabatic, a spacing that put the register outside
the device's limits, a penalty term that dominates the dynamics.

Those failures look **identical to "nature said no"** when they arrive as QPU
data — which is exactly why they must be excluded before the shots are spent. A
downsized run that shows the observable responding to the scan is what makes a
null result at full size *interpretable*.

Say plainly what it does **not** establish: a phase transition sharpens with N,
and a 9-atom version of a 49-atom experiment can show a feature that is a
finite-size artefact, or hide one that only develops at scale. Small **then** full
size — and "full size" often exists only on hardware, which is fine; what is not
fine is quoting the small run as if it were the full-size result.

## Bond dimension is an accuracy knob, not a size knob

With an MPS emulator, χ (the bond dimension) caps how much entanglement the state
can represent. 60 atoms at χ=64 will happily run and print a smooth, plausible
curve that is quietly wrong, because **the truncation error is invisible in the
output**. An adiabatic sweep through a transition generates precisely the
entanglement that needs a large χ, so that is the worst case, not the safe one.

What this means for the size plan — and it is the whole reason to discuss size
now: **do not plan on finding the right χ.** Nobody re-runs a large register at
twice the bond dimension, and searching for the χ where the answer stops moving is
a week spent producing a curve nobody can defend. So a plan whose validation step
is "emulate the full register locally" has no validation step.

Treat it as a two-way decision, not an optimisation:

- **Small enough that the emulator's default χ is already calibrated** → run it,
  once, and move on. No convergence study. (`noise-emulate` records what its
  default covers: `--max-chi` 128 was validated against χ=200 for S(π,π), local
  and two-point observables up to 6×6, agreeing to ~0.05%.)
- **Bigger than that** → stop emulating the full register. The plan that works is
  a **sub-system**: a register small enough to emulate honestly, keeping the
  geometry motif, the R_b/a and the protocol of the real one, which reproduces
  something approaching the expected signal. That validates the *approach*. The
  full-size number comes from the QPU — that is what hardware is for, and it is
  cheaper than a month of emulator work that would still not settle it.

One step up in χ, if the user asks for it, is fine. A sweep over χ is not: it
answers a question the QPU will settle anyway, and a curve defended by "we tried
several χ and took the one that looked stable" is not defensible.

Which observable is wanted matters here too, and it tells you which branch you
are in without measuring anything: ⟨n⟩, S(K) and correlators stay low in χ;
entanglement entropy, a full bitstring distribution or higher moments leave the
envelope immediately, at any N.

## What the note has to say

The **Size plan** section names: the sub-system that validates the approach and at
what N, the full size, and where each one runs — stating plainly whether the full
size is ever emulated or goes straight to hardware.
