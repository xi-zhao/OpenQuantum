"""Check that regenerated artifacts identify the recorded benchmark hardware."""
import html
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import report


class ReportHardwareTests(unittest.TestCase):
    def test_cpu_platform_and_missing_metadata(self):
        self.assertEqual(report.machine_label({"cpu": "Test CPU", "platform": "Linux"}), "Test CPU")
        self.assertEqual(report.machine_label({"cpu": "", "platform": "Test Linux x86_64"}), "Test Linux x86_64")
        self.assertEqual(report.machine_label({}), "Hardware not recorded")

    def test_full_report_uses_recorded_cpu(self):
        original = Path(__file__).parent / "results"
        data = json.loads((original / "benchmark.json").read_text())
        machine = "Test CPU <vendor> & model"
        data["cpu"] = machine
        data["platform"] = "Test Linux x86_64"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "results"
            (output / "first-run").mkdir(parents=True)
            (output / "benchmark.json").write_text(json.dumps(data))
            for relative in ["validation.json", "build.json", "first-run/build.json"]:
                (output / relative).write_bytes((original / relative).read_bytes())
            with patch.object(report, "ROOT", root), patch.object(report, "OUT", output):
                report.main()
            readme = (root / "README.md").read_text()
            webpage = (output / "report.html").read_text()
            svg = (output / "timings.svg").read_text()
            self.assertIn(html.escape(machine), readme)
            self.assertNotIn("<vendor>", readme)
            self.assertIn(html.escape(machine), webpage)
            self.assertIn(html.escape(machine), svg)
            for content in [readme, webpage, svg]:
                self.assertNotIn("Apple M4", content)
            self.assertTrue((output / "timings.png").is_file())


if __name__ == "__main__":
    unittest.main()
