# qsteed upstream

- Source: [https://github.com/BAQIS-Quantum/qsteed](https://github.com/BAQIS-Quantum/qsteed)
- Pinned package: `qsteed==0.2.3`; Python 3.12; exact transitive dependencies in `../uv.lock`.
- License: Apache-2.0. This adapter imports the independently installed SDK; it does not copy vendor implementation into OpenQuantum.
- Scope: PyQuafu circuit to QSteed fixed basis compilation; offline; no resource database or submission.
- Input/output, methods and side effects are enforced by `../mcp/contracts.mjs` and the worker implementation. No credentials are accepted as Tool arguments.
- Verification: `../test/science_test.py` exercises the real SDK against independent analytical/dense references while denying socket connections. `tests/sdk-expansion-circuits-live.test.mjs` exercises real MCP output, provenance, defaults and failure. Detailed local results are kept under `.openquantum/sdk-expansion-evidence/circuits`.
- These tests establish engineering behavior within their recorded cases; they do not establish hardware access, performance scaling or scientific Acceptance.

The pinned QSteed release requires `pyquafu==0.4.4` ([upstream](https://github.com/ScQ-Cloud/pyquafu), Apache-2.0). The adapter uses standalone Transpiler/Model/UnrollToBasis, not resource database configuration or task scheduling.
