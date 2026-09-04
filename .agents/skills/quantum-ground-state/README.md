# Quantum Ground State Project Skill

This is a no-network, no-cloud, deterministic OpenQuantum project Skill. Its v1.1 Capability
manifest supplies the scientific contracts used by the Harness; it is not a plugin marketplace or
installation subsystem.

## Scientific claim

The capability computes the ground-state energy inside the fixed Hamming-weight-one sector of a
user-supplied two-qubit real Pauli Hamiltonian. It uses a one-parameter noiseless statevector VQE
and independently recomputes the real symmetric `2×2` sector reference.

It does not derive a Hamiltonian from a molecule or material, claim FCI accuracy, run QAOA, use
shots/noise/hardware, or support Pauli `Y`, complex coefficients, other sectors, or larger systems.

## Skill interface

- Capability id and Harness Skill name: `quantum-ground-state`.
- Model-facing native Tool: `solve_and_validate_ground_state(request)` returns six facts plus
  deterministic computational observations in one call.
- Facts-only solving and materialized validation remain internal solver/Validator interfaces rather
  than extra model-facing Tools.
- Solver: `node scripts/solve.mjs <request.json> <new-output-directory>`.
- Validator: `node validators/validate-result.mjs <validation-bundle.json>`.
- Eval runner: `node evals/run-evals.mjs`.

The solver emits exactly six fact Artifacts and never emits acceptance, score, or reproduction
status. The Validator emits only `scopeMatch`, per-check `observations`, `limitations`, and a
statement. The Harness scientific contracts own Result Package/Profile validation and derive the
Acceptance Report status.

The atomic Tool workflow deliberately emits `provenance.complete=not_checked`: its facts are still
execution-local structured content. In the OpenQuantum Harness preset, a trusted `tools/post-execute`
Adapter obtains the real Session/Tool identity, atomically writes the input and six artifacts through
Harness `ctx.fs`, validates the resulting Result Package, reruns this full Validator against those
bytes, and only then invokes the central Acceptance Builder. The Tool itself never invents Session ids,
file paths, digests, or acceptance.

### Validator host protocol

Before invoking the Validator, the Harness must:

1. load this project Skill's v1.1 Capability manifest;
2. validate the Result Package and all referenced input/Artifact bytes and schemas;
3. load the SHA-locked Acceptance Profile;
4. materialize a JSON bundle conforming to
   `validators/result-validation-bundle.schema.json`;
5. invoke the declared command without a shell and pass the bundle path as its sole argument.

The bundle contains contract values and fact payloads, not filesystem roots or credentials. The
Validator therefore stays focused on quantum-domain checks while generic loading remains in the
Harness.

## Evidence and maturity

The eval suite covers accepted analytic/protocol cases, non-convergence, out-of-scope rejection,
metamorphic invariants, and tamper resistance. Package-owned evidence is recorded under
`evidence/`. It is useful regression evidence, but it is not independent reproduction evidence;
therefore this capability remains `draft`.

The reproduction profile defines what a future independent two-run comparison must prove. No
Reproduction Report is bundled or claimed.

## Data and license

The package is MIT licensed. The protocol fixture coefficients are test data for exercising the
contract; this package asserts no scientific origin or provenance for them. They are not
represented as molecular or material data. See `NOTICE` for the complete data boundary.
