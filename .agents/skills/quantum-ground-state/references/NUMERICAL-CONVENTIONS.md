# Numerical conventions

- Energy unit: Hartree only.
- Qubit order: the leftmost Pauli character acts on the most-significant bit.
- Basis order: `00, 01, 10, 11`.
- Sector basis order: `01, 10`.
- Ansatz:

  ```text
  |psi(theta)> = cos(theta/2)|01> + sin(theta/2)|10>
  ```

- Canonical Hamiltonian: sort unique Pauli strings lexicographically and serialize JSON with
  recursively sorted object keys. Normalize `-0` to `0`; do not round coefficients.
- Hamiltonian digest: SHA-256 of UTF-8 canonical JSON bytes.
- Exact reference for sector matrix `[[a,b],[b,d]]`:

  ```text
  E0 = (a+d)/2 - hypot((a-d)/2, b)
  ```

- Optimizer: the request's endpoint-inclusive `coarsePoints=65` convention represents 64 unique
  periodic grid points. Evaluate `-pi + 2*pi*k/64` for `k=0,...,63`; do not evaluate the duplicate
  `+pi` endpoint. Select both neighbours modulo 64, unwrap those neighbours around the winning
  grid point, and run golden-section refinement on that continuous unwrapped bracket. Every angle
  passed to the energy function or written to an Artifact is canonicalized to `[-pi, pi)`.
- Evaluation budget: every energy evaluation, including coarse, refinement, and optional final
  midpoint evaluation, consumes one budget unit. If fewer than 64 evaluations are available, the
  run stops after the available coarse nodes and has no final bracket. If all coarse nodes are
  available but refinement exhausts the budget, the current unwrapped bracket width is retained.
- Hamiltonian scale: `S_H = max(1, sum_j |c_j|)` in Hartree for the canonical Pauli
  coefficients. Numerical replay checks use residuals normalized by `S_H` (and by the magnitudes
  of both compared energies when larger). This prevents a fixed absolute floating-point cutoff
  from rejecting otherwise valid large-scale Hamiltonians. The profile's `1.6 mHa` scientific
  energy-accuracy gate remains an absolute Hartree criterion.
- Non-finite values: request coefficients, optimizer energies, and every number emitted in a fact
  Artifact must be finite. `NaN` and positive or negative infinity are rejected, never serialized
  as scientific facts.
- Compare statevectors by fidelity when reproduction is implemented; raw amplitudes may differ by
  a physically irrelevant global phase.

The solver emits facts only. Acceptance status and score are derived by separate, versioned
Validator and eval runners.
