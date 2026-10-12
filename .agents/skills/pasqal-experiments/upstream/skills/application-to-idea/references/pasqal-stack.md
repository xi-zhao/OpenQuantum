# What exists in the stack, and what each part is for

Read this to know what a chosen method would actually be implemented and run
with. Nothing here is a method: this is the machinery a method lands on.

**Everything below is dated.** Package names, backend availability, device
capabilities and API names move between releases. Check anything a user would act
on against the current public documentation — see `sources.md` — before asserting
it, and mark it unverified otherwise.

**Prefer the live doc portal over this file.** Fetching pages costs tokens, so
ask first: *"I can check this against docs.pasqal.com instead of my dated notes —
it costs extra tokens. Want me to?"* If the user agrees and
<https://docs.pasqal.com> is reachable, read it and cite what you read. If the
user declines or the portal is unreachable, use this file and say in the note
that the stack claims are unverified.

---

## Pulser — the implementation layer

The open-source Python SDK for pulse-level programming of neutral-atom
processors. What it gives you:

- atom registers and geometries
- physical and virtual devices
- sequences, channels, pulses and waveforms
- Rabi amplitude, detuning and phase
- global addressing, and local addressing where a device supports it
- parametrized sequences
- device compatibility validation
- serialization
- backend-independent execution of a sequence

**Pulser is not an application solver.** It is the layer every selected method
must eventually map onto. Deciding "we will use Pulser" decides nothing
scientific.

---

## Emulators

Pick the cheapest one that can answer the question, and say what it does not
establish.

| Backend | What it is | Use it for | Where it stops |
|---|---|---|---|
| `pulser-simulation` (QuTiP) | reference evolution inside Pulser | functional validation of a sequence, small systems, ideal and supported noisy runs, state inspection, bitstring sampling, observable validation | full-state cost grows exponentially |
| EMU-SV | state-vector emulator | exact emulation, small to medium systems that fit memory, GPU acceleration where available, a reference before any tensor-network run | exponential memory; noise is expensive; check local or cloud availability |
| EMU-MPS | matrix-product-state emulator | systems past exact state-vector reach, structured geometries, manageable entanglement, CPU or GPU, noisy trajectories where supported | approximate — the truncation error does not appear in the output |
| EMU-FREE | cloud emulator, availability-dependent | quick cloud runs when the account exposes it | do not assume any user has it; check documentation, permissions, quota and exposed devices |

Use the **current** Pulser backend interface rather than a remembered one —
prefer whatever the installed Pulser documentation recommends (for example
`QutipBackendV2` where it applies) and do not freeze a deprecated name into a
note.

Any MPS result carries its own metadata or it is not a result: bond dimension and
truncation controls, what convergence was or was not checked, the approximation
error, the hardware it ran on, and software versions. A bond dimension is an
**accuracy** knob, not a size knob — see `pulser-primitives.md`.

## Noise models

Pulser models preparation errors, SPAM/detection errors where supported,
dephasing, relaxation, laser and atomic fluctuations where modelled, Lindblad
evolution and Monte-Carlo trajectories.

Functional validation and scientific noise viability are **two different tasks**.
A sequence that runs under a noise model has not been shown to produce a signal
that survives it.

---

## Cloud and execution routes

- **Pasqal Cloud / `pasqal-cloud`** — remote connection, backend discovery, batch
  and job submission, status monitoring, result retrieval, remote emulator and
  QPU execution. **Cloud access is not part of method selection**: no credential
  is needed to choose a method, and none should be touched by this skill.
- **`pulser-pasqal`** — treat as a legacy path when the current documentation
  confirms it; prefer `pasqal-cloud` with the current Pulser interfaces.
- **Pulser Studio** — visual, no-code sequence creation. Good for teaching, for
  visual prototyping and for inspecting a sequence. Not the reproducible artefact
  of an agentic workflow: the file on disk is.

---

## Application libraries — prefer these when one covers the problem class

### MIS and weighted MIS — go through QUBO Solver

**Do not name the standalone MIS library as the implementation path.** It is not
actively maintained; the supported route for MIS and MWIS is `qubo-solver`, which
gives access to more solvers. Formulate the independent-set problem as a QUBO and
hand it to QUBO Solver below.

- **Fits**: selection with pairwise incompatibilities, resource allocation with
  conflicts, incompatible task scheduling, set packing, project selection,
  frequency or channel assignment, some placement problems, graph colouring after
  transformation.
- **Mapping**: vertex → atom; conflict edge → blockade interaction; vertex weight
  → local detuning or DMM contribution; quantum adiabatic algorithm (QAA) →
  low-energy state preparation; measured bitstrings → independent sets.
- **Limits**: geometric embeddability, unit-disk-like structure, weight range,
  loading and layout constraints, additional global constraints, instance size.

### QUBO Solver — the recommended entry point for optimization

High-level public library for Quadratic Unconstrained Binary Optimization:
instance definition, classical/quantum/hybrid solvers, embedding, drive shaping
(heuristic, optimized, custom), pre- and post-processing, classical heuristics,
solution analysis, decomposition.

- **Fits**: scheduling, assignment, MaxCut, vertex cover, graph colouring,
  packing and covering, discrete portfolio selection, clustering, facility
  location, feature selection, simplified routing, resource allocation.
- **Mapping**: binary variable → atom; quadratic coefficient → Rydberg
  interaction approximated through geometry; linear coefficient → global or local
  detuning; QAA → low-energy preparation; measured bitstrings → candidates,
  scored with the *original* QUBO.
- **Limits**: an arbitrary QUBO is not naturally embeddable; Rydberg interactions
  are fixed by geometry; coefficient signs and dynamic range matter; dense
  instances are hard; penalty terms can dominate the useful dynamics; large
  instances may need decomposition. **Writing a problem as a QUBO does not make
  it suitable for a QPU** — that is the single most common false positive in this
  whole skill.

### Quantum Evolution Kernel

Application method and library for graph machine learning: encode a graph as a
register, run a quantum evolution, extract distributions or correlations as
features, build pairwise similarities or a kernel matrix, train a classical
kernel model.

- **Fits**: graph classification, molecular graph classification, biochemical
  structured data, graph similarity.
- **Limits**: not a general answer for tabular data or images; graph-size
  handling and register embedding must be defined; kernel estimation cost must be
  measured; compare against classical graph kernels and GNNs; use rigorous
  splits, seeds, metrics and uncertainty estimates. Never claim an advantage
  without evidence.

### QoolQit

High-level abstraction for neutral-atom algorithm development. Useful context and
a possible implementation route. For this skill: prefer an application solver
where one exists, prefer direct Pulser where physical adaptation is needed, and
do not make QoolQit a mandatory output.

---

## Adjacent libraries — know them, do not select them by default

`Qadence` (differentiable digital-analog programs, variational models),
`QadenceML` (QML abstractions), `PyQTorch` (differentiable circuit simulation),
`Horqrux` (alternative differentiable stack, version-dependent),
`qiskit-pasqal-provider` (Qiskit interoperability), `Pulser-myQLM`,
`pulser-azure`, and Google Cloud / OVHcloud / Scaleway integrations where
currently available.

These change the **implementation or execution route**, not the scientific
method. Naming one instead of a method is not an answer.
