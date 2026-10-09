"""Pinned local data; compute never downloads or selects a newer table."""
import hashlib
import json
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SKILL_ROOT.parents[2]
LOCK_PATH = SKILL_ROOT / "database-lock.json"


def sha256_file(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def database_spec():
    raw = LOCK_PATH.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def database_directory():
    _, digest = database_spec()
    return PROJECT_ROOT / ".openquantum/pairinteraction-databases" / digest


def verify_database(directory=None):
    spec, digest = database_spec()
    root = Path(directory) if directory is not None else database_directory()
    expected = {name: checksum for archive in spec["archives"] for name, checksum in archive["files"].items()}
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*.parquet")}
    if actual != {"tables/" + name for name in expected}:
        raise ValueError("Pinned PairInteraction database missing or unexpected tables; run npm run capability:pairinteraction:setup")
    for name, checksum in expected.items():
        file = root / "tables" / name
        if file.is_symlink() or file.resolve().parent.parent != (root / "tables").resolve() or sha256_file(file) != checksum:
            raise ValueError(f"Pinned PairInteraction database checksum mismatch: {name}")
    return {"release": spec["release"], "manifestSha256": digest,
            "files": [{"name": name, "sha256": checksum} for name, checksum in sorted(expected.items())]}
