import json
import sys
from pathlib import Path

import klayout.db as db


def inputs(path):
    layout = db.Layout()
    layout.read(str(path))
    ghosts = [cell.name for cell in layout.each_cell() if cell.is_ghost_cell()]
    if ghosts:
        raise ValueError("Undefined cell: " + ", ".join(ghosts))
    top = layout.cell("TOP")
    if top is None or not top.is_top():
        raise ValueError("Missing TOP design root")
    return layout, top


def shapes(layout, top, layer, datatype):
    index = layout.find_layer(layer, datatype)
    return db.Region() if index is None else db.Region(top.begin_shapes_rec(index))


def box(dbu, xmin, ymin, xmax, ymax):
    return db.Region(db.Box(*(round(v / dbu) for v in (xmin, ymin, xmax, ymax))))


def bounds_agree(actual, expected):
    return (actual - expected.sized(1)).is_empty() and (expected - actual.sized(1)).is_empty()


def read_design(path, polarity):
    layout, top = inputs(path)
    dbu = layout.dbu
    if abs(dbu - 0.001) > 1e-12:
        raise ValueError(f"Unexpected database unit {dbu} micrometres")
    marker = shapes(layout, top, 7, 0)
    marker_points = [(1, -402), (1, -398), (-1, -398), (-1, -399), (0, -399), (0, -402)]
    expected_marker = db.Region(db.Polygon([db.Point(round(x / dbu), round(y / dbu)) for x, y in marker_points]))
    observations = {"dbuUm": dbu, "junctionShapesFromTop": marker.count(),
                    "junctionAreaUm2": marker.area() * dbu**2,
                    "junctionPositionAndDirection": bounds_agree(marker, expected_marker)}
    if polarity == "diagnostic":
        return observations
    physical = db.Region()
    for idx in layout.layer_indices():
        info = layout.get_info(idx)
        if info.layer == 1:
            physical += db.Region(top.begin_shapes_rec(idx))
    physical.merge()
    observations["visibleKeepoutAbsent"] = shapes(layout, top, 1, 99).is_empty()
    if polarity == "positive":
        observations["cheesedGroundPresent"] = not shapes(layout, top, 1, 100).is_empty()
    pads = box(dbu, -200, -380, 200, -300) + box(dbu, -200, -500, 200, -420)
    pad_window = box(dbu, -250, -540, -20, -260) + box(dbu, 20, -540, 250, -260)
    cpw_window = box(dbu, -450, -115, 450, 115)
    openings = box(dbu, -450, 13.5, 450, 19.5) + box(dbu, -450, 29.5, 450, 35.5)
    for x in range(-400, 401, 100):
        for y in (-100, 100):
            openings += box(dbu, x - 12.5, y - 12.5, x + 12.5, y + 12.5)
    far_window = box(dbu, -316, 184, -284, 216)
    far_hole = box(dbu, -312.5, 187.5, -287.5, 212.5)
    for label, window, expected_material in [
        ("padBoundaries", pad_window, pads & pad_window),
        ("straightCpwAndUntrimmedHoleGrid", cpw_window, cpw_window - openings),
        ("offKeepoutHole", far_window, far_window - far_hole),
    ]:
        expected = expected_material if polarity == "positive" else window - expected_material
        actual = physical & window
        observations[label] = bounds_agree(actual, expected)
        observations[label + "DifferenceUm2"] = (actual ^ expected).area() * dbu**2
    return observations


def inspect_output(folder):
    output = json.loads((folder / "geometry-inputs.json").read_text())
    report = {"files": {}, "controls": {}, "scientificValidation": "not_evaluated"}
    errors = []
    for polarity in ("diagnostic", "positive", "negative"):
        try:
            result = read_design(folder / output["sourceOutput"] / (polarity + ".gds"), polarity)
            report["files"][polarity] = result
            if result["junctionShapesFromTop"] != 1:
                errors.append(f"{polarity}: expected one placed junction, found {result['junctionShapesFromTop']}")
            errors.extend(f"{polarity}: {key}" for key, value in result.items() if value is False)
        except (ValueError, RuntimeError) as exc:
            report["files"][polarity] = {"error": str(exc)}
            errors.append(f"{polarity}: {exc}")
    omitted = read_design(folder / "missing-junction" / "positive.gds", "positive")
    report["controls"]["missingJunctionShapes"] = omitted["junctionShapesFromTop"]
    if omitted["junctionShapesFromTop"] != 0 or omitted["junctionPositionAndDirection"]:
        errors.append("Missing junction did not fail the marker check")
    try:
        inputs(folder / "dangling.gds")
        errors.append("Undefined reference survived readback")
    except (ValueError, RuntimeError) as exc:
        if "UNDEFINED_CELL" not in str(exc):
            raise
        report["controls"]["danglingReference"] = str(exc)
    report["failures"] = errors
    raw = json.dumps(report, indent=2)
    (folder / "geometry-readback.json").write_text(raw + "\n")
    print(raw)
    return bool(errors)


if __name__ == "__main__":
    sys.exit(inspect_output(Path(sys.argv[1])))
