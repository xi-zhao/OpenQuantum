"""Offline Qiskit bridge regression, not molecular qLR or hardware acceptance."""
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(os.environ["OPENQUANTUM_ROOT"]) / "src/lib"))
from sdk_bootstrap import prepare_sdk
prepare_sdk("slowquant-response")

from qiskit.primitives import StatevectorSampler
from qiskit_nature.second_q.mappers import JordanWignerMapper
from slowquant.qiskit_interface.interface import QuantumInterface
from slowquant.qiskit_interface.util import MitigationFlags
from slowquant.unitary_coupled_cluster.operators import Epq

interface = QuantumInterface(StatevectorSampler(seed=1234), "hf", JordanWignerMapper(),
                             ansatz_options={}, shots=256)
interface.construct_circuit([0], [1], [0, 1], [2, 3], 2, (1, 1))
observations = []
for mitigation, postselection in [(False, False), (True, False), (True, True), (False, True), (False, False)]:
    interface.mitigation_flags = MitigationFlags(do_M_mitigation=mitigation, do_postselection=postselection)
    # The HF determinant contains two electrons in spatial orbital 0, none in 1.
    # These are analytic occupations, not another call to the same solver.
    values = [float(interface.quantum_expectation_value(Epq(orbital, orbital))) for orbital in [0, 1]]
    repeated = [float(interface.quantum_expectation_value(Epq(orbital, orbital))) for orbital in [0, 1]]
    assert max(abs(a - b) for a, b in zip(values, [2, 0])) < 1e-12
    assert repeated == values
    observations.append({"mitigation": mitigation, "postselection": postselection,
                         "occupations": values, "repeatedOccupations": repeated})
Path("qiskit.json").write_text(json.dumps({"cases": observations, "shots": 256,
    "scope": "Noise-free HF determinant occupations, flag changes and repeated public calls only",
    "molecularQlrVerified": False, "hardwareVerified": False,
    "scientificValidation": "not_evaluated"}, indent=2) + "\n")
