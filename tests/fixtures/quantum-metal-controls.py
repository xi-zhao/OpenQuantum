import hashlib
import json
import os
import runpy
import time
from pathlib import Path

import gdstk


if __name__ == "__main__":
    project = Path(__file__).resolve().parents[2]
    example = runpy.run_path(str(project / ".agents/skills/quantum-metal-layout/references/native-example.py"))
    output = Path(os.environ["OPENQUANTUM_SDK_CHECK_OUTPUT"])
    folders = list(output.glob("quantum-metal-layout-*/layout"))
    if len(folders) != 1:
        raise ValueError(f"Expected one native SDK example output, found {len(folders)}")
    missing = output / "missing-junction"
    missing.mkdir()
    start = time.perf_counter()
    example["export_masks"](example["example_design"](), missing, None)

    lib = gdstk.Library()
    lib.new_cell("TOP").add(gdstk.Reference("UNDEFINED_CELL"))
    lib.write_gds(output / "dangling.gds")
    files = [*folders[0].glob("*.gds"), *missing.glob("*.gds"), output / "dangling.gds"]
    summary = {
        "sourceOutput": str(folders[0].relative_to(output)),
        "controlExportSeconds": time.perf_counter() - start,
        "files": {str(f.relative_to(output)): hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files)},
        "scientificValidation": "not_evaluated",
    }
    (output / "geometry-inputs.json").write_text(json.dumps(summary, indent=2) + "\n")
