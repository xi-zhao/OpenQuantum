# Public sources

The starting catalogue. **It is dated, and it is not authoritative about limits.**
Device capabilities, size limits, backend availability, API names and package
names change between releases — check the current page before asserting one, and
mark it unverified when you cannot.

Cite in the note the pages you actually consulted, and what each one supported.
A source list nobody opened is decoration.

**Ask before fetching.** Reading these pages costs tokens the user pays for, so
offer it rather than assume it: *"I can check this against docs.pasqal.com — it
costs extra tokens. Want me to?"* On yes, and when the portal is reachable, the
live page beats anything remembered or written in `pasqal-stack.md`. On no, or
when it is unreachable, proceed from the reference files and mark the claim
unverified in the note.

## Documentation

- https://docs.pasqal.com/
- https://docs.pasqal.com/pulser
- https://docs.pasqal.com/pulser/programming

## Tutorials

- https://docs.pasqal.com/pulser/tutorials/creating
- https://docs.pasqal.com/pulser/tutorials/qubo
- https://docs.pasqal.com/pulser/tutorials/mwis
- https://docs.pasqal.com/pulser/tutorials/optimization/
- https://docs.pasqal.com/pulser/tutorials/xy_spin_chain
- https://docs.pasqal.com/pulser/tutorials/dmm/
- https://github.com/pasqal-io/Pulser/tree/develop/tutorials

## Application libraries

- https://pasqal-io.github.io/qubo-solver/latest/content/solver — the entry point
  for optimization, MIS and MWIS included
- https://docs.pasqal.com/applicationsolvingtools/mis — background on the MIS
  formulation. The standalone library it documents is not the maintained path;
  see `pasqal-stack.md`.

## Code and execution

- https://github.com/pasqal-io/Pulser
- https://github.com/pasqal-io/pasqal-cloud
- https://pulserstudio.pasqal.cloud/

## What to check before quoting it

| Claim | Where it must come from |
|---|---|
| a device limit (atom count, spacing, extent, duration) | the device object at run time, read by `idea-to-spec` — never a remembered number |
| whether a device supports EOM, XY, a DMM, an SLM mask or local addressing | the device object, or current documentation for that device |
| which emulator a project can reach | the account's exposed devices, checked downstream — not assumed here |
| a package or backend name | the installed version's documentation |
| a method's maturity | a public library, tutorial or paper you can name in the note |
