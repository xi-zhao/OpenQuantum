import json
from arc import Rubidium87
atom = Rubidium87()
energies = {str(n): float(atom.getEnergy(n, 0, 0.5)) for n in (30, 45)}
assert all(value < 0 for value in energies.values())
dipole = float(atom.getDipoleMatrixElement(5, 0, 0.5, 0.5, 5, 1, 1.5, 1.5, 1))
assert abs(dipole) > 0
with open("result.json", "w") as f:
    json.dump({"energiesEV": energies, "dipoleAtomicUnits": dipole, "scientificValidation": "not_evaluated"}, f)
