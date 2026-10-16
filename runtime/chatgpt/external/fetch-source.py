"""Download only the hash-verified files of one fixed upstream source archive."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import urllib.request

manifest = json.loads(Path(sys.argv[1]).read_text())
destination = Path(sys.argv[2])
data = urllib.request.urlopen(manifest["url"], timeout=60).read(32 * 1024 * 1024)
if hashlib.sha256(data).hexdigest() != manifest["sha256"]:
    raise RuntimeError("Upstream archive digest mismatch")
destination.mkdir(parents=True, exist_ok=True, mode=0o700)
with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
    for name, expected in manifest["files"].items():
        if Path(name).is_absolute() or any(part in ("..", ".") for part in Path(name).parts) or "\\" in name:
            raise RuntimeError("Invalid source manifest path")
        member = archive.getmember(manifest["prefix"] + "/" + name)
        if not member.isfile() or member.size > 8 * 1024 * 1024:
            raise RuntimeError("Invalid upstream file")
        content = archive.extractfile(member).read()
        if hashlib.sha256(content).hexdigest() != expected:
            raise RuntimeError("Upstream source digest mismatch")
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        target.write_bytes(content)
print("OPENQUANTUM_SOURCE_OK")
