"""Bounded JSON bridge to the pinned fieldqkit package."""

from __future__ import annotations

import json
import math
import sys

from fieldqkit import QuantumHardwareClient
from fieldqkit.api.quantum_platform import create_provider_runtime


def finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value if math.isfinite(float(value)) else None


def profile_view(profile):
    topology = getattr(profile, "topology", None)
    calibration = getattr(profile, "calibration", None)
    couplers = list(getattr(topology, "couplers", []) or [])[:4096]
    qubits = list(getattr(topology, "qubits", []) or [])[:4096]
    queue_length = finite_number(getattr(calibration, "queue_length", None))
    return {
        "provider": str(getattr(profile, "provider", "")),
        "hardwareName": str(getattr(profile, "hardware_name", "")),
        "nqubitsAvailable": int(getattr(profile, "nqubits_available", 0)),
        "twoQubitGateBasis": str(getattr(profile, "two_qubit_gate_basis", "")),
        "topology": {
            "qubits": [int(value) for value in qubits],
            "couplers": [[int(left), int(right)] for left, right in couplers],
        },
        "calibration": {"queueLength": queue_length},
    }


def main():
    if len(sys.argv) != 4:
        raise ValueError("bridge expects provider, numQubits and preferredHardware JSON")
    provider = sys.argv[1]
    num_qubits = int(sys.argv[2])
    preferred = json.loads(sys.argv[3])
    client = QuantumHardwareClient()
    runtime = create_provider_runtime(provider=provider, client=client)
    profiles = runtime.backend_adapter.discover_hardware(
        num_qubits=num_qubits,
        prefer_hardware=preferred or None,
    )
    output = {
        "provider": provider,
        "requestedQubits": num_qubits,
        "backends": [profile_view(profile) for profile in list(profiles)[:32]],
    }
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
