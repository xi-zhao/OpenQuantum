import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tests/fixtures"))
from sdk_compilers_reference import load_bridge, deny_network, dense_unitary, circuit_cases, write_evidence
compute = load_bridge(Path(__file__).resolve().parents[1] / "mcp/bridge.py")
deny_network()


class CompilationTests(unittest.TestCase):
    def test_unitary_phase_and_wire_mapping(self):
        from pytket.qasm import circuit_from_qasm_str
        evidence = []
        for v in circuit_cases():
            for optimize in [False, True]:
                actual, _ = compute({**v, "optimize": optimize})
                compiled = circuit_from_qasm_str(actual["qasm"])
                rebuilt = compiled.get_unitary() * np.exp(1j * actual["globalPhaseRadians"])
                error = float(np.max(np.abs(rebuilt - dense_unitary(v))))
                self.assertLess(error, 1e-10)
                evidence.append({"input": {**v, "optimize": optimize}, "maxUnitaryError": error,
                                 "before": actual["before"], "after": actual["after"]})
        write_evidence("pytket-compilation", {"cases": evidence, "networkGuard": "socket connections denied"})

    def test_cancelling_gates_are_removed(self):
        result, _ = compute({"numQubits": 2, "gates": [{"gate": "H", "targets": [0]}] * 2, "optimize": True})
        self.assertEqual(result["before"]["gates"], 2)
        self.assertEqual(result["after"]["gates"], 0)


if __name__ == "__main__":
    unittest.main()
