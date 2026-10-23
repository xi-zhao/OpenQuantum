"""OQC QCaaS adapter; no automatic authentication or submission retry."""
import contextlib
import json
import logging
import os
import sys
from urllib.parse import urlparse

DEFAULT_ENDPOINT = "https://cloud.oqc.app"


def checked_url(url):
    p = urlparse(url)
    if p.scheme != "https" or not p.hostname or p.username or p.password or p.port not in (None, 443) or p.fragment:
        raise ValueError("OQC endpoint must be an official HTTPS URL")
    if not (p.hostname == "oqc.app" or p.hostname.endswith(".oqc.app")):
        raise ValueError("OQC endpoint must use the official oqc.app domain")
    return url.rstrip("/")


def qasm(v):
    lines = ['OPENQASM 2.0;', 'include "qelib1.inc";', f'qreg q[{v["numQubits"]}];', f'creg c[{v["numQubits"]}];']
    for gate in v["gates"]:
        angle = f'({gate["angle"]!r})' if "angle" in gate else ""
        lines.append(gate["gate"].lower() + angle + " " + ",".join(f"q[{q}]" for q in gate["targets"]) + ";")
    return "\n".join(lines + ["measure q -> c;"])


def make_task(v):
    from qcaas_client.client import CompilerConfig, QPUTask, QuantumResultsFormat
    return QPUTask(program=qasm(v), qpu_id=v["qpuId"], config=CompilerConfig(repeats=v["shots"], results_format=QuantumResultsFormat().binary_count()))


def remote_client(token, endpoint, timeout):
    import qcaas_client.client as sdk
    from requests.adapters import HTTPAdapter
    # Optional diagnostic status-page fetch is unrelated to the requested service.
    sdk.check_status_page = lambda: None

    class BoundedClient(sdk.OQCClient):
        def get_qpus(self):
            self._qpus = super().get_qpus()
            return self._qpus
        def _bound_transport(self):
            if getattr(self, "_transport_bound", False):
                return
            self._transport_bound = True
            self.session.trust_env = False
            self.session.mount("https://", HTTPAdapter(max_retries=0))
            send = self.session.send
            def bounded_send(request, **kwargs):
                checked_url(request.url)
                kwargs["allow_redirects"] = False
                response = send(request, **kwargs)
                if 300 <= response.status_code < 400:
                    raise ValueError("OQC redirects are disabled")
                return response
            self.session.send = bounded_send
        def _get(self, *args, **kwargs):
            self._bound_transport()
            return super()._get(*args, **kwargs)
        def _post(self, *args, **kwargs):
            self._bound_transport()
            return super()._post(*args, **kwargs)
        def _handle_response_messages(self, response):
            pass  # Do not emit untrusted service notices into the agent log.
    client = BoundedClient(url=endpoint, authentication_token=token, timeout=(timeout, timeout))
    if not client.is_client_initialized:
        client.session.close()
        raise ValueError("OQC SDK initialization failed")
    return client


def compute(v, tool_name):
    if tool_name == "prepare_oqc_task":
        task = make_task(v)
        return {"qasm": task.program, "taskJson": json.dumps(task.to_json(omit_empty_task_id=True)), "qpuId": v["qpuId"], "shots": v["shots"], "networkUsed": False, "submitted": False}, [
            "Program is serialized with the actual QCaaS SDK; target availability and compiler acceptance are not established by local serialization.",
            "The circuit has only supported unitary gates and terminal measurements. No cloud task is created.",
        ]
    token = os.environ.get("OQC_API_TOKEN")
    if not token:
        raise ValueError("OQC_API_TOKEN is not configured; no network request was made")
    endpoint = checked_url(os.environ.get("OQC_API_ENDPOINT") or DEFAULT_ENDPOINT)
    client = None
    previous_logging = logging.root.manager.disable
    logging.disable(logging.CRITICAL)
    try:
        client = remote_client(token, endpoint, v["requestTimeoutSeconds"])
        if tool_name == "query_oqc_service":
            if v["action"] == "devices":
                devices = [{"id": str(q["id"]), "name": str(q.get("name") or q["id"]), "active": bool(q["active"])} for q in client._qpus]
                status = task_id = None
            else:
                devices = []
                task_id = v["taskId"]
                status = str(client.get_task_status(task_id, qpu_id=v["qpuId"]))
            result = {"action": v["action"], "devices": devices, "taskId": task_id, "status": status, "endpoint": endpoint, "networkUsed": True}
        elif tool_name == "submit_oqc_task":
            tasks = client.schedule_tasks(make_task(v), qpu_id=v["qpuId"])
            if len(tasks) != 1 or tasks[0].task_id is None:
                raise ValueError("No submission acknowledgement")
            result = {"taskId": str(tasks[0].task_id), "qpuId": v["qpuId"], "shots": v["shots"], "endpoint": endpoint, "networkUsed": True, "submissionAcknowledged": True}
        else:
            raise ValueError("Unknown OQC action")
    except Exception as error:
        uncertain = " Submission outcome may be unknown; inspect the account before any retry." if tool_name == "submit_oqc_task" else " No task was submitted."
        raise ValueError(f"OQC request failed ({type(error).__name__}); check account and target access.{uncertain}") from None
    finally:
        if client is not None:
            client.session.close()
        logging.disable(previous_logging)
    return result, [
        "Uses the official QCaaS SDK with explicit token; no password login, credential persistence, redirects or automatic HTTP retry.",
        "Service-reported metadata or submission acknowledgement does not prove a completed QPU calculation or scientific correctness.",
        "Task submission transmits the circuit and may incur charges. This adapter never polls or retries a write with an uncertain outcome.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"], request["toolName"])
    request.pop("toolName", None)
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
