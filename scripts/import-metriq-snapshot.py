"""Import data only from a locally downloaded, pinned Metriq GitHub archive.

Usage: python3 scripts/import-metriq-snapshot.py path/to/archive.tar.gz
Download separately from the commit URL below; this script executes no upstream code.
"""
import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path

COMMIT = "6730f78b135a9af67691a0ef4fbea041978056c5"
REPOSITORY = "https://github.com/unitaryfoundation/metriq-data"


def build(archive, destination):
    records, files = {}, []
    occurrences = 0
    total_bytes = 0
    license_text = None
    with tarfile.open(archive, "r:gz") as tar:
        for member in sorted(tar.getmembers(), key=lambda item: item.name):
            if not member.isfile():
                continue
            prefix, separator, name = member.name.partition("/")
            if not separator or not prefix.endswith(COMMIT[:7]):
                raise ValueError("Archive root does not match the pinned commit")
            if name == "LICENSE":
                license_text = tar.extractfile(member).read().decode("utf-8")
                continue
            if not re.fullmatch(r"metriq-gym/v[0-9.]+/[^\x00]+\.json", name):
                continue
            total_bytes += member.size
            if member.size > 512_000 or total_bytes > 3_000_000:
                raise ValueError("Snapshot exceeds reviewed data budget")
            raw = tar.extractfile(member).read()
            values = json.loads(raw)
            if not isinstance(values, list):
                raise ValueError(f"Expected an array of benchmark records: {name}")
            file_hash = hashlib.sha256(raw).hexdigest()
            files.append({"path": name, "sha256": file_hash, "bytes": len(raw), "recordCount": len(values)})
            for index, value in enumerate(values):
                if not isinstance(value, dict) or not isinstance(value.get("job_type"), str) or not isinstance(value.get("timestamp"), str):
                    raise ValueError(f"Invalid benchmark record: {name}[{index}]")
                canonical = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
                identifier = hashlib.sha256(canonical.encode()).hexdigest()
                record = records.setdefault(identifier, {"id": identifier, "record": value, "sources": []})
                record["sources"].append({"path": name, "arrayIndex": index, "sha256": file_hash,
                    "url": f"{REPOSITORY}/blob/{COMMIT}/{name}"})
                occurrences += 1
    if not files or license_text is None:
        raise ValueError("Snapshot data or license missing")
    payload = {"schemaVersion": "1.0", "records": sorted(records.values(), key=lambda item: (item["record"]["timestamp"], item["id"]), reverse=True)}
    encoded = (json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    source = {"name": "metriq-data", "repository": REPOSITORY, "commit": COMMIT, "license": "CC-BY-4.0",
        "snapshotSha256": hashlib.sha256(encoded).hexdigest(), "sourceFileCount": len(files),
        "recordOccurrences": occurrences, "uniqueRecords": len(records), "files": files,
        "selection": "All JSON record arrays under metriq-gym/v*/; identical complete records deduplicated with all source locations retained. No metric aggregation or ranking."}
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "snapshot.json").write_bytes(encoded)
    (destination / "source.json").write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")
    (destination / "LICENSE").write_text(license_text)
    print(json.dumps({key: source[key] for key in ["commit", "snapshotSha256", "sourceFileCount", "recordOccurrences", "uniqueRecords"]}))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: import-metriq-snapshot.py pinned-archive.tar.gz")
    build(sys.argv[1], Path(__file__).resolve().parents[1] / "src/metriq-data/upstream")
