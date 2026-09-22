import sys
from pathlib import Path
from importlib.metadata import version
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from quantum_reference import circuit_statevector, complex_pairs
from science_reference import reference_plan


def compute(v):
    import numpy as np
    from graphix.transpiler import Circuit
    from graphix.simulator import PatternSimulator, DefaultMeasureMethod
    from graphix.states import BasicStates
    if version("graphix") != "0.4":
        raise ValueError("Unexpected Graphix version; restore the frozen environment")
    n = v["numQubits"]
    circuit = Circuit(n)
    for instruction in v["gates"]:
        gate, targets = instruction["gate"], instruction["targets"]
        if gate == "T":
            circuit.rz(targets[0], 0.25)
        elif gate in ["RX", "RY", "RZ"]:
            # Graphix uses multiples of pi, while this Tool accepts radians.
            getattr(circuit, gate.lower())(targets[0], instruction["angle"] / np.pi)
        else:
            getattr(circuit, "cnot" if gate == "CX" else gate.lower())(*targets)
    pattern = circuit.transpile().pattern
    resource = pattern.to_opengraph().graph
    nodes, edges = list(resource.nodes), list(resource.edges)
    pattern.standardize()
    pattern.shift_signals()
    pattern = pattern.minimize_space()
    space = pattern.max_space()
    reference_info = reference_plan(v["referenceMode"], v["simulate"] and n <= 10,
        "Independent gate-model statevector evolution",
        "Automatic reference requires simulation and at most 10 logical qubits; required attempts any simulated size.")
    reference = circuit_statevector(n, v["gates"], v["initialState"]) if reference_info["status"] == "computed" else None
    branches = []
    for index in range(v["branches"] if v["simulate"] else 0):
        seed = v["seed"] + index
        # No Pauli preprocessing or prior measurements: each branch starts empty.
        measure = DefaultMeasureMethod()
        simulator = PatternSimulator(pattern, backend="statevector", measure_method=measure)
        simulator.run(input_state=BasicStates.ZERO if v["initialState"] == "zero" else BasicStates.PLUS, rng=np.random.default_rng(seed))
        output = np.asarray(simulator.backend.state.flatten(), dtype=complex)
        if output.shape != (2 ** n,):
            raise ValueError("Graphix returned an unexpected output-state dimension")
        norm_error = float(abs(np.vdot(output, output).real - 1))
        fidelity = float(abs(np.vdot(reference, output)) ** 2) if reference is not None else None
        if norm_error > 1e-8 or (fidelity is not None and abs(1 - fidelity) > 1e-8):
            raise ValueError("Corrected MBQC output disagrees with the independent circuit reference")
        branches.append({"seed": seed, "statevector": complex_pairs(output), "fidelity": fidelity, "normError": norm_error,
            "measurements": [{"node": int(node), "outcome": int(outcome)} for node, outcome in sorted(measure.results.items())]})
    return {"nodes": sorted(map(int, nodes)), "edges": sorted([sorted(map(int, edge)) for edge in edges]),
        "inputNodes": list(pattern.input_nodes), "outputNodes": list(pattern.output_nodes), "maxSpace": int(space),
        "pattern": "\n".join(map(str, pattern)), "referenceStatevector": complex_pairs(reference) if reference is not None else None, "reference": reference_info,
        "simulation": {"status": "computed" if v["simulate"] else "not_run", "backend": "statevector", "reason": "Sampled corrected output states computed." if v["simulate"] else "Pattern generation requested without state simulation."}, "branches": branches,
        "maxInfidelity": max(max(0.0, 1 - branch["fidelity"]) for branch in branches) if reference is not None else None,
        "bitOrder": "left-to-right logical q0,q1,... mapped by outputNodes"}, [
        "Pure zero or plus product input, noiseless adaptive MBQC, with output Pauli corrections included. Angles are radians at the circuit input.",
        "Seeds select sampled measurement branches; they do not exhaust all branches or prove arbitrary-input channel equivalence.",
        "Graph nodes are MBQC resource qubits, not logical width. The returned pattern includes preparation, entanglement, measurement and correction commands.",
        "Graphix 0.4 and NumPy 2.4.6 are frozen together. No hardware, noise model or central scientific acceptance."]


execute(compute)
