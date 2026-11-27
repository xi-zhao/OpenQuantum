import hashlib
import json
import os
import runpy
from pathlib import Path

import gdstk
from qiskit_metal import Dict


def write_controls(layout, output):
    project = Path(__file__).resolve().parents[2]
    native = runpy.run_path(str(project / ".agents/skills/quantum-metal-layout/references/native-example.py"))
    renderer = native["configured_renderer"](native["example_design"](), layout / "junction.gds")
    renderer.options.fabricate = "True"
    renderer.options.negative_mask = Dict(main=[1])
    negative = renderer.export_to_gds(str(output / "upstream-negative.gds"))
    renderer.options.negative_mask = Dict(main=[])
    renderer.options.path_filename = None
    missing = renderer.export_to_gds(str(output / "missing-junction.gds"))
    if negative != 1 or missing != 1:
        raise RuntimeError(f"Upstream export results: negative={negative}, no template={missing}")

    duplicate = gdstk.read_gds(layout / "positive.gds")
    original = next(cell for cell in duplicate.cells if cell.name == "TOP")
    original.name = "SINGLE_DESIGN"
    duplicate.new_cell("TOP").add(gdstk.Reference(original), gdstk.Reference(original))
    duplicate.write_gds(output / "duplicate.gds")

    dangling = gdstk.Library()
    dangling.new_cell("TOP").add(gdstk.Reference("UNDEFINED_CELL"))
    dangling.write_gds(output / "dangling.gds")
    return {"negative": negative, "missing": missing}


if __name__ == "__main__":
    output = Path(os.environ["OPENQUANTUM_SDK_CHECK_OUTPUT"])
    layout, = output.glob("quantum-metal-layout-*/layout")
    export_results = write_controls(layout, output)
    files = [*layout.glob("*.gds"), *output.glob("*.gds")]
    manifest = {"sourceOutput": str(layout.relative_to(output)), "upstreamExportCodes": export_results,
                "files": {str(f.relative_to(output)): hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files)}}
    (output / "geometry-inputs.json").write_text(json.dumps(manifest, indent=2) + "\n")
