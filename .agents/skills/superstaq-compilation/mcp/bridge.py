"""Infleqtion SDK adapter. Local serialization or explicit remote compilation only."""
import contextlib
import json
import os
import sys

ENDPOINT = "https://superstaq.infleqtion.com/v0.2.0"


def circuit_from_input(v):
    from qiskit import QuantumCircuit
    circuit = QuantumCircuit(v["numQubits"], name="openquantum_superstaq")
    for gate in v["gates"]:
        args = ([gate["angle"]] if gate["gate"].startswith("R") else []) + gate["targets"]
        getattr(circuit, gate["gate"].lower())(*args)
    return circuit


def describe(circuit):
    import qiskit_superstaq as qss
    from qiskit import qasm2
    try:
        qasm = qasm2.dumps(circuit)
    except qasm2.QASM2ExportError:
        qasm = None
    return {
        "numQubits": circuit.num_qubits, "depth": circuit.depth(),
        "gates": [{"name": name, "count": count} for name, count in sorted(circuit.count_ops().items())],
        "serializedCircuit": qss.serialize_circuits(circuit), "qasm": qasm,
    }


def provider(timeout):
    import requests
    import qiskit_superstaq as qss
    key = os.environ.get("SUPERSTAQ_API_KEY")
    if not key:
        raise ValueError("SUPERSTAQ_API_KEY is not configured; no network request was made")

    class OfficialSession(requests.Session):
        def resolve_redirects(self, *args, **kwargs):
            # Even allow_redirects=False normally prepares response.next and
            # can read the redirect host's netrc. Do not prepare another request.
            return iter(())

        def request(self, method, url, **kwargs):
            if not url.startswith(ENDPOINT + "/"):
                raise ValueError("Superstaq adapter only permits the fixed official API endpoint")
            kwargs["timeout"] = timeout
            kwargs["allow_redirects"] = False
            response = super().request(method, url, **kwargs)
            # The upstream client can interactively accept terms after a 401.
            # An Agent Tool must leave account/terms changes to the account UI.
            if response.status_code == 401:
                raise ValueError("Superstaq authentication or account setup is required; complete it through the official account UI")
            if 300 <= response.status_code < 400:
                raise ValueError("Superstaq HTTP redirects are disabled")
            return response

    service = qss.SuperstaqProvider(api_key=key, remote_host="https://superstaq.infleqtion.com", api_version="v0.2.0", max_retry_seconds=0, verbose=False, use_stored_ibmq_credentials=False)
    # Bound the upstream HTTP calls without modifying the installed SDK.
    previous = service._client.session
    session = OfficialSession()
    session.headers.update(previous.headers)
    # Explicit auth prevents requests from replacing the configured API key
    # with an unrelated ~/.netrc account; proxy and CA handling stay intact.
    class ConfiguredApiKeyOnly(requests.auth.AuthBase):
        def __call__(self, prepared_request):
            prepared_request.headers["Authorization"] = key
            return prepared_request
    session.auth = ConfiguredApiKeyOnly()
    previous.close()
    service._client.session = session
    return service


def compute(v, tool_name):
    import qiskit_superstaq as qss
    if tool_name == "prepare_superstaq_circuit":
        circuit = circuit_from_input(v)
        recovered = qss.deserialize_circuits(qss.serialize_circuits(circuit))[0]
        if recovered != circuit:
            raise ValueError("Superstaq serialization did not preserve the input circuit")
        return {**describe(recovered), "networkUsed": False, "serialization": "qiskit-superstaq QPY"}, [
            "This is local SDK serialization and round-trip validation, not target compilation or execution.",
            "Gate angles use radians. Qubit indices and idle qubits are retained; Qiskit basis strings use the highest qubit index at the left.",
        ]
    if tool_name not in ("list_superstaq_targets", "compile_superstaq_circuit"):
        raise ValueError("Unknown Superstaq action")
    service = provider(v["requestTimeoutSeconds"])
    if tool_name == "list_superstaq_targets":
        targets = service.get_targets(supports_compile=True)
        fields = ("target", "supports_compile", "available", "accessible", "retired")
        return {"targets": [{key: getattr(target, key) for key in fields} for target in targets], "networkUsed": True, "endpoint": ENDPOINT}, [
            "Availability and access are the official service's response at call time, not a guarantee that later compilation or QPU execution succeeds.",
            "This query does not submit a circuit or run a hardware job.",
        ]
    compiled = service.get_backend(v["target"]).compile(circuit_from_input(v))
    circuit = compiled.circuit
    maps = []
    for layout in (compiled.initial_logical_to_physical, compiled.final_logical_to_physical):
        if set(layout) != set(range(v["numQubits"])) or len(set(layout.values())) != len(layout):
            raise ValueError("Compilation returned an incomplete or non-injective qubit map")
        if any(not isinstance(q, int) or q < 0 or q >= circuit.num_qubits for q in layout.values()):
            raise ValueError("Compilation returned a physical qubit outside the output circuit")
        maps.append([[int(a), int(b)] for a, b in sorted(layout.items())])
    return {**describe(circuit), "target": v["target"], "initialLogicalToPhysical": maps[0], "finalLogicalToPhysical": maps[1], "networkUsed": True, "endpoint": ENDPOINT, "hardwareExecuted": False}, [
        "The input circuit was transmitted to Infleqtion's remote compiler; account quota and service charges are governed by that service.",
        "Returned circuits and qubit maps are compiler outputs, not an independently established equivalence or scientific acceptance result.",
        "No shots or QPU execution are requested. Automatic retries and HTTP redirects are disabled; a timeout does not prove that the server did no compilation work.",
        "QPY is always returned; OpenQASM 2 is null when the compiled instruction set cannot be exported to that format.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"], request["toolName"])
    json.dump({"schemaVersion": "1.0", "source": request["source"], "input": request["input"], "inputSha256": request["inputSha256"], "dependencyLockSha256": request["dependencyLockSha256"], "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
