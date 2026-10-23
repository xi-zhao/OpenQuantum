"""Real vendor clients; only their HTTP transports use deterministic fixtures."""
import importlib.util
import json
import math
import os
import socket
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
CAPABILITY = sys.argv.pop(1)
spec = importlib.util.spec_from_file_location("adapter", ROOT / ".agents/skills" / CAPABILITY / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
FAKE_TOKEN = "transport-fixture-token-NOT-A-CREDENTIAL"
BELL = {"numQubits": 2, "gates": [{"gate": "h", "targets": [0]}, {"gate": "cx", "targets": [0, 1]}], "shots": 512, "seed": 17, "noise": False}


class NoNetwork(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("Unmocked network prohibited"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.environment = patch.dict(os.environ, {}, clear=False)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        for name in ("AQT_API_TOKEN", "OQC_API_TOKEN", "OQC_API_ENDPOINT", "QUANTUMINSPIRE_API_TOKEN"):
            os.environ.pop(name, None)


if CAPABILITY == "aqt-workbench":
    class AqtTests(NoNetwork):
        def setUp(self):
            super().setUp()
            # Harness appends IPv6 loopback to NO_PROXY; old HTTPX parsing must
            # not affect an offline backend or the explicit remote transport.
            os.environ["ALL_PROXY"] = "socks5://localhost:9"
            os.environ["NO_PROXY"] = "localhost,::1"

        def test_bell_sampling_and_seed(self):
            first, _ = bridge.compute(BELL, "simulate_aqt_circuit")
            second, _ = bridge.compute(BELL, "simulate_aqt_circuit")
            self.assertEqual(first, second)
            counts = {r["bitstring"]: r["count"] for r in first["counts"]}
            self.assertEqual(set(counts), {"00", "11"})
            self.assertEqual(sum(counts.values()), 512)
            self.assertLess(abs(counts["00"] / 512 - 0.5), 0.1)
            self.assertFalse(first["networkUsed"])
            self.assertTrue(first["nativeGates"])

        def test_qubit_order_and_rotation(self):
            for gates, expected in [([{"gate": "x", "targets": [0]}], "01"), ([{"gate": "ry", "angle": math.pi, "targets": [1]}], "10")]:
                result, _ = bridge.compute({**BELL, "gates": gates}, "simulate_aqt_circuit")
                self.assertEqual(result["counts"], [{"bitstring": expected, "count": 512}])
            noisy, _ = bridge.compute({**BELL, "noise": True}, "simulate_aqt_circuit")
            self.assertEqual(sum(row["count"] for row in noisy["counts"]), 512)
            with self.assertRaises(Exception):
                bridge.compute({**BELL, "shots": 2001}, "simulate_aqt_circuit")

        def transport(self, mode):
            import httpx
            original = httpx.Client
            calls = []
            def handler(request):
                calls.append(request)
                self.assertEqual(request.url.host, "arnica.aqt.eu")
                self.assertEqual(request.method, "GET")
                self.assertEqual(request.headers["authorization"], f"Bearer {FAKE_TOKEN}")
                if mode == "unauthorized":
                    return httpx.Response(401, json={"detail": FAKE_TOKEN})
                if mode == "redirect":
                    return httpx.Response(302, headers={"location": "https://example.invalid/"})
                if request.url.path.endswith("/workspaces"):
                    return httpx.Response(200, json=[{"id": "ws", "accepting_job_submissions": True, "jobs_being_processed": True, "resources": [{"id": "dev", "name": "Fixture", "type": "device"}]}])
                self.assertTrue(request.url.path.endswith("/resources/dev"))
                return httpx.Response(200, json={"id": "dev", "name": "Fixture", "type": "device", "status": "online", "available_qubits": 20, "status_updated_at": "2026-09-28T00:00:00Z"})
            def client(**kwargs):
                return original(**kwargs, transport=httpx.MockTransport(handler), trust_env=False)
            return calls, patch("httpx.Client", client)

        def test_actual_discovery_client(self):
            os.environ["AQT_API_TOKEN"] = FAKE_TOKEN
            os.environ["AQT_PORTAL_URL"] = "https://example.invalid"
            calls, transport = self.transport("ok")
            with transport:
                result, _ = bridge.compute({"requestTimeoutSeconds": 2}, "list_aqt_devices")
            self.assertEqual(len(calls), 2)
            self.assertEqual(result["devices"], [{"workspaceId": "ws", "id": "dev", "name": "Fixture", "type": "device", "numQubits": 20}])

        def test_failures_are_sanitized_and_not_retried(self):
            with self.assertRaisesRegex(ValueError, "AQT_API_TOKEN"):
                bridge.compute({"requestTimeoutSeconds": 2}, "list_aqt_devices")
            os.environ["AQT_API_TOKEN"] = FAKE_TOKEN
            for mode in ("unauthorized", "redirect"):
                calls, transport = self.transport(mode)
                with transport, self.assertRaises(ValueError) as caught:
                    bridge.compute({"requestTimeoutSeconds": 2}, "list_aqt_devices")
                self.assertNotIn(FAKE_TOKEN, str(caught.exception))
                self.assertEqual(len(calls), 1)

elif CAPABILITY == "oqc-cloud":
    class OqcTests(NoNetwork):
        def transport(self, mode="ok"):
            import requests
            calls = []
            def send(session, request, **kwargs):
                calls.append(request)
                self.assertTrue(request.url.startswith("https://cloud.oqc.app/"))
                self.assertEqual(request.headers["Authentication-Token"], FAKE_TOKEN)
                self.assertFalse(kwargs["allow_redirects"])
                self.assertFalse(session.trust_env)
                self.assertEqual(session.adapters["https://"].max_retries.total, 0)
                response = requests.Response()
                response.request = request
                response.url = request.url
                response.status_code = 200
                if mode == "redirect":
                    response.status_code = 302
                    response.headers["Location"] = "https://example.invalid"
                    body = {"error": FAKE_TOKEN}
                elif mode == "unauthorized":
                    response.status_code = 401
                    body = {"error": FAKE_TOKEN}
                elif request.url.endswith("/admin/version"):
                    body = {"version": "1.0"}
                elif "/admin/qpu" in request.url:
                    body = {"items": [{"id": "qpu:test", "name": "Fixture", "active": True, "url": "https://example.invalid" if mode == "offdomain" else "https://cloud.oqc.app/fixture"}]}
                elif request.url.endswith("/tasks/submit"):
                    self.assertEqual(request.method, "POST")
                    if mode == "timeout":
                        raise requests.Timeout(FAKE_TOKEN)
                    body = [{"task_id": "fixture-task"}]
                elif request.url.endswith("/tasks/fixture-task/status"):
                    body = {"status": "COMPLETED"}
                else:
                    raise AssertionError(f"Unexpected fixture route {request.method} {request.url}")
                response._content = json.dumps(body).encode()
                response.headers["Content-Type"] = "application/json"
                return response
            return calls, patch("requests.Session.send", send)

        def input(self, **extra):
            return {**BELL, "qpuId": "qpu:test", "requestTimeoutSeconds": 2, **extra}

        def test_local_sdk_serialization(self):
            result, _ = bridge.compute(self.input(), "prepare_oqc_task")
            task = json.loads(result["taskJson"])
            self.assertEqual(result["qasm"], 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;')
            self.assertFalse(result["networkUsed"])
            self.assertFalse(result["submitted"])
            self.assertEqual(task["program"], result["qasm"])
            from qcaas_client.client import CompilerConfig
            config = CompilerConfig.create_from_json(task["config"])
            self.assertEqual(config.repeats, 512)

        def test_actual_discovery_and_status_client(self):
            os.environ["OQC_API_TOKEN"] = FAKE_TOKEN
            calls, transport = self.transport()
            with transport:
                result, _ = bridge.compute(self.input(action="devices"), "query_oqc_service")
                status, _ = bridge.compute(self.input(action="task_status", taskId="fixture-task"), "query_oqc_service")
            self.assertEqual(result["devices"], [{"id": "qpu:test", "name": "Fixture", "active": True}])
            self.assertEqual(status["status"], "COMPLETED")
            self.assertTrue(all(r.method == "GET" for r in calls))

        def test_actual_submission_serialization_once(self):
            os.environ["OQC_API_TOKEN"] = FAKE_TOKEN
            calls, transport = self.transport()
            with transport:
                result, _ = bridge.compute(self.input(), "submit_oqc_task")
            self.assertEqual(result["taskId"], "fixture-task")
            self.assertTrue(result["submissionAcknowledged"])
            writes = [r for r in calls if r.method == "POST"]
            self.assertEqual(len(writes), 1)
            payload = json.loads(writes[0].body)
            self.assertEqual(len(payload["tasks"]), 1)
            self.assertEqual(payload["tasks"][0]["program"], bridge.qasm(BELL))
            self.assertTrue(calls[-1].url.endswith("/tasks/submit"))

        def test_failures_no_retry_no_credentials_no_offdomain(self):
            with self.assertRaisesRegex(ValueError, "OQC_API_TOKEN"):
                bridge.compute(self.input(), "submit_oqc_task")
            os.environ["OQC_API_TOKEN"] = FAKE_TOKEN
            for mode in ("timeout", "offdomain", "redirect", "unauthorized"):
                calls, transport = self.transport(mode)
                with transport, self.assertRaises(ValueError) as caught:
                    bridge.compute(self.input(), "submit_oqc_task")
                self.assertNotIn(FAKE_TOKEN, str(caught.exception))
                self.assertIn("unknown", str(caught.exception))
                self.assertLessEqual(sum(r.method == "POST" for r in calls), 1)
            for endpoint in ("https://example.invalid", "http://cloud.oqc.app", "https://user:secret@cloud.oqc.app"):
                os.environ["OQC_API_ENDPOINT"] = endpoint
                with self.assertRaises(ValueError):
                    bridge.compute(self.input(action="devices"), "query_oqc_service")

elif CAPABILITY == "quantuminspire-cloud":
    class QuantumInspireTests(NoNetwork):
        def input(self, **extra):
            return {"action": "backends", "page": 2, "pageSize": 1, "requestTimeoutSeconds": 2, **extra}

        def transport(self, mode="ok"):
            calls = []
            async def request(session, **kwargs):
                calls.append(kwargs)
                self.assertEqual(kwargs["method"], "GET")
                self.assertTrue(kwargs["url"].startswith("https://api.quantum-inspire.com/"))
                if "/jobs/" in kwargs["url"]:
                    self.assertEqual(kwargs["headers"]["Authorization"], f"Bearer {FAKE_TOKEN}")
                else:
                    # The upstream backend catalogue route is public.
                    self.assertNotIn("Authorization", kwargs["headers"])
                self.assertFalse(kwargs["allow_redirects"])
                self.assertFalse(session.trust_env)
                code = 200
                if mode == "unauthorized":
                    code, body = 401, {"detail": FAKE_TOKEN}
                elif mode == "redirect":
                    code, body = 302, {"detail": FAKE_TOKEN}
                elif "/backend_types" in kwargs["url"]:
                    self.assertIn("page=2", kwargs["url"])
                    self.assertIn("size=1", kwargs["url"])
                    backend = {"id": 1, "name": "Fixture", "infrastructure": "sim", "description": "fixture", "image_id": "fixture", "is_hardware": False, "supports_raw_data": False, "features": [], "default_compiler_config": {}, "gateset": ["x"], "topology": [], "nqubits": 2, "status": "idle", "messages": {}, "default_number_of_shots": 100, "max_number_of_shots": 10000, "enabled": True, "identifier": "fixture", "protocol_version": None, "job_execution_time_limit": 60.0, "max_jobs_per_batch_job": 1, "batchjobs_per_queue_limit": 10}
                    body = {"items": [backend], "total": 3, "page": 2, "size": 1, "pages": 3}
                elif "/jobs/7" in kwargs["url"]:
                    body = {"id": 7, "created_on": "2026-09-28T00:00:00Z", "file_id": 1, "algorithm_type": "quantum", "status": "completed", "batch_job_id": 1, "queued_at": None, "finished_at": None, "number_of_shots": 100, "raw_data_enabled": False, "session_id": "fixture", "trace_id": "fixture", "message": "", "source": None}
                else:
                    raise AssertionError("Unexpected Quantum Inspire route")
                async def read():
                    return json.dumps(body).encode()
                return SimpleNamespace(status=code, reason="fixture", headers={"Content-Type": "application/json"}, read=read, release=lambda: None)
            return calls, patch("aiohttp.ClientSession.request", request)

        def test_actual_resource_manager_backends_and_job(self):
            os.environ["QUANTUMINSPIRE_API_TOKEN"] = FAKE_TOKEN
            calls, transport = self.transport()
            with transport:
                result, _ = bridge.compute(self.input())
                job, _ = bridge.compute(self.input(action="job_status", jobId=7))
            self.assertEqual(len(calls), 2)
            self.assertEqual(result["total"], 3)
            self.assertEqual(result["backends"], [{"id": 1, "name": "Fixture", "numQubits": 2, "isHardware": False, "status": "idle", "enabled": True}])
            self.assertEqual(job["job"], {"id": 7, "status": "completed", "shots": 100})

        def test_missing_invalid_token_redirect_and_no_retries(self):
            with self.assertRaisesRegex(ValueError, "QUANTUMINSPIRE_API_TOKEN"):
                bridge.compute(self.input())
            os.environ["QUANTUMINSPIRE_API_TOKEN"] = FAKE_TOKEN
            for mode in ("unauthorized", "redirect"):
                calls, transport = self.transport(mode)
                with transport, self.assertRaises(ValueError) as caught:
                    bridge.compute(self.input())
                self.assertNotIn(FAKE_TOKEN, str(caught.exception))
                self.assertEqual(len(calls), 1)
else:
    raise AssertionError("Unknown SDK fixture")

if __name__ == "__main__":
    unittest.main(verbosity=2)
