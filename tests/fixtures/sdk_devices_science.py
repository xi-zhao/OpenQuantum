"""Numerical test support, never part of the user Tool execution path."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import unittest

ROOT = Path(__file__).resolve().parents[2]
RECORDS = []


def block_network(*args, **kwargs):
    raise RuntimeError("Network disabled by numerical regression test")


socket.socket.connect = block_network
socket.create_connection = block_network


def bridge(capability):
    spec = importlib.util.spec_from_file_location(capability.replace("-", "_"), ROOT / ".agents/skills" / capability / "mcp/bridge.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def record(name, **values):
    RECORDS.append({"case": name, **values})


def run(capability):
    result = unittest.main(exit=False, verbosity=2).result
    evidence = Path(os.environ.get("OPENQUANTUM_SDK_DEVICES_EVIDENCE", ROOT / ".openquantum/sdk-evidence/devices"))
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / f"{capability}-science.json").write_text(json.dumps({
        "capability": capability, "passed": result.wasSuccessful(), "testsRun": result.testsRun,
        "network": "socket connections disabled", "scientificValidation": "not_evaluated", "cases": RECORDS,
    }, indent=2, allow_nan=False))
    raise SystemExit(0 if result.wasSuccessful() else 1)
