import base64
import importlib.util
import os
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("netqasm_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class NetworkPrograms(unittest.TestCase):
    def test_real_compiler_all_bases_and_binary_round_trip(self):
        from netqasm.lang.parsing import deserialize
        for a in ["X", "Z"]:
            for b in ["X", "Z"]:
                with self.subTest(alice=a, bob=b), patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden")):
                    result = bridge.prepare({"aliceBasis": a, "bobBasis": b})
                self.assertFalse(result["simulated"])
                for program in result["programs"]:
                    binary = base64.b64decode(program["subroutineBase64"])
                    subroutine = deserialize(binary)
                    mnemonics = [instruction.mnemonic for instruction in subroutine.instructions]
                    self.assertIn("create_epr" if program["node"] == "Alice" else "recv_epr", mnemonics)
                    self.assertEqual(mnemonics.count("h"), 1 if program["basis"] == "X" else 0)
                    self.assertIn("meas", mnemonics)
                    self.assertEqual(bytes(subroutine), binary)

    def test_missing_licensed_backend_does_not_install_or_connect(self):
        with patch.object(bridge.importlib.metadata, "version", side_effect=bridge.importlib.metadata.PackageNotFoundError), patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden")):
            with self.assertRaisesRegex(ValueError, "not configured"):
                bridge.simulate({"aliceBasis": "Z", "bobBasis": "Z", "shots": 10, "seed": 1, "linkNoise": 0, "linkDelayNs": 10})

    @unittest.skipUnless(os.environ.get("OPENQUANTUM_REAL_SQUIDASM") == "1", "Requires user-licensed NetSquid stack")
    def test_optional_real_squidasm_ideal_correlations(self):
        for basis in ["X", "Z"]:
            with patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden")):
                result = bridge.simulate({"aliceBasis": basis, "bobBasis": basis, "shots": 50, "seed": 42, "linkNoise": 0, "linkDelayNs": 10})
            self.assertEqual(sum(row["count"] for row in result["counts"]), 50)
            self.assertEqual(result["agreementFraction"], 1)


if __name__ == "__main__":
    unittest.main()
