"""Editable example for the fixed tropidist circuit and GF(2) matrix CLI."""
import argparse
import hashlib
import json
import math
import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_H = b"%%MatrixMarket matrix coordinate pattern general\n2 3 4\n1 1\n1 2\n2 2\n2 3\n"
DEFAULT_L = b"%%MatrixMarket matrix coordinate pattern general\n1 3 1\n1 1\n"


def columns(data):
    lines = iter(data.decode("ascii").splitlines())
    if next(lines, "") != "%%MatrixMarket matrix coordinate pattern general":
        raise ValueError("expected a GF(2) MatrixMarket coordinate pattern general file")
    dims = next((line for line in lines if not line.startswith("%")), "")
    rows, count, entries = map(int, dims.split())
    if min(rows, count, entries) < 0:
        raise ValueError("negative matrix dimensions")
    masks = [0] * count
    for _ in range(entries):
        row, col = map(int, next(lines, "").split())
        if not (1 <= row <= rows and 1 <= col <= count):
            raise ValueError("matrix coordinate out of range")
        masks[col-1] ^= 1 << (row-1)
    if any(line.strip() for line in lines):
        raise ValueError("unexpected data after the declared matrix entries")
    return masks


def checked_exact(record, matrices):
    if record["status"] != "exact":
        return False
    support = record.get("witness")
    bound = record["upper_bound"]
    if (type(bound) is not int or bound < 1 or bound != record.get("lower_bound")
            or record.get("witness_ok") is not True or record.get("value_only")
            or not isinstance(support, list) or len(support) != bound
            or any(type(i) is not int or i < 0 for i in support) or len(set(support)) != bound):
        raise ValueError("exact result lacks matching bounds and a checked nonempty witness")
    if matrices:
        syndrome = logical = 0
        h, labels = matrices
        for i in support:
            if i >= len(h):
                raise ValueError("witness column out of range")
            syndrome ^= h[i]
            logical ^= labels[i]
        if syndrome or not logical:
            raise ValueError("witness fails the input GF(2) equations")
    else:
        replay = record.get("replay") or {}
        if replay.get("result") != "pass" or replay.get("fired_detectors") != [] or not replay.get("flipped_observables"):
            raise ValueError("circuit witness lacks a successful undetected logical replay")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    inputs = parser.add_mutually_exclusive_group()
    inputs.add_argument("--matrices", nargs=2, type=Path, metavar=("H", "L"))
    inputs.add_argument("--circuit", type=Path)
    parser.add_argument("--seconds", type=float, default=5)
    parser.add_argument("--wall-seconds", type=float, default=18)
    parser.add_argument("--kmax", type=int, default=6)
    args = parser.parse_args()
    if not 1 <= args.kmax <= 40 or not all(math.isfinite(x) and x > 0 for x in (args.seconds, args.wall_seconds)):
        parser.error("use positive finite budgets and kmax in [1,40]")
    summary = Path("result.json")
    if summary.exists():
        raise FileExistsError("run in a fresh task directory; result.json already exists")
    root = Path(os.environ.get("OPENQUANTUM_ROOT") or Path(__file__).resolve().parents[4])
    sys.path.insert(0, str(root / "src/lib"))
    from sdk_bootstrap import prepare_sdk
    payload = prepare_sdk("tropidist-distance")
    work = Path(tempfile.mkdtemp(prefix="tropidist-", dir=Path.cwd()))
    matrices = None
    if args.circuit:
        inputs = {"circuit.stim": args.circuit.read_bytes()}
        argv = ["circuit.stim"]
    else:
        h, l = (file.read_bytes() for file in args.matrices) if args.matrices else (DEFAULT_H, DEFAULT_L)
        matrices = (columns(h), columns(l))
        if len(matrices[0]) != len(matrices[1]):
            raise ValueError("H and L require the same number of columns")
        inputs = {"H.mtx": h, "L.mtx": l}
        argv = ["--matrices", "H.mtx", "L.mtx"]
    for name, data in inputs.items():
        (work / name).write_bytes(data)
    raw = work / "distance.json"
    argv += ["--out", raw.name, "--threads", "1", "--time-limit", str(args.seconds),
             "--config", f"dp=2,kmin=1,kmax={args.kmax}"]
    attempt = {"inputSha256": {k: hashlib.sha256(v).hexdigest() for k,v in inputs.items()},
               "argv": argv, "wallSeconds": args.wall_seconds, "scientificValidation": "not_evaluated"}
    (work / "attempt.json").write_text(json.dumps(attempt, indent=2))
    env = {"PATH": os.devnull, "PYTHONPATH": str(payload), "PYTHONNOUSERSITE": "1", "PYTHONDONTWRITEBYTECODE": "1",
           "TMPDIR": str(work), "OPENBLAS_NUM_THREADS": "1", "OMP_NUM_THREADS": "1", "VECLIB_MAXIMUM_THREADS": "1"}
    with (work / "stdout.log").open("x") as out, (work / "stderr.log").open("x") as err:
        proc = subprocess.Popen([sys.executable, "-P", "-B", "-m", "cdist", *argv], cwd=work,
                                env=env, stdout=out, stderr=err, start_new_session=True)
        try:
            proc.wait(timeout=args.wall_seconds)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
            raise
    if proc.returncode or not raw.is_file():
        raise RuntimeError(f"tropidist failed to produce a fresh record, see {work}")
    record = json.loads(raw.read_bytes())
    exact = checked_exact(record, matrices)
    with summary.open("x") as output:
        json.dump({**attempt, "status": record["status"], "checkedExact": exact,
                   "lowerBound": record.get("lower_bound"), "upperBound": record.get("upper_bound"),
                   "raw": str(raw.relative_to(Path.cwd())), "rawSha256": hashlib.sha256(raw.read_bytes()).hexdigest()}, output, indent=2)
    if record["status"] not in ("exact", "bounds", "timeout"):
        raise RuntimeError(f'tropidist returned {record["status"]}, see {work}')


if __name__ == "__main__":
    main()
