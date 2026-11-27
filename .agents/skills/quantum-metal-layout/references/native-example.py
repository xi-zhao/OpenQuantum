import json
from pathlib import Path

import gdstk
from qiskit_metal import Dict, designs
from qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket
from qiskit_metal.qlibrary.terminations.open_to_ground import OpenToGround
from qiskit_metal.qlibrary.tlines.straight_path import RouteStraight


def write_sample_junction(path):
    library = gdstk.Library(unit=1e-6, precision=1e-9)
    cell = library.new_cell("OQ_JJ")
    cell.add(gdstk.Polygon(
        [(-2, -1), (2, -1), (2, 1), (1, 1), (1, 0), (-2, 0)],
        layer=7, datatype=0,
    ))
    library.write_gds(path)


def example_design():
    design = designs.DesignPlanar()
    design.chips.main.size.update(center_x="0mm", center_y="0mm", size_x="2mm", size_y="2mm")
    design.variables.update(cpw_width="10um", cpw_gap="6um")
    TransmonPocket(design, "Q1", options=Dict(
        pos_x="0um", pos_y="-400um", orientation="0", pad_width="400um",
        pad_height="80um", pad_gap="40um", pocket_width="600um",
        pocket_height="300um", gds_cell_name="OQ_JJ", layer="1",
    ))
    OpenToGround(design, "A", options=Dict(pos_x="-0.5mm", pos_y="24.5um", orientation="180"))
    OpenToGround(design, "B", options=Dict(pos_x="0.5mm", pos_y="24.5um", orientation="0"))
    RouteStraight(design, "feedline", options=Dict(pin_inputs=Dict(
        start_pin=Dict(component="A", pin="open"), end_pin=Dict(component="B", pin="open"),
    )))
    design.rebuild()
    return design


def configured_renderer(design, junction_file):
    gds = design.renderers.gds
    gds.options.path_filename = str(junction_file.resolve(strict=True))
    gds.options.precision = "0.000000001"
    gds.options.cheese.update(shape="0", cheese_0_x="25um", cheese_0_y="25um",
                              delta_x="100um", delta_y="100um", edge_nocheese="200um")
    gds.options.no_cheese.buffer = "25um"
    gds.options.negative_mask = Dict(main=[])
    return gds


def export_positive_design(design, folder, junction_file):
    renderer = configured_renderer(design, junction_file)
    outputs = {}
    for name, fabricate in [("diagnostic", False), ("positive", True)]:
        renderer.options.fabricate = str(fabricate)
        path = folder / (name + ".gds")
        if renderer.export_to_gds(str(path)) != 1:
            raise RuntimeError(f"GDS export failed for {name}")
        outputs[name] = path.name
    return outputs


if __name__ == "__main__":
    folder = Path("layout")
    folder.mkdir()
    junction = folder / "junction.gds"
    write_sample_junction(junction)
    files = export_positive_design(example_design(), folder, junction)
    result = {"directory": str(folder), "gds": files, "inputJunction": junction.name,
              "scientificValidation": "not_evaluated"}
    Path("result.json").write_text(json.dumps(result, indent=2) + "\n")
