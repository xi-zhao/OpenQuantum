"""Real QCPortal against a loopback protocol fixture, never a public account."""
import importlib.util
import json
import os
from pathlib import Path
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("query_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def record(record_id):
    return {
        "id": record_id, "record_type": "singlepoint", "is_service": False,
        "status": "complete", "manager_name": None, "creator_user": None,
        "created_on": "2026-01-01T00:00:00Z", "modified_on": "2026-01-01T00:00:00Z",
        "properties": {"return_energy": -1.1} if record_id == 1 else {},
        "specification": {"program": "psi4", "driver": "energy", "method": "hf", "basis": "sto-3g"},
        "molecule_id": 7,
        "molecule": {"schema_name": "qcschema_molecule", "schema_version": 2, "symbols": ["H", "H"], "geometry": [0, 0, -0.7, 0, 0, 0.7], "molecular_charge": 0, "molecular_multiplicity": 1, "fix_com": True, "fix_orientation": True},
        "compute_history": [{"id": record_id, "record_id": record_id, "status": "complete", "manager_name": None, "modified_on": "2026-01-01T00:00:00Z", "provenance": {"creator": "psi4", "version": "fixture", "routine": "energy"}}],
    }


class Queries(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.mode = "success"
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def handle_request(self):
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or "{}")
                owner.requests.append((self.command, self.path, body, self.headers.get("Authorization")))
                if owner.mode == "redirect":
                    self.send_response(302)
                    self.send_header("Location", "https://never-follow.invalid/")
                    self.end_headers()
                    return
                if owner.mode == "unauthorized":
                    self.send_response(401)
                    self.end_headers()
                    return
                if self.path == "/api/v1/information":
                    value = {"name": "local fixture", "version": "0.70", "api_limits": {"get_records": 16, "get_molecules": 16}}
                elif self.path == "/auth/v1/login":
                    import jwt
                    token = jwt.encode({"exp": int(time.time()) + 600, "sub": "1"}, "test-fixture-secret-at-least-32-characters", algorithm="HS256")
                    value = {"access_token": token, "refresh_token": token}
                elif self.path == "/api/v1/records/singlepoint/query":
                    value = [1, 2][:body.get("limit", 2)]
                elif self.path == "/api/v1/records/singlepoint/bulkGet":
                    value = [record(i) for i in body["ids"]]
                    if owner.mode == "lazy":
                        for item in value:
                            item.pop("molecule")
                            item.pop("compute_history")
                elif self.path == "/api/v1/molecules/bulkGet":
                    value = [record(1)["molecule"] for _ in body["ids"]]
                elif self.path.startswith("/api/v1/records/singlepoint/") and self.path.endswith("/compute_history"):
                    value = record(int(self.path.split("/")[-2]))["compute_history"]
                else:
                    self.send_response(500)
                    self.end_headers()
                    return
                payload = json.dumps(value).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            do_GET = handle_request
            do_POST = handle_request

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.environment = patch.dict(os.environ, {"QCPORTAL_ADDRESS": f"http://127.0.0.1:{self.server.server_port}", "QCPORTAL_USERNAME": "", "QCPORTAL_PASSWORD": "", "NO_PROXY": "127.0.0.1"})
        self.environment.start()

    def tearDown(self):
        self.environment.stop()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def test_real_query_and_unit_preservation(self):
        result = bridge.compute({"method": "hf", "basis": "sto-3g", "limit": 2, "requestTimeoutSeconds": 3})
        self.assertEqual(result["returned"], 2)
        self.assertEqual(result["records"][0]["energyHartree"], -1.1)
        self.assertEqual(result["records"][0]["molecule"]["geometryBohr"], [[0, 0, -0.7], [0, 0, 0.7]])
        self.assertIsNone(result["records"][1]["energyHartree"])
        self.assertEqual(result["records"][0]["provenance"][0]["creator"], "psi4")
        query = next(r for r in self.requests if r[1].endswith("/query"))
        self.assertEqual(query[2]["method"], ["hf"])
        self.assertTrue(all(r[3] is None for r in self.requests))

    def test_id_order_and_explicit_authentication(self):
        with patch.dict(os.environ, {"QCPORTAL_USERNAME": "fixture-user", "QCPORTAL_PASSWORD": "fixture-password"}):
            result = bridge.compute({"recordIds": [2, 1], "limit": 2, "requestTimeoutSeconds": 3})
        self.assertEqual([r["recordId"] for r in result["records"]], [2, 1])
        self.assertEqual(self.requests[0][:2], ("POST", "/auth/v1/login"))
        self.assertEqual(self.requests[0][2], {"username": "fixture-user", "password": "fixture-password"})
        self.assertTrue(all(r[3].startswith("Bearer ") for r in self.requests[1:]))
        self.assertNotIn("fixture-password", json.dumps(result))

    def test_missing_configuration_rejected_before_transport(self):
        for env in [{"QCPORTAL_ADDRESS": ""}, {"QCPORTAL_USERNAME": "only-one-half"}, {"QCPORTAL_ADDRESS": "https://user:secret@example.invalid"}]:
            with patch.dict(os.environ, env), self.assertRaises(ValueError):
                bridge.client(3)
        self.assertEqual(self.requests, [])

    def test_real_sdk_lazy_molecule_and_history_routes(self):
        self.mode = "lazy"
        result = bridge.compute({"recordIds": [1], "limit": 1, "requestTimeoutSeconds": 3})
        self.assertEqual(result["records"][0]["molecule"]["symbols"], ["H", "H"])
        self.assertEqual(result["records"][0]["provenance"][0]["creator"], "psi4")
        self.assertIn("/api/v1/records/singlepoint/1/compute_history", [r[1] for r in self.requests])

    def test_auth_failure_and_redirect_are_not_retried(self):
        for mode in ["redirect", "unauthorized"]:
            self.requests.clear()
            self.mode = mode
            with self.assertRaises(ValueError):
                bridge.client(3)
            self.assertEqual(len(self.requests), 1)


if __name__ == "__main__":
    unittest.main()
