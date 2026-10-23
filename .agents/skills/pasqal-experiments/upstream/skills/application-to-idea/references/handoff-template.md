# <short name>

Copy this file to `<short_name>_idea.md` in the user's working directory and fill
every section. Every heading below is required and must be non-empty —
`support/validate_idea_note.py` checks exactly that, because an empty **Classical
baseline** or a dropped **Open questions** is what gets lost between two skills.
Delete these two paragraphs when you fill it in.

Write prose and lists. No spec, no sequence, no pulse values, no register
coordinates: those are `idea-to-spec`'s and `spec-to-sequence`'s to decide, and a
number invented here arrives downstream looking like a decision the user made.

## Original problem

What the user first said, in their words. Keep it verbatim enough that they
recognise it.

## The question

One sentence, theirs, agreed in Step 1. This becomes the spec's `objective`.

## Expected result

The concrete object they want back: a subset, a schedule, a ranked list of
candidates, a curve with a feature, a number with an error bar, a yes/no.

## Selected method

- Method ID: `<id from references/method-catalog.md>`
- Maturity: `<one of the six levels>`
- Confidence: `<high | medium | low>`, and what would raise it

## Why this method fits, or how the wish was reshaped

The reason, in two or three sentences a reviewer can disagree with — including
anything the hardware forced out of the original wish.

## Domain-to-physics mapping

Each domain object → its mathematical and physical counterpart. Items → vertices
→ atoms; incompatibility → edge → blockade; value → weight → detuning; or model
term → Pulser control. Name what has **no** counterpart.

## Input data and problem scale

What data exists, in what form, and the size: variables, nodes, items, expected
atom count, density, sparsity.

## PASQAL and Pulser components

Which library, which emulator, which execution route — and which of those the
user actually has access to.

## Required physical mode and controls

Rydberg-Ising or XY; global drive, local addressing, DMM, SLM, EOM. Flag any
control the target device may not expose, and say it must be verified against the
device rather than assumed.

## Proposed protocol

Geometry and rough spacing, drive type (adiabatic ramp or quench), what is swept
and over what range, roughly how long. Rough is correct here — `idea-to-spec`
turns these into numbers.

## Observable and expected signal

What is computed from the bitstrings, what it looks like if the answer is yes,
and what it looks like if it is no. State explicitly whether each quantity is
computable from sampled bitstrings or exists only in emulation.

## Success criteria

What result would count as success, and what would count as a clean negative. If
nothing would count as either, the note is not ready.

## Classical baseline

What the problem is solved with today, or the obvious classical method, and what
it costs. Mandatory: a method with no baseline cannot be judged, only admired.

## Size plan

The sub-system that validates the approach and at what N, the full size, and
where each one runs — naming plainly whether the full size is ever emulated or
goes straight to hardware.

## Feasibility constraints

Embeddability, size, coefficient range, shot budget, device availability,
sequence duration, coherence.

## Assumptions accepted by the user

Each structuring assumption they explicitly accepted, and what it would change if
wrong.

## Open questions

Everything the user deferred, and everything you chose for them, each with what it
would change. Expected to be non-empty. `idea-to-spec` carries these into the
spec's `open_questions` rather than resolving them silently.

## Alternatives considered, and why they were rejected

The other candidates by ID, one line each. "Not mature" and "does not fit" are
not reasons.

## Out of scope

What was asked for and cannot be done here, and why. Empty only if nothing was.

## Public sources

The pages actually consulted, from `references/sources.md` or beyond, with what
each one supported.

## Handoff to idea-to-spec

`idea-to-spec` turns this note into a reviewable `experiment_spec.json`. It must
**re-check, not inherit**: device compatibility against the live device, whether
each observable is measurable on that device, register feasibility (atom count,
spacing, extent), the controls this method assumes, and every unresolved
assumption above. Anything left in **Open questions** belongs in the spec's
`open_questions`, not resolved on the way.

`validate-emu` remains the gate before any hardware. The **Size plan** above says
which size is emulated to validate the approach and which size only hardware can
answer; a plan whose only validation is "emulate the full-size instance" has no
validation.
