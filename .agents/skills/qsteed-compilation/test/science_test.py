import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, dense_unitary, circuit_cases, deny_network
compute = bridge("qsteed-compilation")
deny_network()


class CompilerScience(unittest.TestCase):
    def test_phase_complete_unitary_equivalence_and_wire_order(self):
        evidence = []
        for value in circuit_cases():
            result, _ = compute(value)
            expected = dense_unitary(value)
            actual = dense_unitary({"numQubits": value["numQubits"], "gates": result["gates"]})
            error = float(np.max(abs(np.exp(1j*result["globalPhaseRadians"]) * actual - expected)))
            self.assertLess(error, 1e-10)
            self.assertEqual(result["outputGateCount"], len(result["gates"]))
            self.assertTrue(result["qasm"].startswith("OPENQASM 2.0;"))
            evidence.append({"input": value, "maxUnitaryErrorIncludingPhase": error, "globalPhaseRadians": result["globalPhaseRadians"]})
        record("qsteed-compilation", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "independent dense unitary of every input and output gate"})


if __name__ == "__main__":
    unittest.main()
