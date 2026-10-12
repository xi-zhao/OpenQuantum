"""Check wheel RECORD files without importing third-party SDK code."""
import csv
import importlib.metadata
import io
import json
import sys


def incomplete_distributions(distributions):
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
            if expected_size and size != int(expected_size):
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
