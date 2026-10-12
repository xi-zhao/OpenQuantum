"""Check wheel RECORD files without importing third-party SDK code."""
import csv
import base64
import hashlib
import importlib.metadata
import io
import json
import re
import sys


def incomplete_distributions(distributions):
    distributions = list(distributions)
    console_records = {}
    declared_wrappers = {}
    # Two distributions can legitimately install the same console wrapper.
    # Accept only a byte-for-byte match to one of its declared owners. Never
    # extend this exception to importable modules or arbitrary shared files.
    for distribution in distributions:
        declared_wrappers[id(distribution)] = set()
        scripts = {entry.name for entry in distribution.entry_points
                   if entry.group in {"console_scripts", "gui_scripts"}}
        for name, digest, size in csv.reader(io.StringIO(distribution.read_text("RECORD") or "")):
            file = distribution.locate_file(name)
            if name.startswith("../") and file.name.removesuffix(".exe") in scripts:
                declared_wrappers[id(distribution)].add(name)
                owner = re.sub(r"[-_.]+", "-", distribution.metadata["Name"].lower())
                console_records.setdefault(file.resolve(), {})[owner] = (digest, size)

    def matching_shared_wrapper(distribution, name, file):
        if name not in declared_wrappers[id(distribution)]:
            return False
        records = console_records.get(file.resolve(), {})
        if len(records) < 2:
            return False
        data = file.read_bytes()
        for digest, size in records.values():
            if size and len(data) == int(size) and digest.startswith("sha256="):
                actual = base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip("=")
                if actual == digest.removeprefix("sha256="):
                    return True
        return False

    problems = []
    for distribution in distributions:
        record = distribution.read_text("RECORD")
        if not record or not record.strip():
            problems.append({"package": distribution.metadata["Name"], "invalidFiles": None, "examples": ["missing installed-file record"]})
            continue
        missing = []
        # importlib.metadata.files may filter out missing files. Read the raw
        # wheel record so that interrupted installations remain detectable.
        for name, _hash, expected_size in csv.reader(io.StringIO(record)):
            # Bytecode may be generated or removed independently of installation.
            if name.endswith((".pyc", ".pyo")):
                continue
            file = distribution.locate_file(name)
            try:
                size = file.stat().st_size
            except FileNotFoundError:
                missing.append(name)
                continue
            if expected_size and size != int(expected_size) and not matching_shared_wrapper(distribution, name, file):
                missing.append(name)
        if missing:
            problems.append({"package": distribution.metadata["Name"], "invalidFiles": len(missing), "examples": missing[:5]})
    return problems


if __name__ == "__main__":
    # Test fixtures can provide an isolated site-packages tree. Setup uses the
    # active interpreter's own installed distributions, never user PYTHONPATH.
    distributions = importlib.metadata.distributions(path=sys.argv[1:]) if len(sys.argv) > 1 else importlib.metadata.distributions()
    problems = incomplete_distributions(distributions)
    print(json.dumps({"incomplete": problems}))
    sys.exit(1 if problems else 0)
