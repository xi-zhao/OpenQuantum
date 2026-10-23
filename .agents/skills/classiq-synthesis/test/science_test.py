"""Real SDK model/transport tests. No Classiq account or network is used."""
import base64
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import time
import unittest
from unittest.mock import patch

import httpx

SPEC = importlib.util.spec_from_file_location("classiq_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)
INPUT = {"numQubits": 3, "gates": [{"gate": "H", "targets": [2]}, {"gate": "CX", "targets": [2, 0]}, {"gate": "RZ", "targets": [1], "angle": 0.4}], "requestTimeoutSeconds": 5}


def token(endpoint=bridge.ENDPOINT):
    values = [{"alg": "HS256"}, {"exp": time.time() + 3600, "https://classiquantum.com/claims/sdk_service_url": endpoint}]
    return ".".join(base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip("=") for v in values) + ".Zml4dHVyZQ"


class ClassiqTest(unittest.TestCase):
    def setUp(self):
        self.block = patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected real network"))
        self.block.start()
        self.addCleanup(self.block.stop)

    def test_local_model_preserves_gate_targets_without_auth(self):
        with patch.dict(os.environ, {}, clear=True):
            result, _ = bridge.compute(INPUT, "prepare_classiq_model")
        from classiq.interface.model.model import Model
        model = Model.model_validate_json(result["modelJson"])
        main = next(f for f in model.functions if f.name == "main")
        serialized = main.model_dump_json()
        self.assertIn('"CX"', serialized)
        self.assertIn('"RZ"', serialized)
        self.assertIn("0.4", serialized)
        cx = next(item for item in main.model_dump()["body"] if item.get("function") == "CX")
        self.assertEqual([arg["index"]["expr"] for arg in cx["positional_args"]], ["2", "0"])
        self.assertFalse(result["networkUsed"])

    def test_missing_auth_fails_before_sdk_network(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(bridge, "build_model", side_effect=AssertionError("must fail before imports")):
            with self.assertRaisesRegex(ValueError, "CLASSIQ_XCH_TOKEN is not configured"):
                bridge.compute(INPUT, "synthesize_classiq_circuit")

    def test_real_sdk_upload_submit_poll_with_intercepted_transport(self):
        calls, uploaded = [], {}
        async def handle(_transport, request):
            calls.append(request)
            self.assertFalse(request.extensions["timeout"]["read"] > 5)
            if request.url.path.endswith("/upload-url"):
                payload = {"s3_key": "fixture/model.json", "url": "https://fixture.s3.us-east-1.amazonaws.com/model.json?X-Amz-Signature=fixture", "headers": {"Content-Type": "application/json"}}
            elif request.method == "PUT":
                self.assertNotIn("authorization", request.headers)
                uploaded.update(json.loads(request.content))
                payload = {}
            elif request.method == "POST":
                self.assertEqual(json.loads(request.content)["input_s3_key"], "fixture/model.json")
                payload = {"job_id": "fixture-job"}
            else:
                payload = {"status": "COMPLETED", "result": {"outputs": {}, "hardware_data": {}, "data": {"width": 3}, "model": uploaded["model"]}}
            return httpx.Response(200, json=payload, request=request)
        with patch.dict(os.environ, {"CLASSIQ_XCH_TOKEN": token()}), patch.object(httpx.AsyncHTTPTransport, "handle_async_request", handle):
            result, _ = bridge.compute(INPUT, "synthesize_classiq_circuit")
        self.assertEqual([r.method for r in calls], ["POST", "PUT", "POST", "GET"])
        self.assertTrue(result["networkUsed"])
        self.assertFalse(result["hardwareExecuted"])
        self.assertEqual(json.loads(result["quantumProgramJson"])["data"]["width"], 3)

    def test_remote_errors_redact_body_and_do_not_retry(self):
        for response_code in (401, 500, 302):
            calls = []
            async def handle(_transport, request):
                calls.append(request)
                return httpx.Response(response_code, json={"detail": "sensitive-derived-token"}, headers={"Location": "https://untrusted.invalid/"}, request=request)
            capture = io.StringIO()
            with patch.dict(os.environ, {"CLASSIQ_XCH_TOKEN": token()}), patch.object(httpx.AsyncHTTPTransport, "handle_async_request", handle), contextlib.redirect_stderr(capture):
                with self.assertRaises(ValueError) as caught:
                    bridge.compute(INPUT, "synthesize_classiq_circuit")
            self.assertEqual(len(calls), 1)
            self.assertNotIn("sensitive-derived-token", str(caught.exception) + capture.getvalue())

    def test_token_destination_and_signed_storage_boundary(self):
        with patch.dict(os.environ, {"CLASSIQ_XCH_TOKEN": token("https://untrusted.invalid")}):
            with self.assertRaisesRegex(ValueError, "must be issued for"):
                bridge.compute(INPUT, "synthesize_classiq_circuit")
        calls = []
        async def handle(_transport, request):
            calls.append(request)
            return httpx.Response(200, json={"s3_key": "fixture", "url": "http://127.0.0.1/private"}, request=request)
        with patch.dict(os.environ, {"CLASSIQ_XCH_TOKEN": token()}), patch.object(httpx.AsyncHTTPTransport, "handle_async_request", handle):
            with self.assertRaises(ValueError):
                bridge.compute(INPUT, "synthesize_classiq_circuit")
        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
