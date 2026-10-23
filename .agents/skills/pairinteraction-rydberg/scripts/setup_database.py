"""Explicit, checksum-verified setup. No network access in the compute worker."""
import hashlib
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "mcp"))
from database import PROJECT_ROOT, database_directory, database_spec, sha256_file, verify_database


def prepare():
    spec, _ = database_spec()
    target = database_directory()
    if target.exists():
        verify_database(target)
        print("Pinned PairInteraction database already verified")
        return
    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)
    archives = PROJECT_ROOT / ".openquantum/pairinteraction-downloads"
    archives.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prepare-", dir=parent) as temporary:
        staging = Path(temporary) / "tables"
        staging.mkdir()
        for item in spec["archives"]:
            cached = archives / (item["name"] + ".zip")
            if cached.exists() and sha256_file(cached) != item["sha256"]:
                raise ValueError(f"Cached archive checksum mismatch: {item['name']}")
            if not cached.exists():
                part = Path(temporary) / (item["name"] + ".zip")
                print(f"Downloading pinned {item['name']}", flush=True)
                with urllib.request.urlopen(item["url"], timeout=60) as source, part.open("wb") as output:
                    size = 0
                    while chunk := source.read(1024 * 1024):
                        size += len(chunk)
                        if size > 200 * 1024 * 1024:
                            raise ValueError("Database archive exceeds download bound")
                        output.write(chunk)
                if sha256_file(part) != item["sha256"]:
                    raise ValueError(f"Downloaded archive checksum mismatch: {item['name']}")
                part.replace(cached)
            with zipfile.ZipFile(cached) as archive:
                names = [entry.filename for entry in archive.infolist() if not entry.is_dir()]
                if len(names) != len(set(names)) or set(names) != set(item["files"]):
                    raise ValueError("Unexpected database archive entries")
                for name, digest in item["files"].items():
                    relative = Path(name)
                    if relative.is_absolute() or ".." in relative.parts or len(relative.parts) != 2:
                        raise ValueError("Unsafe database archive path")
                    if archive.getinfo(name).file_size > 200 * 1024 * 1024:
                        raise ValueError("Database table exceeds extraction bound")
                    data = archive.read(name)
                    if hashlib.sha256(data).hexdigest() != digest:
                        raise ValueError(f"Database table checksum mismatch: {name}")
                    output = staging / "tables" / relative
                    output.parent.mkdir(exist_ok=True, parents=True)
                    output.write_bytes(data)
        verify_database(staging)
        try:
            staging.rename(target)
        except FileExistsError:
            verify_database(target)
    print("Pinned PairInteraction database prepared and verified")


if __name__ == "__main__":
    prepare()
