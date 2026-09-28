"""Development references and evidence framing; never used for SDK computation."""
import importlib.util
import json
import os
from pathlib import Path
from sdk_compilers_reference import dense_unitary, circuit_cases, deny_network
ROOT = Path(__file__).resolve().parents[2]


def bridge(id):
    spec = importlib.util.spec_from_file_location("bridge_" + id.replace("-", "_"), ROOT / ".agents/skills" / id / "mcp/bridge.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.compute


def record(id, value):
    directory = Path(os.environ.get("OPENQUANTUM_SDK_EXPANSION_CIRCUITS_EVIDENCE", ROOT / ".openquantum/sdk-expansion-evidence/circuits"))
    directory.mkdir(parents=True, exist_ok=True)
    (directory / ("science-" + id + ".json")).write_text(json.dumps(value, indent=2) + "\n")
