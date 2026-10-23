"""Official AQT offline backend and explicit Arnica read-only discovery."""
import contextlib
import json
import os
import sys

ENDPOINT = "https://arnica.aqt.eu"


@contextlib.contextmanager
def explicit_endpoint():
    # SDK client construction must not depend on ambient SOCKS/proxy extras.
    names = ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy", "AQT_PORTAL_URL")
    previous = {key: os.environ.pop(key, None) for key in names}
    os.environ["AQT_PORTAL_URL"] = ENDPOINT
    try:
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def compute(v, tool_name):
    if tool_name == "list_aqt_devices":
        token = os.environ.get("AQT_API_TOKEN")
        if not token:
            raise ValueError("AQT_API_TOKEN is not configured; no network request was made")
        from qiskit_aqt_provider.api_client import PortalClient
        try:
            # The SDK otherwise reads an ambient endpoint and follows redirects.
            with explicit_endpoint():
                client = PortalClient(token=token, timeout=v["requestTimeoutSeconds"])
            client._http_client.follow_redirects = False
            def check_response(response):
                if 300 <= response.status_code < 400:
                    raise ValueError("AQT redirects are disabled")
            client._http_client.event_hooks["response"] = [check_response]
            workspaces = client.workspaces()
            devices = [{"workspaceId": w.workspace_id, "id": r.resource_id,
                        "name": r.resource_name, "type": r.resource_type, "numQubits": r.available_qubits}
                       for w in workspaces for r in w.resources]
        except Exception as error:
            raise ValueError(f"AQT device query failed ({type(error).__name__}); check token and service access") from None
        return {"devices": devices, "endpoint": ENDPOINT, "networkUsed": True}, [
            "Device information is service-reported; discovery is not proof of a completed QPU calculation.",
            "Uses only the configured token; no interactive login, credential file access, token storage, redirects or submission.",
        ]
    if tool_name != "simulate_aqt_circuit":
        raise ValueError("Unknown AQT action")
    from qiskit import QuantumCircuit, transpile
    from qiskit_aqt_provider import AQTProvider
    provider = AQTProvider(access_token="", load_dotenv=False)
    with explicit_endpoint():
        backend = provider.get_backend("offline_simulator_noise" if v["noise"] else "offline_simulator_no_noise", backend_type="offline_simulator")
    backend.simulator.set_options(seed_simulator=v["seed"])
    circuit = QuantumCircuit(v["numQubits"])
    for gate in v["gates"]:
        args = ([gate["angle"]] if "angle" in gate else []) + gate["targets"]
        getattr(circuit, gate["gate"].lower())(*args)
    circuit.measure_all()
    native = transpile(circuit, backend, optimization_level=1, seed_transpiler=v["seed"])
    result = backend.run(native, shots=v["shots"], with_progress_bar=False).result()
    if not result.success:
        raise ValueError("AQT offline simulation failed")
    return {"numQubits": v["numQubits"], "shots": v["shots"], "seed": v["seed"], "noise": v["noise"],
            "counts": [{"bitstring": k, "count": int(n)} for k, n in sorted(result.get_counts().items())],
            "nativeGates": [{"name": k, "count": int(n)} for k, n in sorted(native.count_ops().items())],
            "bitOrder": "q[n-1]...q[0]", "networkUsed": False}, [
        "Uses the actual AQT SDK offline backend and its API gate serialization, with terminal computational-basis sampling.",
        "The SDK's optional depolarizing model is illustrative, not a current device calibration. Sample frequencies have finite-shot uncertainty.",
        "Upstream offline target supports 20 qubits and at most 2000 shots per job; unsupported requests fail rather than truncate.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"], request["toolName"])
    request.pop("toolName", None)
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
