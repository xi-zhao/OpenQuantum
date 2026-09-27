"""Development-only dense references, independent of the six vendor SDKs."""
import importlib.util
import json
import math
import os
import socket
from pathlib import Path


def load_bridge(file):
    spec = importlib.util.spec_from_file_location("vendor_bridge", file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.compute


def deny_network():
    def denied(*args, **kwargs):
        raise AssertionError("Local SDK evaluation attempted a network connection")
    socket.socket.connect = denied
    socket.create_connection = denied


def dense_unitary(v):
    import numpy as np
    n = v["numQubits"]
    identity = np.eye(2, dtype=complex)
    x = np.array([[0, 1], [1, 0]], dtype=complex)
    y = np.array([[0, -1j], [1j, 0]], dtype=complex)
    z = np.diag([1, -1]).astype(complex)
    matrices = {"H": (x + z) / math.sqrt(2), "X": x, "Y": y, "Z": z,
                "S": np.diag([1, 1j]), "T": np.diag([1, np.exp(1j * math.pi / 4)])}
    result = np.eye(2**n, dtype=complex)
    for item in v["gates"]:
        gate, targets = item["gate"], item["targets"]
        if gate in ["RX", "RY", "RZ"]:
            p = {"RX": x, "RY": y, "RZ": z}[gate]
            matrix = math.cos(item["angle"] / 2) * identity - 1j * math.sin(item["angle"] / 2) * p
        elif gate not in ["CX", "CZ"]:
            matrix = matrices[gate]
        operator = np.zeros_like(result)
        for column in range(2**n):
            bits = list(format(column, f"0{n}b"))
            if gate in ["CX", "CZ"]:
                sign = 1
                if bits[targets[0]] == "1":
                    if gate == "CX":
                        bits[targets[1]] = str(1 - int(bits[targets[1]]))
                    elif bits[targets[1]] == "1":
                        sign = -1
                operator[int("".join(bits), 2), column] = sign
            else:
                initial = int(bits[targets[0]])
                for final in range(2):
                    out = bits.copy()
                    out[targets[0]] = str(final)
                    operator[int("".join(out), 2), column] = matrix[final, initial]
        result = operator @ result
    return result


def circuit_cases():
    import numpy as np
    cases = [
        {"numQubits": 3, "gates": [{"gate": "X", "targets": [i]}]} for i in range(3)
    ]
    cases += [{"numQubits": 2, "gates": [{"gate": "H", "targets": [0]}, {"gate": "CX", "targets": [0, 1]}]},
              {"numQubits": 1, "gates": [{"gate": "RX", "targets": [0], "angle": math.pi}]}]
    rng = np.random.default_rng(20260927)
    for _ in range(12):
        gates = []
        for name in ["H", "S", "T", "X", "Y", "Z", "RX", "RY", "RZ", "CX", "CZ"] * 2:
            targets = [int(q) for q in rng.choice(3, size=2 if name in ["CX", "CZ"] else 1, replace=False)]
            item = {"gate": name, "targets": targets}
            if name in ["RX", "RY", "RZ"]:
                item["angle"] = float(rng.uniform(-7, 7))
            gates.append(item)
        cases.append({"numQubits": 3, "gates": gates})
    return cases


def write_evidence(id, value):
    directory = Path(os.environ.get("OPENQUANTUM_SDK_COMPILERS_EVIDENCE", ".openquantum/sdk-evidence/compilers"))
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"science-{id}.json").write_text(json.dumps(value, indent=2) + "\n")
