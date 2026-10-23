"""Optional provenance writer for host-owned SDK scripts; never executes work."""
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path
import sys


def write_evidence(destination, *, files, distributions, argv, cwd, lock_sha256,
                   execution_status, seed=None, backend=None, resources=None):
    """Record explicit inputs only. Do not pass credentials in argv or filenames."""
    if execution_status not in {"completed", "failed", "cancelled", "interrupted"}:
        raise ValueError("Unsupported execution status")
    artifacts = []
    for filename in files:
        file = Path(filename).resolve(strict=True)
        hasher = hashlib.sha256()
        with file.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                hasher.update(block)
        artifacts.append({"path": str(file), "bytes": file.stat().st_size,
                          "sha256": hasher.hexdigest()})
    versions = {name: importlib.metadata.version(name) for name in distributions}
    evidence = {"schemaVersion": 1, "executionStatus": execution_status,
                "scientificValidation": "not_evaluated", "interpreter": sys.executable,
                "python": platform.python_version(), "packages": versions,
                "argv": list(argv), "cwd": str(Path(cwd).resolve()),
                "dependencyLockSha256": lock_sha256, "seed": seed,
                "backend": backend, "resources": resources, "files": artifacts}
    target = Path(destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("x", encoding="utf-8") as stream:
        json.dump(evidence, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    return evidence
