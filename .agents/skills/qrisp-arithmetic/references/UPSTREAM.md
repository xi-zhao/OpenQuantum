# qrisp upstream

- Source: [https://github.com/eclipse-qrisp/Qrisp](https://github.com/eclipse-qrisp/Qrisp)
- Pinned package: `qrisp==0.9.9`; Python 3.12; exact transitive dependencies in `../uv.lock`.
- License: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0. This adapter imports the independently installed SDK; it does not copy vendor implementation into OpenQuantum.
- Scope: QuantumFloat unsigned addition modulo 2^width; local exact measurement.
- Input/output, methods and side effects are enforced by `../mcp/contracts.mjs` and the worker implementation. No credentials are accepted as Tool arguments.
- Verification: `../test/science_test.py` exercises the real SDK against independent analytical/dense references while denying socket connections. `tests/sdk-expansion-circuits-live.test.mjs` exercises real MCP output, provenance, defaults and failure. Detailed local results are kept under `.openquantum/sdk-expansion-evidence/circuits`.
- These tests establish engineering behavior within their recorded cases; they do not establish hardware access, performance scaling or scientific Acceptance.
