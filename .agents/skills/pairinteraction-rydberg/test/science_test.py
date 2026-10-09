"""Analytic matrix and database integrity tests; not scientific acceptance."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "mcp"))
import database
from reference import second_order_reference


class MatrixReferenceTests(unittest.TestCase):
    def test_single_level_virtual_transition(self):
        effective, correction, ratio, gap = second_order_reference([[0, 2], [2, 20]], [0])
        self.assertAlmostEqual(effective[0, 0], -0.2)
        self.assertAlmostEqual(correction[0, 0], -0.2)
        self.assertAlmostEqual(ratio, 0.1)
        self.assertEqual(gap, 20)

    def test_quasi_degenerate_hermitized_denominators(self):
        matrix = np.array([[0, 0.3, 1], [0.3, 2, 2], [1, 2, 10]])
        effective, _, _, _ = second_order_reference(matrix, [0, 1])
        expected = [[-0.1, 0.3 - (1 / 10 + 1 / 8)], [0.3 - (1 / 10 + 1 / 8), 2 - 4 / 8]]
        np.testing.assert_allclose(effective, expected, atol=1e-15)
        reversed_basis, _, _, _ = second_order_reference(matrix, [1, 0])
        np.testing.assert_allclose(reversed_basis, np.asarray(expected)[::-1, ::-1])

    def test_degenerate_and_empty_external_spaces_fail(self):
        for matrix, indices, message in [([[0, 1], [1, 0]], [0], "degenerate"),
                                         ([[0, 0], [0, 10]], [0], "No coupled"),
                                         ([[0]], [0], "No coupled")]:
            with self.assertRaisesRegex(ValueError, message):
                second_order_reference(matrix, indices)
        # An uncoupled degenerate state contributes nothing, rather than 0/0.
        value, _, _, _ = second_order_reference([[0, 0, 2], [0, 0, 0], [2, 0, 20]], [0])
        self.assertAlmostEqual(value[0, 0], -0.2)


class DatabaseIntegrityTests(unittest.TestCase):
    def test_missing_modified_and_additional_versions_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            file = root / "tables/Rb_v2.0/states.parquet"
            file.parent.mkdir(parents=True)
            expected = hashlib.sha256(b"locked").hexdigest()
            spec = {"release": "test-only", "archives": [{"files": {"Rb_v2.0/states.parquet": expected}}]}
            with patch.object(database, "database_spec", return_value=(spec, "0" * 64)):
                with self.assertRaisesRegex(ValueError, "missing"):
                    database.verify_database(root)
                file.write_bytes(b"locked")
                self.assertEqual(database.verify_database(root)["files"][0]["sha256"], expected)
                file.write_bytes(b"modified")
                with self.assertRaisesRegex(ValueError, "checksum"):
                    database.verify_database(root)
                file.write_bytes(b"locked")
                newer = root / "tables/Rb_v2.1/states.parquet"
                newer.parent.mkdir(); newer.write_bytes(b"locked")
                with self.assertRaisesRegex(ValueError, "unexpected"):
                    database.verify_database(root)

    def test_manifest_and_archive_addresses_are_fixed(self):
        spec, digest = database.database_spec()
        self.assertEqual(spec["release"], "v2.0")
        self.assertEqual(len(digest), 64)
        self.assertEqual(sum(len(row["files"]) for row in spec["archives"]), 7)
        for row in spec["archives"]:
            self.assertEqual(row["url"], f"https://github.com/pairinteraction/database-sqdt/releases/download/v2.0/{row['name']}.zip")
            self.assertEqual(len(row["sha256"]), 64)
        json.dumps(spec, allow_nan=False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
