# Additional circuit, arithmetic and photonic SDK adapters

These seven L1 capabilities expose real, separately installed vendor or institution SDKs through isolated Python workers and stdio MCP Servers. Harness owns registration and lifecycle; each Skill adds the domain input and interpretation rules. Runtime results keep `scientificValidation=not_evaluated`.

| Capability | Fixed dependencies | Exposed action | Activation |
| --- | --- | --- | --- |
| `qsteed-compilation` | QSteed 0.2.3, PyQuafu 0.4.4; Python 3.12 | Basis decomposition to CX/RX/RY/RZ, OpenQASM 2, phase and gate counts | Default on |
| `quairkit-information` | QuAIRKit 0.5.1, Torch 2.11.0; Python 3.12 | CPU density matrix after unitary gates and ordered local noise channels | Default on |
| `qcompute-simulation` | QCompute 3.3.5, NumPy 1.26.4; Python 3.10 | Baidu local state-vector simulator with explicit RZ phase convention conversion | Default on |
| `qibo-simulation` | Qibo 0.3.5; Python 3.12 | Explicit NumPy complex128 CPU circuit simulation | Default on |
| `qrisp-arithmetic` | Qrisp 0.9.9; Python 3.12 | QuantumFloat with integer-preserving Gidney classical-constant addition modulo register width | Opt in |
| `lightworks-photonics` | Lightworks 2.3.5; Python 3.12 | Lossless Fock amplitudes through beam splitters and phase shifters | Default on |
| `braket-simulation` | Amazon Braket SDK 1.127.2; Python 3.12 | Explicit `LocalSimulator("braket_sv")`, shots=0 state vector | Default on |

Every capability has its own `pyproject.toml` and complete `uv.lock`. Prepare an environment explicitly with `node scripts/setup-paper-tools.mjs <capability-id>`; calculation never installs dependencies. SDK imports and numerical libraries can write workspace caches, so the conservative Tool effect remains `workspace-write`. Default activation is configuration, not a claim that a user's environment is already prepared.

The contracts accept structured gates or domain parameters. They reject executable code, paths, secrets, arbitrary endpoints and cloud-backend switches. Qubit, mode and register widths are caller-selected; backend array representation constraints remain explicit. Execution resource policy is separate from scientific inputs.

## Scientific conventions

- All circuit interfaces use radians, with rotations defined as `exp(-i*theta*Pauli/2)`. Output state vectors put qubit 0 in the leftmost bit. QCompute's native RZ is instead `diag(1,exp(i*theta))`; the adapter records and applies `globalPhaseCorrectionRadians = -sum(RZ angles)/2` so returned amplitudes follow the common convention. This is a basis convention correction, not normalization.
- QSteed uses only the standalone `Transpiler` / `Model` / `UnrollToBasis` path. `U_input = exp(i*globalPhaseRadians) * U_output`; the phase is separate because OpenQASM 2 omits it. Wire labels are unchanged. No resource database, layout/routing, task scheduler or `OneQubitGateOptimization` is called. The latter pass raises a mixed DAG node label error in the pinned release.
- QuAIRKit applies the ordered channel list after the entire ideal gate circuit. Amplitude damping and phase damping take gamma; depolarizing means `(1-p)*rho + p*I/2` locally, with the corresponding Kraus extension to entangled states. Matrix elements are raw `[real,imag]` pairs. Trace, purity and Hermiticity residuals are descriptive diagnostics.
- QCompute's local `output_state` requires terminal measurement metadata but does not collapse the returned state. Its NumPy 1.x implementation has one tensor axis per qubit and an actual `MAXDIMS` representation limit. The package's import-time output directory is redirected to `.openquantum/cache/qcompute-simulation`.
- Qrisp uses an explicit `QrispSimulatorBackend`; per-bit X initialization, the static Python-integer Gidney adder and custom binary decoding avoid floating-point conversion at every integer boundary. The compiler may remove untouched zero wires, so the adapter restores those same SDK qubit objects before full-register measurement. Compiled counts may contain composite operations and are not hardware costs.
- Lightworks uses its `Rx` beam splitter convention with power reflectivity r: `[[sqrt(r), i*sqrt(1-r)], [i*sqrt(1-r), sqrt(r)]]`. The interface exposes all fixed-total-photon Fock outputs, without loss, source impurity, detector effects or postselection.

## Authentication and external services

These particular actions use local SDK paths and need no service account. SDK installation does not establish cloud access. Braket's `AwsDevice`, cloud jobs, S3 and QPUs are not invoked. Quafu backend discovery, Qibo hardware control and remote photonic submission remain distinct actions. User credentials belong in the platform credential settings for an appropriate service connector, never Tool arguments or source code.

Qrisp is independently installed under [EPL-2.0 with the stated secondary-license alternative](https://github.com/eclipse-qrisp/Qrisp/blob/main/LICENSE), and its connection is opt in. The other top-level SDKs use Apache-2.0; transitive licenses remain attached to their separately installed distributions. Sources: [QSteed](https://github.com/BAQIS-Quantum/qsteed), [PyQuafu](https://github.com/ScQ-Cloud/pyquafu), [QuAIRKit](https://github.com/QuAIR/QuAIRKit), [QCompute](https://github.com/baidu/QCompute), [Qibo](https://github.com/qiboteam/qibo), [Lightworks](https://github.com/Aegiq/lightworks), [Amazon Braket SDK](https://github.com/amazon-braket/amazon-braket-sdk-python).

## Verification record

The 2026-09-28 local verification used the installed SDKs, not a numerical replacement:

- Protocol contracts: 14/14 passed, covering strict input, declared Tool surface, provenance, worker environment, error responses, cancellation recovery and caller-selected sizes.
- Real SDK and MCP run: 14/14 passed, zero skipped. Seven numerical suites contain 102 cases: four circuit/compiler suites with 17 cases each, 16 QuAIRKit density/Kraus cases, 14 Qrisp arithmetic cases, and 4 Lightworks optical cases.
- Numerical suites deny socket connections and compare with independent dense unitary, local Kraus, modular arithmetic or enumerated-permanent references. They include asymmetric qubit/mode order, rotation phase, zero/vacuum, damping endpoints and wraparound, including exact low bits above 2^53 and 2^70. Three additional tests reject unaddressable state-vector arrays before allocation.
- Real MCP examples and defaults validate output schemas, echoed normalized inputs, dependency hashes and failure paths. Scoped JavaScript lint and whitespace checks passed.

Run offline protocol checks with `node --test tests/sdk-expansion-circuits-contracts.test.mjs`. After explicit setup, run `OPENQUANTUM_REAL_SDK_EXPANSION_CIRCUITS=1 node --test tests/sdk-expansion-circuits-live.test.mjs`. Detailed outputs and source hashes are under the ignored `.openquantum/sdk-expansion-evidence/circuits/` directory. Harness-wide registration and end-to-end evidence are recorded separately by the batch integration.

These checks establish the adapter contracts and numerical behavior in the stated cases. They do not establish scalability, performance superiority, actual hardware access or scientific Acceptance.
