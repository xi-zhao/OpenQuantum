# Scientific scope

`quantum-ground-state@0.2.0` computes one narrowly stated claim:

> The ground-state energy within the fixed-Hamming-weight-one sector of a supplied,
> two-qubit, real Pauli Hamiltonian.

The input Hamiltonian is an asserted problem definition. This version does not derive it from a
molecular geometry, charge, multiplicity, basis set, active space, fermion-to-qubit mapping, or
tapering procedure. Labels are descriptive input metadata, not independently validated molecular
provenance or molecular-energy claims.

## Supported method

- two qubits in basis order `00, 01, 10, 11`;
- Pauli strings built from `I`, `X`, and `Z` with finite real coefficients in Hartree;
- invariant subspace spanned by `|01>` and `|10>`;
- noiseless statevector VQE;
- one-parameter real single-excitation ansatz;
- deterministic coarse-grid and golden-section optimization;
- independent exact reference from the real symmetric 2×2 sector matrix.

## Explicitly out of scope

- molecular Hamiltonian generation or FCI validation;
- QAOA;
- complex coefficients or Pauli `Y` terms;
- other particle sectors or more than two qubits;
- finite shots, noise models, quantum hardware, excited states, and uncertainty intervals.

Reject out-of-scope requests during preflight. Do not downgrade them to a conditional scientific
result, because the solver has not executed the claimed problem.
