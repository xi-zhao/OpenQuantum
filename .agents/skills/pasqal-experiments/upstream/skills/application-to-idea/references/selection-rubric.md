# Selection rubric

How to rank the candidates from `method-catalog.md`, and the worked mappings that
cover most incoming problems.

## Score each candidate on six axes

1. **Naturalness of mapping** — does the problem *become* the model, or does it
   arrive there through penalties and padding? A mapping that needs three
   penalty terms to hold together will spend the whole dynamics enforcing them.
2. **Maturity** — library, recipe, primitive, or a paper and good intentions.
3. **Hardware compatibility** — mode, controls, geometry, size, density.
4. **Measurability** — is the answer computable from sampled bitstrings?
5. **Scientific usefulness** — if it runs perfectly, does the result mean
   something the user did not already have?
6. **Cost and implementation risk** — how much undocumented work, how many shots,
   how much emulator time.

## Preference order, all else equal

`ready_library` → `documented_recipe` → `documented_primitive` →
`research_pattern` → `planned_or_adjacent` → `no_fit`

All else is rarely equal: a `documented_recipe` with a natural mapping beats a
`ready_library` the problem has to be deformed to reach. Say so when you rank
against the order — that is a judgement the user should see.

## Rules

- Prefer **MWIS** over QUBO for weighted selection with pairwise exclusions.
- Prefer **QUBO** for general pairwise binary costs and rewards.
- Prefer **Ising simulation** when the goal is physical behaviour rather than a
  combinatorial optimum.
- Prefer **XY** for exchange or transport of excitations.
- Prefer a **high-level application library** for a standard application problem.
- Prefer **direct Pulser** for a scientific protocol adaptation.
- **Always define a classical baseline.** A method with no baseline cannot be
  judged, only admired.
- **Never recommend QPU execution before an emulated validation path exists.** If
  no honest emulation of the real instance is affordable, the validation is a
  smaller **sub-system** with the same structure — never a lower bond dimension
  at the full size.

## Two distinctions to keep out loud

- **Encodable ≠ feasible.** Any problem can be written as a QUBO. Very few QUBOs
  embed into a 1/r⁶ interaction graph on a plane at allowed atom distances.
- **Feasible ≠ useful.** A 20-variable instance a laptop solves exactly in
  milliseconds is a fine *demonstration* and not a result. Say which of the two
  the user is buying.

## Domain-to-method examples

Explanatory mappings, not rules — the family still comes from Step 2.

| What the user brings | Where it lands |
|---|---|
| project selection with incompatibilities | `mwis-qaa` |
| task scheduling with simple pairwise conflicts | `mwis-qaa` |
| scheduling with global resource constraints | `qubo-qaa`, or `qubo-decomposition-hybrid` |
| graph colouring | MIS on an expanded graph, or `qubo-qaa` |
| binary allocation | `qubo-qaa` |
| discrete portfolio optimization | `qubo-qaa` — and flag that the original problem may be continuous |
| smart charging | `qubo-qaa`, or a specific published variational protocol |
| MaxCut | `qubo-qaa` |
| facility location | `qubo-qaa`, or decomposition |
| molecular graph classification | `quantum-evolution-kernel` |
| molecular electronic-energy calculation | no fit for this analog route |
| antiferromagnetic ordering | `ising-ground-state-preparation` |
| a phase transition | `ising-phase-diagram-scan` |
| quench dynamics | `ising-quench-dynamics` |
| excitation transport | `xy-excitation-transport` |
| pulse tuning | `bayesian-pulse-optimization` |
| correlated sample generation | `rydberg-distribution-sampling` |
| generic tabular classification | `no-documented-pulser-fit` |
| generic image classification | `no-documented-pulser-fit` |
| generic PDE or CFD simulation | no ready method on this route |
| reproducing a Rydberg-array paper | `custom-paper-protocol`, or `idea-to-spec` directly if the protocol is already clean |
