"""Local program/config serialization with sockets forbidden."""
import ast
import base64
import importlib.util
import json
import builtins
import os
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("qua_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)


class QuaTest(unittest.TestCase):
    def test_offline_import_ignores_existing_config_without_changing_home(self):
        before = {key: os.environ.get(key) for key in ("HOME", "USERPROFILE")}
        before_finders = list(sys.meta_path)
        original_open, original_exists = builtins.open, os.path.exists
        original_set = type(os.environ).__setitem__

        def is_qm_config(path):
            return isinstance(path, (str, os.PathLike)) and str(path).replace("\\", "/").endswith("/.qm/config.json")

        def no_user_config(path, *args, **kwargs):
            if is_qm_config(path):
                raise AssertionError("QM user config must not be read")
            return original_open(path, *args, **kwargs)

        def preserve_home(env, key, value):
            if key in ("HOME", "USERPROFILE"):
                raise AssertionError("HOME and USERPROFILE must not be reassigned")
            return original_set(env, key, value)

        v = {"pulses": [{"amplitudeVolts": -.25, "durationNs": 16, "waitAfterNs": 0}], "repetitions": 3}
        with patch.object(builtins, "open", no_user_config), \
             patch.object(os.path, "exists", lambda p: True if is_qm_config(p) else original_exists(p)), \
             patch.object(type(os.environ), "__setitem__", preserve_home), \
             patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected network")):
            result, _ = bridge.compute(v)
        import qm
        self.assertFalse(qm.config.upload_logs)
        self.assertEqual(qm.config.user_token, "")
        self.assertIsNone(qm.config.manager_host)
        self.assertEqual(qm.UserConfig.create_from_file.__func__.__module__, "qm.user_config")
        self.assertEqual(before, {key: os.environ.get(key) for key in before})
        self.assertEqual(before_finders, sys.meta_path)
        self.assertEqual(result["nominalDurationNs"], 48)
        calls = [n for n in ast.walk(ast.parse(result["quaSource"])) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
        self.assertFalse(any(n.func.id == "wait" for n in calls))

    def test_serialized_pulse_program_matches_voltages_timing_and_loop(self):
        v = {"pulses": [{"amplitudeVolts": .2, "durationNs": 40, "waitAfterNs": 16}, {"amplitudeVolts": -.1, "durationNs": 24, "waitAfterNs": 0}], "repetitions": 2}
        with patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected network")):
            result, _ = bridge.compute(v)
        config = json.loads(result["configurationJson"])
        self.assertEqual(config["waveforms"]["wave0"]["sample"], .2)
        self.assertEqual(config["waveforms"]["wave1"]["sample"], -.1)
        self.assertEqual(config["pulses"]["pulse1"]["length"], 24)
        self.assertEqual(result["nominalDurationNs"], 160)
        self.assertEqual(len(base64.b64decode(result["programBase64"])), result["programBytes"])
        tree = ast.parse(result["quaSource"])
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)]
        self.assertEqual(sum(node.func.id == "play" for node in calls), 2)
        waits = [node for node in calls if node.func.id == "wait"]
        self.assertEqual(len(waits), 1)
        self.assertEqual(ast.literal_eval(waits[0].args[0]), 4)
        self.assertFalse(result["networkUsed"])
        self.assertFalse(result["hardwareExecuted"])


if __name__ == "__main__":
    unittest.main()
