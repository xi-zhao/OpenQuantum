# QCompute upstream

- Source: [https://github.com/baidu/QCompute](https://github.com/baidu/QCompute)
- Pinned package: `QCompute==3.3.5`; Python 3.10; exact transitive dependencies in `../uv.lock`.
- License: Apache-2.0. This adapter imports the independently installed SDK; it does not copy vendor implementation into OpenQuantum.
- Scope: local statevector probabilities using official simulator.
- Input/output, methods and side effects are enforced by `../mcp/contracts.mjs` and the worker implementation. No credentials are accepted as Tool arguments.
- Verification: `../test/science_test.py` exercises the real SDK against independent analytical/dense references while denying socket connections. `tests/sdk-expansion-circuits-live.test.mjs` exercises real MCP output, provenance, defaults and failure. Detailed local results are kept under `.openquantum/sdk-expansion-evidence/circuits`.
- These tests establish engineering behavior within their recorded cases; they do not establish hardware access, performance scaling or scientific Acceptance.

Legacy dependency isolation is intentional: the SDK requires Python <3.11. The adapter calls the vendor simulator in process with terminal measurement metadata and output_state, avoids QEnv.commit, and routes import-time output directory creation to `.openquantum/cache/qcompute-simulation`.
