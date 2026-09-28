"""Q-CTRL real graph and SDK GraphQL transport without external connectivity."""
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

SPEC = importlib.util.spec_from_file_location("qctrl_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)


class QctrlTest(unittest.TestCase):
    def setUp(self):
        self.block = patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected real network"))
        self.block.start()
        self.addCleanup(self.block.stop)

    def test_local_graph_encodes_hamiltonian_axes_and_units(self):
        import numpy as np
        v = {"durationSeconds": 2e-6, "segments": [{"omegaX": 1, "omegaY": 2, "detuning": 3}, {"omegaX": 4, "omegaY": 5, "detuning": 6}]}
        with patch.dict(os.environ, {}, clear=True):
            result, _ = bridge.compute(v, "prepare_boulder_opal_control")
        from qctrlcommons.serializers import DataTypeDecoder
        graph = json.loads(result["graphJson"])
        signal_nodes = [n for n in graph["operations"].values() if n["operation_name"] == "pwc_signal"]
        operator_nodes = [n for n in graph["operations"].values() if n["operation_name"] == "pwc_operator"]
        self.assertEqual(len(signal_nodes), 3)
        for node, expected in zip(signal_nodes, [[1, 4], [2, 5], [3, 6]]):
            values = json.loads(json.dumps(node["kwargs"]["values"]), cls=DataTypeDecoder)
            np.testing.assert_array_equal(values, expected)
            self.assertEqual(node["kwargs"]["duration"], 2e-6)
        for node, matrix in zip(operator_nodes, [[[0, .5], [.5, 0]], [[0, -.5j], [.5j, 0]], [[.5, 0], [0, -.5]]]):
            operator = json.loads(json.dumps(node["kwargs"]["operator"]), cls=DataTypeDecoder)
            np.testing.assert_array_equal(operator, matrix)
        self.assertEqual(result["outputShape"], [1, 2, 2])
        self.assertFalse(result["networkUsed"])
        self.assertFalse(result["evaluated"])

    def test_missing_key_before_sdk_import(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(bridge, "sdk_modules", side_effect=AssertionError("must fail before SDK import")):
            with self.assertRaisesRegex(ValueError, "QCTRL_API_KEY is not configured"):
                bridge.compute({"product": "fire-opal", "jobId": "123"}, "get_qctrl_job_status")

    def test_both_products_use_real_auth_organization_and_status_queries(self):
        claims = {"exp": time.time() + 3600, "email": "fixture@example.invalid", "given_name": "SDK", "family_name": "Fixture"}
        access_token = ".".join(base64.urlsafe_b64encode(json.dumps(p).encode()).decode().rstrip("=") for p in [{"alg": "HS256"}, claims]) + ".Zml4dHVyZS1zaWduYXR1cmU"
        for product in ("boulder-opal", "fire-opal"):
            calls = []
            def handle(_transport, request):
                self.assertEqual(str(request.url), bridge.ENDPOINT)
                self.assertEqual(request.method, "POST")
                self.assertEqual(request.extensions["timeout"]["read"], 5)
                body = json.loads(request.content)
                calls.append(body)
                self.assertNotIn("mutation", body["query"])
                if "accessToken" in body["query"]:
                    self.assertEqual(body["variables"]["apiKey"], "fixture-api-key")
                    data = {"accessToken": {"accessToken": access_token, "errors": []}}
                elif "profile" in body["query"]:
                    self.assertEqual(request.headers["Authorization"], "Bearer " + access_token)
                    data = {"profile": {"profile": {"organizations": [{"id": "1", "slug": "fixture", "name": "Fixture", "products": [{"name": product, "active": True}]}]}, "errors": []}}
                else:
                    self.assertEqual(body["variables"], {"modelId": "123"})
                    data = {"action": {"action": {"status": "SUCCESS", "errors": [], "result": None}, "errors": []}}
                return httpx.Response(200, json={"data": data}, request=request)
            with patch.dict(os.environ, {"QCTRL_API_KEY": "fixture-api-key"}), patch.object(httpx.HTTPTransport, "handle_request", handle):
                result, _ = bridge.compute({"product": product, "jobId": "123", "organizationSlug": "fixture", "requestTimeoutSeconds": 5}, "get_qctrl_job_status")
            self.assertEqual(len(calls), 3)
            self.assertEqual(result["status"], "SUCCESS")
            self.assertFalse(result["hardwareExecuted"])
            self.assertNotIn(access_token, json.dumps(result))

    def test_failures_redact_service_body_and_never_retry_or_redirect(self):
        for status in (401, 500, 302):
            calls = []
            def handle(_transport, request):
                calls.append(request)
                return httpx.Response(status, json={"errors": [{"message": "sensitive-derived-token"}]}, headers={"Location": "https://untrusted.invalid/"}, request=request)
            capture = io.StringIO()
            with patch.dict(os.environ, {"QCTRL_API_KEY": "fixture-api-key"}), patch.object(httpx.HTTPTransport, "handle_request", handle), contextlib.redirect_stderr(capture):
                with self.assertRaises(ValueError) as caught:
                    bridge.compute({"product": "fire-opal", "jobId": "123", "requestTimeoutSeconds": 5}, "get_qctrl_job_status")
            self.assertEqual(len(calls), 1)
            self.assertNotIn("sensitive-derived-token", str(caught.exception) + capture.getvalue())


if __name__ == "__main__":
    unittest.main()
