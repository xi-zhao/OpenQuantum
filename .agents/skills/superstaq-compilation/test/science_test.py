"""Real Superstaq SDK with HTTP transport fixtures; no external service call."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

import numpy as np
import requests
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
import qiskit_superstaq as qss

spec = importlib.util.spec_from_file_location("superstaq_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
INPUT = {"numQubits": 3, "gates": [{"gate": "RY", "targets": [2], "angle": .4}, {"gate": "CX", "targets": [2, 0]}]}
TARGET = "ss_unconstrained_simulator"


def response(payload, status=200):
    value = requests.Response()
    value.status_code = status
    value.reason = "fixture response"
    value._content = json.dumps(payload).encode()
    return value


class SuperstaqTests(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.key = patch.dict(os.environ, {"SUPERSTAQ_API_KEY": "fixture-only-not-a-credential"})
        self.key.start()
        self.addCleanup(self.key.stop)

    def test_offline_roundtrip_preserves_idle_qubits_and_unitary(self):
        with patch.object(requests.Session, "send", side_effect=AssertionError("HTTP forbidden")):
            output, _ = bridge.compute(INPUT, "prepare_superstaq_circuit")
        actual = qss.deserialize_circuits(output["serializedCircuit"])[0]
        reference = QuantumCircuit(3)
        reference.ry(.4, 2)
        reference.cx(2, 0)
        np.testing.assert_allclose(Operator(actual).data, Operator(reference).data, atol=1e-14)
        self.assertEqual(actual.num_qubits, 3)
        self.assertFalse(output["networkUsed"])

    def test_missing_key_fails_before_transport(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(requests.Session, "send", side_effect=AssertionError("HTTP forbidden")):
            with self.assertRaisesRegex(ValueError, "not configured"):
                bridge.compute({"requestTimeoutSeconds": 2}, "list_superstaq_targets")

    def test_targets_real_sdk_fixed_endpoint_timeout_and_no_redirect(self):
        fields = {"supports_submit": True, "supports_submit_qubo": False, "supports_compile": True, "available": True, "accessible": True, "retired": False}
        with patch("requests.sessions.get_netrc_auth", side_effect=AssertionError("implicit credentials forbidden")), patch.object(requests.Session, "send", return_value=response({"superstaq_targets": {TARGET: fields}})) as send:
            output, _ = bridge.compute({"requestTimeoutSeconds": 7}, "list_superstaq_targets")
        self.assertEqual(output["targets"][0]["target"], TARGET)
        prepared = send.call_args.args[0]
        self.assertEqual(prepared.url, bridge.ENDPOINT + "/targets")
        self.assertEqual(prepared.headers["Authorization"], "fixture-only-not-a-credential")
        self.assertEqual(json.loads(prepared.body)["supports_compile"], True)
        self.assertEqual(send.call_args.kwargs["timeout"], 7)
        self.assertFalse(send.call_args.kwargs["allow_redirects"])
        self.assertEqual(send.call_count, 1)

    def test_remote_compile_real_sdk_serialization_and_layout(self):
        expected = QuantumCircuit(4)
        expected.ry(.4, 1)
        expected.cx(1, 3)
        payload = {"qiskit_circuits": qss.serialize_circuits(expected), "initial_logical_to_physicals": json.dumps([[[0, 3], [1, 0], [2, 1]]]), "final_logical_to_physicals": json.dumps([[[0, 3], [1, 0], [2, 1]]])}
        with patch.object(requests.Session, "send", return_value=response(payload)) as send:
            output, _ = bridge.compute({**INPUT, "target": TARGET, "requestTimeoutSeconds": 5}, "compile_superstaq_circuit")
        prepared = send.call_args.args[0]
        self.assertEqual(prepared.url, bridge.ENDPOINT + "/compile")
        request = json.loads(prepared.body)
        original = qss.deserialize_circuits(request["qiskit_circuits"])[0]
        np.testing.assert_allclose(Operator(original).data, Operator(bridge.circuit_from_input(INPUT)).data)
        self.assertNotIn("shots", request)
        self.assertNotIn("repetitions", request)
        self.assertEqual(output["initialLogicalToPhysical"], [[0, 3], [1, 0], [2, 1]])
        self.assertFalse(output["hardwareExecuted"])
        self.assertEqual(qss.deserialize_circuits(output["serializedCircuit"])[0], expected)
        self.assertEqual(send.call_count, 1)

    def test_retry_auth_and_redirect_boundaries(self):
        for status, payload, error in [(503, "unavailable", TimeoutError), (401, "You must accept the Terms of Use (superstaq.infleqtion.com/terms_of_use).", ValueError), (302, "redirect", ValueError)]:
            with self.subTest(status=status), patch.object(requests.Session, "send", return_value=response(payload, status)) as send, patch("builtins.input", side_effect=AssertionError("no interactive account mutation")):
                with self.assertRaises(error):
                    bridge.compute({"requestTimeoutSeconds": 1}, "list_superstaq_targets")
                self.assertEqual(send.call_count, 1)
        with patch.object(requests.Session, "send", side_effect=AssertionError("HTTP forbidden")):
            with self.assertRaisesRegex(ValueError, "official"):
                bridge.provider(1)._client.session.get("https://example.com/compile")

    def test_invalid_layout_is_rejected(self):
        payload = {"qiskit_circuits": qss.serialize_circuits(QuantumCircuit(3)), "initial_logical_to_physicals": json.dumps([[[0, 0], [1, 0], [2, 2]]]), "final_logical_to_physicals": json.dumps([[[0, 0], [1, 1], [2, 2]]])}
        with patch.object(requests.Session, "send", return_value=response(payload)):
            with self.assertRaisesRegex(ValueError, "non-injective"):
                bridge.compute({**INPUT, "target": TARGET, "requestTimeoutSeconds": 1}, "compile_superstaq_circuit")

    def test_redirect_does_not_prepare_a_request_or_read_another_credential(self):
        redirected = response("redirect", 302)
        redirected.headers["Location"] = "https://another.invalid/compile"
        def transport(prepared, **kwargs):
            redirected.request = prepared
            redirected.url = prepared.url
            self.assertEqual(prepared.headers["Authorization"], "fixture-only-not-a-credential")
            return redirected
        with patch.object(requests.adapters.HTTPAdapter, "send", side_effect=transport) as send, patch("requests.sessions.get_netrc_auth", side_effect=AssertionError("implicit credentials forbidden")):
            with self.assertRaisesRegex(ValueError, "redirects"):
                bridge.compute({"requestTimeoutSeconds": 1}, "list_superstaq_targets")
            self.assertEqual(send.call_count, 1)
            self.assertIsNone(redirected.next)


if __name__ == "__main__":
    unittest.main()
