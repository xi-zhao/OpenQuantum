"""Regression checks for isolated reproduction; no SDK or Rust installation needed."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReproductionTests(unittest.TestCase):
    def test_build_records_and_failure_log_stay_in_requested_directory(self):
        build = load("build")
        for returncode in (0, 1):
            with self.subTest(returncode=returncode), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                tracked = root / "results"
                tracked.mkdir()
                (tracked / "build.log").write_text("committed evidence")
                output = root / "isolated"
                result = subprocess.CompletedProcess([], returncode, "compiler output", "compiler error")
                with mock.patch.object(build, "ROOT", root), \
                     mock.patch.object(sys, "argv", ["build.py", "--output", str(output)]), \
                     mock.patch.object(build.subprocess, "run", return_value=result), \
                     mock.patch.object(build.subprocess, "check_output", return_value="rustc test"), \
                     mock.patch.object(build.shutil, "copy2"), contextlib.redirect_stdout(io.StringIO()):
                    if returncode:
                        with self.assertRaises(subprocess.CalledProcessError):
                            build.main()
                    else:
                        build.main()
                self.assertEqual((tracked / "build.log").read_text(), "committed evidence")
                self.assertEqual(list(tracked.iterdir()), [tracked / "build.log"])
                self.assertEqual((output / "build.log").read_text(), "compiler outputcompiler error")
                self.assertEqual((output / "build.json").exists(), not returncode)

    def test_all_regenerates_report_after_successful_measurements(self):
        self.check_runner(None, ["build.py", "validate.py", "benchmark.py", "make_report.py"])

    def test_failure_stops_before_publishing_a_report(self):
        self.check_runner("benchmark.py", ["build.py", "validate.py", "benchmark.py"])

    def check_runner(self, failure, expected):
        reproduce = load("reproduce")
        sdk = {"environmentState": "prepared", "run": {
            "command": "selected-sdk-python", "environment": {"SDK_TEST": "selected"}}}
        commands = []

        def execute(command, **kwargs):
            commands.append(command)
            self.assertEqual(command[0], "selected-sdk-python")
            self.assertEqual(kwargs["env"]["SDK_TEST"], "selected")
            process = mock.Mock(stdout=io.StringIO("phase completed\n"))
            process.wait.return_value = 1 if Path(command[2]).name == failure else 0
            return process

        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "isolated"
            with mock.patch.object(sys, "argv", ["reproduce.py", "--locator", "locator.mjs",
                                                "--node", "node", "--output", str(output)]), \
                 mock.patch.object(reproduce.subprocess, "check_output", return_value=json.dumps(sdk)), \
                 mock.patch.object(reproduce.subprocess, "Popen", side_effect=execute), \
                 contextlib.redirect_stdout(io.StringIO()):
                if failure:
                    with self.assertRaises(SystemExit):
                        reproduce.main()
                else:
                    reproduce.main()
            self.assertEqual([Path(command[2]).name for command in commands], expected)
            for command in commands:
                self.assertEqual(command[3:], ["--output", str(output.resolve())])


if __name__ == "__main__":
    unittest.main()
