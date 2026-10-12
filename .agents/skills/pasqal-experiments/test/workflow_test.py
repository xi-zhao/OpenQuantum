"""Real Pulser and real Cloud SDK, HTTP transport fixtures only. No live account."""
import copy
from dataclasses import replace
import json
import math
import os
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import workflow as w
from cloud import CloudError, EnvironmentToken, SingleAttemptHTTPClient, client
from pasqal_cloud.pasqal_cloud_client import PasqalCloudClient
from pulser.devices import AnalogDevice

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "00000000-0000-4000-8000-000000000001"
BATCH = "00000000-0000-4000-8000-000000000002"
SEQ = ROOT / "examples/rabi_sequence.py"


class Transport:
    """Serve the official SDK's HTTP requests without replacing its API methods."""
    def __init__(self):
        self.calls = []
        self.batch = None
        self.fail = None
        # A service fixture, not the shipped device's 2000-shot hardware limit.
        self.device = replace(AnalogDevice, max_runs=20000).to_abstract_repr()
        self.reverse = True
        self.serialized_result = None

    def job(self, data, index):
        return {"id": f"job-{index}", "batch_id": BATCH, "project_id": PROJECT,
                "runs": data["runs"], "variables": None, "status": "DONE",
                "created_at": "2026-10-12", "updated_at": "2026-10-12", "sequence": data["sequence"]}

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, copy.deepcopy(kwargs)))
        assert kwargs["verify"] is True and kwargs["allow_redirects"] is False and kwargs["timeout"] == 30
        body = kwargs.get("json")
        status = 200
        if url.endswith("devices/specs"):
            data = {"AnalogDevice": self.device}
        elif method == "POST" and url.endswith("/batches"):
            jobs = [self.job(j, i) for i, j in enumerate(body["jobs"])]
            self.batch = {"id": BATCH, "project_id": PROJECT, "user_id": "fixture",
                          "open": body["open"], "complete": not body["open"],
                          "device_type": body["device_type"] or "FRESNEL_CAN1", "status": "DONE",
                          "created_at": "2026-10-12", "updated_at": "2026-10-12",
                          "tags": body["tags"], "jobs": list(reversed(jobs)) if self.reverse else jobs}
            data = self.batch
            if self.fail == "timeout":
                import requests
                raise requests.Timeout("SECRET-SHOULD-NOT-LEAK")
            if self.fail == "500":
                status = 500
        elif method == "POST" and url.endswith("/jobs"):
            offset = len(self.batch["jobs"])
            self.batch["jobs"] += [self.job(j, offset + i) for i, j in enumerate(body)]
            data = self.batch
            if self.fail == "add-timeout":
                import requests
                raise requests.Timeout("unknown append outcome")
        elif url.endswith("/complete"):
            self.batch.update(open=False, complete=True)
            data = self.batch
        elif url.endswith("/cancel"):
            self.batch["status"] = "CANCELED"
            data = self.batch
        elif url.endswith("/results_link"):
            data = {"results_link": "https://storage.example.invalid/result?signature=SECRET-SHOULD-NOT-LEAK"}
        elif url.startswith("https://storage.example.invalid/"):
            assert kwargs.get("auth") is None
            return Mock(status_code=200, json=lambda: {"counter": {"0": 5000, "1": 5000}, "raw": None,
                                                       "serialised_results": self.serialized_result})
        elif method == "GET" and url.endswith(BATCH):
            data = self.batch
        else:
            raise AssertionError(f"Unexpected transport action: {method} {url}")
        return Mock(status_code=status, json=lambda: {"data": copy.deepcopy(data)})


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.directory = Path(self.tmp.name)
        self.addCleanup(patch.stopall)
        patch.object(socket.socket, "connect", side_effect=AssertionError("Real network forbidden")).start()
        patch.dict(os.environ, {"PASQAL_AUTH_TOKEN": "fixture-token", "OPENQUANTUM_PASQAL_STATE_ROOT": str(self.directory / "cloud-state")}, clear=True).start()
        self.transport = Transport()
        self.sdk = PasqalCloudClient(project_id=PROJECT, token_provider=EnvironmentToken(), client_class=SingleAttemptHTTPClient)
        self.sdk._client.session.request = self.transport.request
        self.spec = w.read(ROOT / "examples/rabi_spec.json")
        self.spec_file = self.directory / "spec.json"
        w.write(self.spec_file, self.spec)
        self.device_file = self.directory / "device.json"
        w.device_snapshot(PROJECT, "fr", "AnalogDevice", self.device_file, sdk=self.sdk)

    def plan(self, target="local", **kwargs):
        file = self.directory / f"plan-{len(list(self.directory.glob('plan-*')))}.json"
        plan = w.prepare(self.spec_file, SEQ, file, target=target,
                         project_id=PROJECT if target != "local" else None,
                         device_file=self.device_file, **kwargs)
        return file, plan

    def submitted(self, target="QPU", **kwargs):
        file, plan = self.plan(target, **kwargs)
        receipt = self.directory / "receipt.json"
        record = w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        return file, plan, receipt, record

    def test_full_native_sdk_and_pulser_versions(self):
        from pasqal_cloud import PasqalCloudConnection, OVHConnection
        from pasqal_cloud import RemoteMPSBackend, RemoteSVBackend, RemoteEmuFreeBackend
        self.assertTrue(all((PasqalCloudConnection, OVHConnection, RemoteMPSBackend, RemoteSVBackend, RemoteEmuFreeBackend)))
        self.assertEqual(w.provenance()["packages"], {"pulser-core": "1.9.1", "pulser-simulation": "1.9.1", "pasqal-cloud": "0.24.0"})
        for method in ("get_batches", "get_jobs", "cancel_job", "cancel_jobs", "rebatch", "create_workload", "get_workload", "cancel_workload"):
            self.assertTrue(callable(getattr(self.sdk, method)))

    def test_offline_ideal_scan_matches_rabi_and_repeats(self):
        file, plan = self.plan()
        self.assertEqual(plan["total_shots"], 30000)
        raw = self.directory / "raw.json"
        data = w.local_run(file, raw)
        repeated = w.local_run(file, self.directory / "repeat.json")
        self.assertEqual(data["rows"], repeated["rows"])
        for row in data["rows"]:
            expected = math.sin(math.pi * row["scan_value"] / 2000) ** 2
            self.assertAlmostEqual(row["counts"].get("1", 0) / 10000, expected, delta=0.025)
        report_file = self.directory / "analysis.json"
        report = w.analyze(raw, SEQ, report_file, bootstrap=40)
        self.assertTrue(report["complete"])
        self.assertEqual(report["scientificValidation"], "not_evaluated")
        w.plot(report_file, self.directory / "rabi.png")
        self.assertGreater((self.directory / "rabi.png").stat().st_size, 1000)
        self.assertEqual(len(self.transport.calls), 1, "only setup's fixture device read; compute must not call cloud")

    def test_noise_is_explicit_runs_and_cloud_configuration_roundtrips(self):
        noise = {"source": "engineering dephasing fixture, not a calibration", "params": {"dephasing_rate": 1.0}}
        file, plan = self.plan(noise=noise)
        data = w.local_run(file, self.directory / "noisy.json")
        self.assertEqual(plan["noise"], noise)
        self.assertEqual(len(data["rows"]), 3)
        # Independent resonant Bloch-equation solution, coherence decay gamma=1/us.
        omega_d = math.sqrt(math.pi ** 2 - 0.25)
        for row in data["rows"]:
            t = row["scan_value"] / 1000
            expected = (1 - math.exp(-t / 2) * (math.cos(omega_d * t) + math.sin(omega_d * t) / (2 * omega_d))) / 2
            self.assertAlmostEqual(row["counts"].get("1", 0) / 10000, expected, delta=0.025)
        _, cloud_plan = self.plan("EMU_MPS", noise=noise)
        self.assertIn("noise", cloud_plan["backend_configuration"])
        self.assertIn("bitstrings", cloud_plan["backend_configuration"])
        self.assertIn("10000", cloud_plan["backend_configuration"])
        with self.assertRaisesRegex(ValueError, "Local runs"):
            self.plan(backend_configuration=cloud_plan["backend_configuration"])
        with self.assertRaises((ValueError, TypeError)):
            self.plan(noise={"source": "fixture", "params": {"imagined_noise": 1}})

    def test_bad_specs_size_order_and_changed_plan_fail_before_submit(self):
        for change in ({"shots_per_point": True}, {"shots_per_point": -1}, {"scan": {"variable": "x", "values": [1, 1]}}):
            with self.assertRaises(ValueError):
                w.validate_spec({**self.spec, **change})
        self.spec["register"]["atom_ids"] = ["wrong"]
        w.write(self.spec_file, self.spec)
        with self.assertRaisesRegex(ValueError, "order"):
            self.plan()
        self.spec["register"]["atom_ids"] = ["q0"]
        w.write(self.spec_file, self.spec)
        file, plan = self.plan("QPU")
        plan["total_shots"] += 1
        w.write(file, plan)
        with self.assertRaisesRegex(ValueError, "changed"):
            w.submit(file, self.directory / "receipt.json", plan["planSha256"], sdk=self.sdk)
        self.assertFalse(any(method == "POST" for method, _, _ in self.transport.calls))

    def test_real_sdk_submit_maps_reordered_jobs_and_does_not_repeat(self):
        file, plan, receipt, record = self.submitted()
        self.assertEqual([j["job_id"] for j in record["jobs"]], ["job-0", "job-1", "job-2"])
        self.assertEqual(record["batch_id"], BATCH)
        body = next(kwargs["json"] for method, _, kwargs in self.transport.calls if method == "POST")
        self.assertEqual(body["project_id"], PROJECT)
        self.assertTrue(all("sequence" in j and "serialized_sequence" not in j for j in body["jobs"]))
        self.assertIn("oq-request:" + plan["request_id"], body["tags"])
        with self.assertRaisesRegex(ValueError, "already exists"):
            w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        with self.assertRaises(FileExistsError):
            w.submit(file, self.directory / "other-receipt.json", plan["planSha256"], sdk=self.sdk)
        self.assertEqual(sum(m == "POST" for m, _, _ in self.transport.calls), 1)

    def test_lost_response_and_500_have_one_attempt_and_recover(self):
        for failure in ("timeout", "500"):
            with self.subTest(failure=failure):
                file, plan = self.plan("EMU_MPS")
                receipt = self.directory / f"{failure}.json"
                self.transport.fail = failure
                before = len(self.transport.calls)
                with self.assertRaises(CloudError):
                    w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
                self.assertEqual(sum(m == "POST" for m, _, _ in self.transport.calls[before:]), 1)
                self.assertEqual(w.read(receipt)["state"], "outcome_unknown")
                self.assertNotIn("SECRET", receipt.read_text())
                recovered = w.recover(receipt, BATCH, sdk=self.sdk)
                self.assertEqual(recovered["state"], "submitted")
                self.assertEqual(len(recovered["jobs"]), 3)

    def test_device_drift_wrong_project_and_missing_approval_block_writes(self):
        file, plan = self.plan("QPU")
        receipt = self.directory / "blocked.json"
        with self.assertRaises(ValueError):
            w.submit(file, receipt, "wrong-hash", sdk=self.sdk)
        self.sdk.project_id = "another-project"
        with self.assertRaisesRegex(ValueError, "project"):
            w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        self.sdk.project_id = PROJECT
        self.transport.device = "{}"
        with self.assertRaisesRegex(ValueError, "specification changed"):
            w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        self.assertFalse(any(m == "POST" for m, _, _ in self.transport.calls))

    def test_open_batch_add_close_and_cancel(self):
        _, _, receipt, _ = self.submitted(open_batch=True)
        self.spec["scan"]["values"] = [600]
        w.write(self.spec_file, self.spec)
        file, plan = self.plan("QPU")
        added = w.submit(file, self.directory / "addition.json", plan["planSha256"], parent_receipt=receipt, sdk=self.sdk)
        self.assertEqual(added["jobs"][0]["job_id"], "job-3")
        self.assertEqual(len(added["previous_job_ids"]), 3)
        self.assertEqual(len(w.recover(receipt, sdk=self.sdk)["jobs"]), 3)
        self.assertEqual(len(w.recover(self.directory / "addition.json", sdk=self.sdk)["jobs"]), 1)
        with self.assertRaises(ValueError):
            w.control(receipt, "close", sdk=self.sdk)
        self.assertFalse(w.control(receipt, "close", True, sdk=self.sdk)["open"])
        self.assertEqual(w.control(receipt, "cancel", True, sdk=self.sdk)["status"], "CANCELED")

    def test_raw_harvest_precedes_analysis_and_preserves_failed_points(self):
        _, _, receipt, _ = self.submitted()
        self.transport.batch["jobs"][0]["status"] = "ERROR"
        raw = self.directory / "raw.json"
        data = w.harvest(receipt, raw, sdk=self.sdk)
        self.assertEqual(len(data["rows"]), 3)
        self.assertEqual(data["rows"][2]["status"], "ERROR")
        before = raw.read_bytes()
        report = w.analyze(raw, SEQ, self.directory / "analysis.json", bootstrap=20)
        self.assertFalse(report["complete"])
        self.assertEqual(raw.read_bytes(), before)
        self.assertNotIn("SECRET", before.decode())
        self.assertEqual(report["rows"][2]["status"], "ERROR")

    def test_analysis_rejects_changed_code_and_atom_mapping(self):
        file, plan = self.plan()
        raw = self.directory / "raw.json"
        data = {"plan": plan, "rows": [{"scan_value": v, "atom_ids": ["q0"], "status": "DONE", "counts": {"0": 5000, "1": 5000}} for v in self.spec["scan"]["values"]]}
        w.write(raw, data)
        other = self.directory / "changed.py"
        other.write_text(SEQ.read_text() + "\n# edited\n")
        with self.assertRaisesRegex(ValueError, "code changed"):
            w.analyze(raw, other, self.directory / "no.json")
        data["rows"][0]["atom_ids"] = ["other"]
        w.write(raw, data)
        with self.assertRaisesRegex(ValueError, "atom order"):
            w.analyze(raw, SEQ, self.directory / "no.json")

    def test_comparison_counts_both_uncertainties_and_never_drops_missing(self):
        _, plan = self.plan()
        raw = self.directory / "raw.json"
        data = {"plan": plan, "rows": [{"scan_value": v, "atom_ids": ["q0"], "status": "DONE", "counts": {"0": 5000, "1": 5000}} for v in self.spec["scan"]["values"]]}
        w.write(raw, data)
        baseline = self.directory / "baseline.json"
        a = w.analyze(raw, SEQ, baseline, bootstrap=30)
        comparison = w.analyze(raw, SEQ, self.directory / "same.json", bootstrap=30, baseline_file=baseline)
        self.assertEqual(comparison["comparison"]["status"], "consistent")
        self.assertAlmostEqual(comparison["comparison"]["points"][0]["combined_std"], math.sqrt(2) * a["rows"][0]["observation"]["bootstrap_std"])
        data["rows"].pop()
        w.write(raw, data)
        missing = w.analyze(raw, SEQ, self.directory / "missing.json", bootstrap=30, baseline_file=baseline)
        self.assertEqual(missing["comparison"]["status"], "incomplete")
        self.assertEqual(missing["rows"][2]["status"], "MISSING")

    def test_bad_counts_are_explicit_and_readout_keeps_unclipped_values(self):
        _, plan = self.plan()
        raw = self.directory / "raw.json"
        data = {"plan": plan, "rows": [{"scan_value": v, "atom_ids": ["q0"], "status": "DONE", "counts": {"0": 10000}} for v in self.spec["scan"]["values"]]}
        w.write(raw, data)
        report = w.analyze(raw, SEQ, self.directory / "corrected.json", bootstrap=5,
                           readout={"source": "fixture", "p_false_pos": 0.1, "p_false_neg": 0.1})
        self.assertAlmostEqual(report["rows"][0]["observation"]["corrected_densities"][0], -0.125)
        self.assertEqual(report["rows"][0]["observation"]["observable"], 0)
        data["rows"][0]["counts"] = {"2": 10000}
        w.write(raw, data)
        invalid = w.analyze(raw, SEQ, self.directory / "invalid.json", bootstrap=5)
        self.assertFalse(invalid["complete"])
        self.assertEqual(invalid["rows"][0]["status"], "INVALID_OBSERVATION")

    def test_credentials_do_not_prompt_read_files_or_accept_insecure_transport(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(CloudError):
                client(PROJECT)
        with patch.dict(os.environ, {"PASQAL_SKIP_SSL_VERIFY": "1"}):
            with self.assertRaises(CloudError):
                client(PROJECT)
        with self.assertRaises(CloudError):
            self.sdk._client._json_request("GET", "http://example.invalid")
        with self.assertRaises(ValueError):
            client(None)

    def test_identical_sequences_are_rejected_before_any_paid_request(self):
        ignored = self.directory / "ignored_scan.py"
        ignored.write_text(SEQ.read_text().replace("ConstantPulse(duration_ns,", "ConstantPulse(200,"))
        with self.assertRaisesRegex(ValueError, "identical jobs"):
            w.prepare(self.spec_file, ignored, self.directory / "bad-plan.json", target="QPU",
                      project_id=PROJECT, device_file=self.device_file)
        self.assertFalse(any(m == "POST" for m, _, _ in self.transport.calls))

    def test_qpu_shot_limit_fails_before_submission(self):
        self.spec["shots_per_point"] = 20001
        w.write(self.spec_file, self.spec)
        with self.assertRaisesRegex(ValueError, "max_runs"):
            self.plan("QPU")
        self.assertFalse(any(m == "POST" for m, _, _ in self.transport.calls))

    def test_missing_receipt_reconstruction_and_copied_plan_cannot_resubmit(self):
        file, plan = self.plan("QPU")
        receipt = self.directory / "lost.json"
        self.transport.fail = "timeout"
        with self.assertRaises(CloudError):
            w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        receipt.unlink()  # simulate losing just the user-facing receipt
        copied = self.directory / "copied-plan.json"
        copied.write_bytes(file.read_bytes())
        with self.assertRaises(FileExistsError):
            w.submit(copied, self.directory / "different.json", plan["planSha256"], sdk=self.sdk)
        restored = w.recover(receipt, BATCH, plan_file=file, sdk=self.sdk)
        self.assertEqual(len(restored["jobs"]), 3)
        self.assertEqual(sum(m == "POST" for m, _, _ in self.transport.calls), 1)

    def test_failure_between_claim_and_receipt_preserves_recovery_material(self):
        file, plan = self.plan("QPU")
        receipt = self.directory / "unwritten.json"
        real_write = w.write
        def interrupted(path, data, **kwargs):
            if Path(path) == receipt:
                raise OSError("simulated disk failure")
            return real_write(path, data, **kwargs)
        with patch.object(w, "write", side_effect=interrupted):
            with self.assertRaises(OSError):
                w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        claim = w.read(w.state_path(plan, "requests", plan["request_id"]))
        self.assertEqual(claim["recovery_record"]["plan"], plan)
        self.assertFalse(any(m == "POST" for m, _, _ in self.transport.calls))
        with self.assertRaises(FileExistsError):
            w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        restored = w.recover(receipt, plan_file=file)
        self.assertEqual(restored["state"], "not_submitted")
        self.assertEqual(restored["jobs"], [])

    def test_lost_older_receipts_retain_mapping_and_control_after_appends(self):
        first_file, _, first, original = self.submitted(open_batch=True)
        self.spec["scan"]["values"] = [600]
        w.write(self.spec_file, self.spec)
        second_file, second_plan = self.plan("QPU")
        second = self.directory / "second.json"
        added = w.submit(second_file, second, second_plan["planSha256"], parent_receipt=first, sdk=self.sdk)
        self.spec["scan"]["values"] = [800]
        w.write(self.spec_file, self.spec)
        third_file, third_plan = self.plan("QPU")
        w.submit(third_file, self.directory / "third.json", third_plan["planSha256"], parent_receipt=first, sdk=self.sdk)
        w.control(first, "cancel", True, sdk=self.sdk)
        first.unlink()
        second.unlink()
        restored = w.recover(first, plan_file=first_file, sdk=self.sdk)
        self.assertEqual(restored["jobs"], original["jobs"])
        self.assertEqual(restored["control"], {"action": "cancel", "state": "response_received"})
        self.assertEqual(restored["status"], "CANCELED")
        self.assertEqual(w.recover(second, plan_file=second_file, sdk=self.sdk)["jobs"], added["jobs"])

    def test_create_mapping_holds_batch_and_request_locks(self):
        file, plan = self.plan("QPU")
        receipt = self.directory / "receipt.json"
        real_match = w.match_jobs
        def interleaved(batch, current, previous):
            with self.assertRaises(FileExistsError):
                w.control(receipt, "cancel", True, sdk=self.sdk)
            with self.assertRaises(FileExistsError):
                w.recover(receipt, sdk=self.sdk)
            return real_match(batch, current, previous)
        with patch.object(w, "match_jobs", side_effect=interleaved):
            record = w.submit(file, receipt, plan["planSha256"], sdk=self.sdk)
        self.assertEqual(record["state"], "submitted")
        self.assertFalse(any(url.endswith("/cancel") for _, url, _ in self.transport.calls))

    def test_append_reservation_failure_is_unsent_and_never_matches_later_jobs(self):
        _, _, parent, _ = self.submitted(open_batch=True)
        self.spec["scan"]["values"] = [600]
        w.write(self.spec_file, self.spec)
        for fail_at in ("claim", "receipt"):
            with self.subTest(fail_at=fail_at):
                file, plan = self.plan("QPU")
                receipt = self.directory / f"unsent-{fail_at}.json"
                claim = w.state_path(plan, "requests", plan["request_id"])
                pending = w.state_path(plan, "pending-batches", BATCH)
                real_write = w.write
                def interrupted(path, data, **kwargs):
                    if Path(path) == (claim if fail_at == "claim" else receipt):
                        raise OSError("simulated disk failure")
                    return real_write(path, data, **kwargs)
                before = sum(m == "POST" for m, _, _ in self.transport.calls)
                with patch.object(w, "write", side_effect=interrupted):
                    with self.assertRaises(OSError):
                        w.submit(file, receipt, plan["planSha256"], parent_receipt=parent, sdk=self.sdk)
                self.assertEqual(w.read(pending)["recovery_record"]["send_attempted"], False)
                next_file, next_plan = self.plan("QPU")
                next_receipt = self.directory / f"next-{fail_at}.json"
                with self.assertRaisesRegex(ValueError, "unresolved"):
                    w.submit(next_file, next_receipt, next_plan["planSha256"], parent_receipt=parent, sdk=self.sdk)
                self.assertEqual(sum(m == "POST" for m, _, _ in self.transport.calls), before)
                restored = w.recover(receipt, BATCH, plan_file=file, sdk=self.sdk)
                self.assertEqual(restored["state"], "not_submitted")
                self.assertEqual(restored["jobs"], [])
                self.assertFalse(pending.exists())
                w.submit(next_file, next_receipt, next_plan["planSha256"], parent_receipt=parent, sdk=self.sdk)
                # An identical program now exists, but it belongs to next_plan.
                again = w.recover(receipt, sdk=self.sdk)
                self.assertEqual(again["state"], "not_submitted")
                self.assertEqual(again["jobs"], [])

    def test_unknown_append_blocks_next_append_until_recovered(self):
        _, _, parent, _ = self.submitted(open_batch=True)
        self.spec["scan"]["values"] = [600]
        w.write(self.spec_file, self.spec)
        file, plan = self.plan("QPU")
        added = self.directory / "addition.json"
        self.transport.fail = "add-timeout"
        with self.assertRaises(CloudError):
            w.submit(file, added, plan["planSha256"], parent_receipt=parent, sdk=self.sdk)
        next_file, next_plan = self.plan("QPU")
        with self.assertRaisesRegex(ValueError, "unresolved"):
            w.submit(next_file, self.directory / "next.json", next_plan["planSha256"], parent_receipt=parent, sdk=self.sdk)
        self.assertEqual(w.recover(added, sdk=self.sdk)["jobs"][0]["job_id"], "job-3")
        with w.mutation_lock(plan, BATCH):
            with self.assertRaises(FileExistsError):
                w.control(parent, "cancel", True, sdk=self.sdk)
            with self.assertRaises(FileExistsError):
                w.recover(added, sdk=self.sdk)

    def test_serialized_pulser_results_preserve_raw_and_check_atom_order(self):
        from pulser.backend import Results
        _, _, receipt, _ = self.submitted()
        for label, result, expected in (
            ("bits", Results.from_final_bitstrings(["q0"], 200, {"0": 10000}), "DONE"),
            ("wrong-order", Results.from_final_bitstrings(["other"], 200, {"0": 10000}), "ATOM_ORDER_MISMATCH"),
            ("no-bits", Results(atom_order=("q0",), total_duration=200), "NO_FINAL_BITSTRINGS"),
        ):
            self.transport.serialized_result = result.to_abstract_repr()
            data = w.harvest(receipt, self.directory / f"{label}.json", sdk=self.sdk)
            self.assertEqual(data["rows"][0]["status"], expected)
            self.assertEqual(data["rows"][0]["raw_result"]["serialised_results"], self.transport.serialized_result)
            if label == "bits":
                self.assertEqual(data["rows"][0]["counts"], {"0": 10000})
            else:
                self.assertIsNone(data["rows"][0]["counts"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
