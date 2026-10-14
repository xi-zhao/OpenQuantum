import json
import numpy as np
from qdk_chemistry.data import Structure, Element
# Structure coordinates are Bohr; XYZ I/O converts to Angstrom.
coords = np.array([[0.0,0.0,0.0],[0.0,0.0,1.42]], dtype=np.float64)
structure = Structure(coords, [Element.H, Element.H])
assert structure.get_num_atoms() == 2
repulsion = float(structure.calculate_nuclear_repulsion_energy())
assert abs(repulsion - 1.0/1.42) < 1e-10
structure.to_xyz_file("molecule.xyz")
structure.to_json_file("molecule.structure.json")
restored = Structure.from_json_file("molecule.structure.json")
assert np.allclose(restored.get_coordinates(), coords)
with open("result.json", "w") as f:
    json.dump({"coordinatesBohr": coords.tolist(), "nuclearRepulsionHartree": repulsion, "scientificValidation": "not_evaluated"}, f)
