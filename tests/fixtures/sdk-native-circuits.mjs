// Engineering programs use public SDK APIs directly, without convenience Tools.
// Fixture widths and operations are test inputs, never product restrictions.
export const circuitSdkCases = [
  { id: "alicebob-cat-circuits", code: `
from qiskit import QuantumCircuit, transpile
from qiskit_alice_bob_provider import AliceBobLocalProvider
provider = AliceBobLocalProvider()
backend = provider.build_logical_noiseless_backend()
for n in sizes:
    circuit = QuantumCircuit(n)
    for q in range(n):
        circuit.h(q)
    compiled = transpile(circuit, backend, optimization_level=0)
    assert compiled.num_qubits >= n
    models.append({'width': n, 'instructions': len(compiled.data)})
operations = ['local provider', 'custom circuit compilation without job submission']
` },
  { id: "compact-optimization", code: `
import compactq as cq
from qiskit import QuantumCircuit
for n in sizes:
    circuit = QuantumCircuit(n)
    for j in range(n):
        circuit.h(j)
        circuit.rz(0.27, j)
    ir = cq.from_qiskit(circuit)
    restored = cq.to_qiskit(ir)
    assert restored.num_qubits == n
    models.append({'width': n, 'instructions': len(restored.data)})
operations = ['custom circuit to native IR and back']
` },
  { id: "deepquantum-differentiable", code: `
import deepquantum as dq
import torch
for n in sizes:
    circuit = dq.QubitCircuit(n)
    angles = []
    for j in range(n):
        theta = torch.tensor(0.13 * (j+1), requires_grad=True)
        angles.append(theta)
        circuit.rx(j, inputs=theta)
    state = circuit()
    assert state.numel() == 2**n
    gradients = torch.autograd.grad(state.flatten()[0].real, angles)
    assert len(gradients) == n and all(g.numel() == 1 and torch.isfinite(g) for g in gradients)
    torch.save(circuit.state_dict(), output / f'parameters-{n}.pt')
    models.append({'width': n, 'stateShape': list(state.shape)})
operations = ['custom differentiable circuit', 'native autograd connection', 'state tensor and parameter serialization']
` },
  { id: "flagquantum-workbench", code: `
import flagquantum
for n in sizes:
    circuit = flagquantum.Circuit(n,device='cpu')
    for j in range(n):
        circuit.h(j)
    ir = circuit.to_ir()
    payload = ir.to_json()
    restored = flagquantum.CircuitIR.from_json(payload)
    assert restored.to_dict() == ir.to_dict()
    (output / f'program-{n}.json').write_text(payload)
    models.append({'qubits': n, 'instructions': len(ir.instructions)})
operations = ['custom native circuit', 'full IR serialization and reconstruction']
` },
  { id: "graphix-mbqc", code: `
from graphix.transpiler import Circuit
for n in sizes:
    circuit = Circuit(n)
    for j in range(n):
        circuit.h(j)
        circuit.rz(j, 0.13*(j+1))
    pattern = circuit.transpile().pattern
    pattern.standardize()
    pattern.shift_signals()
    assert len(pattern.input_nodes) == n and len(pattern.output_nodes) == n
    (output / f'pattern-{n}.txt').write_text('\\n'.join(map(str, pattern)))
    models.append({'logicalWidth': n, 'resourceNodes': len(pattern.to_opengraph().graph.nodes)})
operations = ['custom circuit', 'MBQC pattern compilation and rewriting', 'pattern export']
` },
  { id: "guppy-programs", code: `
from guppylang import guppy
from guppylang.std.quantum import qubit, h, measure
@guppy
def parity_program(repetitions: int) -> bool:
    q = qubit()
    for i in range(repetitions):
        h(q)
    return measure(q).read()
compiled = parity_program.compile_function()
binary = compiled.to_bytes()
assert len(binary) > 0
(output / 'custom.hugr').write_bytes(binary)
models.append({'bytes': len(binary)})
operations = ['native user-defined function with loop and parameter', 'HUGR compilation and binary export']
` },
  { id: "hamiltonian-simulation", code: `
from qiskit import QuantumCircuit, qpy
from qiskit.quantum_info import SparsePauliOp
from qiskit.circuit.library import PauliEvolutionGate
from qiskit.synthesis import SuzukiTrotter
for n in sizes:
    h = SparsePauliOp.from_sparse_list([('XZ', [0,n-1], 0.37), ('Y', [1], -0.21)], num_qubits=n)
    circuit = QuantumCircuit(n)
    circuit.append(PauliEvolutionGate(h, time=0.19, synthesis=SuzukiTrotter(order=2, reps=3)), range(n))
    compiled = circuit.decompose()
    with (output / f'evolution-{n}.qpy').open('wb') as stream:
        qpy.dump(compiled, stream)
    assert compiled.num_qubits == n
    models.append({'width': n, 'instructions': len(compiled.data)})
operations = ['custom sparse Hamiltonian', 'configurable synthesis', 'native circuit export']
` },
  { id: "kaiwu-qubo", code: `
from kaiwu.core import Binary, QuboModel
for n in sizes:
    x = [Binary(f'x{i}') for i in range(n)]
    model = QuboModel(sum((i+1)*x[i] for i in range(n)) + 0.31*(sum(x)-2)**2)
    matrix = model.get_matrix()
    assert matrix.shape == (n,n)
    models.append({'variables': len(model.get_variables()), 'matrixShape': list(matrix.shape)})
operations = ['custom symbolic constrained objective', 'native QUBO matrix generation without license service']
` },
  { id: "mimiq-simulation", code: `
import mimiqcircuits as mc
from exaqt import ExaqtSV
for n in sizes:
    circuit = mc.Circuit()
    for j in range(n):
        circuit.push(mc.GateRX(0.17*(j+1)), j)
    state = ExaqtSV.zero(n)
    state.apply_h(0)
    assert len(state.amplitudes()) == 2**n
    (output / f'circuit-{n}.txt').write_text(str(circuit))
    models.append({'width': n, 'instructions': len(circuit)})
operations = ['custom native circuit', 'local Exaqt state API without remote connection']
` },
  { id: "mindquantum-differentiable", code: `
from mindquantum.core.circuit import Circuit
from mindquantum.core.gates import RX
from mindquantum.core.operators import QubitOperator
for n in sizes:
    circuit = Circuit([RX({f'theta{j}': 1.0}).on(j) for j in range(n)])
    bound = circuit.apply_value({f'theta{j}': 0.13*(j+1) for j in range(n)})
    operator = sum(QubitOperator(f'Z{j}', j+1) for j in range(n))
    assert circuit.n_qubits == n and len(circuit.params_name) == n
    (output / f'circuit-{n}.txt').write_text(str(bound))
    models.append({'width': n, 'parameters': len(circuit.params_name), 'operatorTerms': len(operator.terms)})
operations = ['custom symbolic circuit', 'parameter binding', 'native operator construction']
` },
  { id: "mqt-ddsim", code: `
from mqt.ddsim import DDSIMProvider
from qiskit import QuantumCircuit
backend = DDSIMProvider().get_backend('statevector_simulator')
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.ry(0.31, n-1)
    result = backend.run(circuit).result()
    assert len(result.get_statevector()) == 2**n
    models.append({'width': n, 'backend': backend.name})
operations = ['native backend', 'custom program execution and result object']
` },
  { id: "mqt-qmap", code: `
from mqt.qmap.sc import Architecture, Configuration, map_ as map_circuit
from mqt.core import load
from qiskit import QuantumCircuit
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.cx(0, n-1)
    architecture = Architecture(n, {(i,i+1) for i in range(n-1)} | {(i+1,i) for i in range(n-1)})
    config = Configuration()
    mapped, info = map_circuit(load(circuit), architecture, config)
    payload = info.json()
    (output / f'mapping-{n}.json').write_text(json.dumps(payload))
    models.append({'width': n, 'reportType': type(payload).__name__})
operations = ['custom topology', 'native mapper configuration', 'mapping and complete report export']
` },
  { id: "myqlm-simulation", code: `
from qat.lang import AQASM
for n in sizes:
    program = AQASM.Program()
    q = program.qalloc(n)
    for j in range(n):
        program.apply(AQASM.RX(0.13*(j+1)), q[j])
    circuit = program.to_circ()
    job = circuit.to_job(nbshots=0)
    assert circuit.nbqbits == n
    circuit.dump(str(output / f'circuit-{n}.circ'))
    models.append({'width': circuit.nbqbits, 'jobType': type(job).__name__})
operations = ['custom AQASM program', 'native circuit and job construction', 'serialization without server']
` },
  { id: "openqarp-excited-states", code: `
from qarp.blocks import HEABlock
from qarp.operators import QubitOperator
from qarp.optimizers import ScipyOptimizer
from qarp.algorithms import VQD, StateVector
from qarp.engines import QarpEngine
for n in sizes:
    kets = [HEABlock(n,1,real=False,linear=True,circular=False,use_cz=False).build() for _ in range(2)]
    operator = QubitOperator('X0',0.11) + QubitOperator(f'Z{n-1}',0.37)
    initial = [{symbol:0.17 for symbol in ket.symbols} for ket in kets]
    engine = QarpEngine(seed=17)
    solver = VQD(operator,kets,[1.7],initial_parameters=initial,optimizer=ScipyOptimizer('BFGS',{'maxiter':1}),engine=engine,gradient=True,verbose=False)
    assert solver.build() is solver and len(solver.kets) == 2
    primitive = StateVector(operator=operator,ket=kets[0])
    engine.build([primitive],params=initial[0])
    assert len(primitive.compiled_circuits) == 1 and len(primitive.compiled_circuits[0]) > 0
    models.append({'width': n, 'parameters': len(kets[0].symbols), 'compiledCircuits': len(primitive.compiled_circuits[0])})
operations = ['custom ansatz/operator and VQD configuration', 'native expectation primitive compilation; no optimization or engine execution']
` },
  { id: "oqc-qat", code: `
from qat.purr.backends.echo import get_default_echo_hardware
from qat.purr.compiler.instructions import Pulse
from qat.purr.compiler.devices import PulseShapeType
for n in sizes:
    hardware = get_default_echo_hardware(qubit_count=n)
    builder = hardware.create_builder()
    channel = hardware.get_qubit(n-1).get_drive_channel()
    builder.add(Pulse(channel, PulseShapeType.SQUARE, width=40e-9, amp=0.3))
    assert len(builder.instructions) > 0
    models.append({'width': n, 'instructions': len(builder.instructions)})
operations = ['offline hardware model', 'custom pulse program without device connection']
` },
  { id: "pennylane-differentiable", code: `
import pennylane as qml
from pennylane import numpy as pnp
for n in sizes:
    device = qml.device('default.qubit', wires=n)
    @qml.qnode(device)
    def program(theta):
        for j in range(n):
            qml.RY(theta*(j+1), wires=j)
        return qml.expval(qml.Z(n-1))
    theta = pnp.array(0.17, requires_grad=True)
    value, gradient = program(theta), qml.grad(program)(theta)
    assert pnp.isfinite(value) and pnp.isfinite(gradient)
    models.append({'width': n, 'gradientShape': list(pnp.shape(gradient))})
operations = ['custom QNode and observable', 'native differentiation without training']
` },
  { id: "pyquil-simulation", code: `
from pyquil import Program
from pyquil.gates import RX, CNOT
for n in sizes:
    program = Program()
    theta = program.declare('theta', 'REAL', n)
    for j in range(n):
        program += RX(theta[j], j)
    program += CNOT(0,n-1)
    text = program.out()
    assert Program(text).out() == text
    (output / f'custom-{n}.quil').write_text(text)
    models.append({'width': n, 'instructions': len(program.instructions)})
operations = ['custom parameterized Quil program', 'parse and serialize without QVM connection']
` },
  { id: "pytket-compilation", code: `
from pytket import Circuit
from pytket.passes import RemoveRedundancies
for n in sizes:
    circuit = Circuit(n)
    for j in range(n):
        circuit.Rx(0.31, j).Rx(-0.31,j)
    RemoveRedundancies().apply(circuit)
    payload = circuit.to_dict()
    assert Circuit.from_dict(payload) == circuit
    (output / f'circuit-{n}.json').write_text(json.dumps(payload))
    models.append({'width': n, 'remainingGates': circuit.n_gates})
operations = ['custom circuit', 'native compiler pass', 'lossless serialization']
` },
  { id: "pyzx-optimization", code: `
import pyzx as zx
from fractions import Fraction
for n in sizes:
    circuit = zx.Circuit(n)
    for j in range(n):
        circuit.add_gate('ZPhase',j,phase=Fraction(1,7))
    graph = circuit.to_graph()
    zx.simplify.full_reduce(graph)
    payload = graph.to_json()
    restored = zx.Graph.from_json(payload)
    assert restored.num_vertices() == graph.num_vertices()
    (output / f'graph-{n}.json').write_text(payload)
    models.append({'width': n, 'vertices': graph.num_vertices()})
operations = ['custom rational-phase circuit', 'ZX rewriting', 'graph serialization']
` },
  { id: "qbraid-conversion", code: `
from qbraid.transpiler import ConversionGraph, transpile
from qiskit import QuantumCircuit
for n in sizes:
    circuit = QuantumCircuit(n)
    for j in range(n):
        circuit.ry(0.13*(j+1),j)
    converted = transpile(circuit,'qasm2')
    assert f'qreg q[{n}]' in converted
    (output / f'custom-{n}.qasm').write_text(converted)
    models.append({'width': n, 'format': type(converted).__name__})
assert ConversionGraph() is not None
operations = ['native conversion graph', 'custom circuit conversion and QASM export']
` },
  { id: "qcompute-simulation", code: `
import QCompute as qc
for n in sizes:
    env = qc.QEnv()
    q = env.Q.createList(n)
    for j in range(n):
        qc.RX(0.13*(j+1))(q[j])
    env.publish()
    payload = env.program.SerializeToString()
    assert len(payload) > 0
    (output / f'program-{n}.pb').write_bytes(payload)
    models.append({'width': n, 'bytes': len(payload)})
operations = ['custom native program construction', 'protobuf serialization; no backend commit']
` },
  { id: "qcut-knitting", code: `
import QCut
from qiskit import QuantumCircuit
from qiskit.circuit.library import CXGate
from qiskit_addon_cutting import cut_gates
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.cx(0,n-1)
    cut, bases = cut_gates(circuit,[0])
    assert cut.num_qubits == n and len(bases) == 1
    marked = QuantumCircuit(n)
    marked.append(**QCut.cutGate(CXGate(),0,n-1))
    options = QCut.CutOptions(finder_cut_mode='gate',finder_num_partitions=2,consolidate='never',joint_rotation_cuts=False,wire_cut_communication='never',expansion='exact',seed=173)
    split = QCut.get_locations_and_subcircuits(marked,options=options)
    experiments = QCut.get_experiment_circuits(split,['Z'*n])
    assert split.cut_locations and experiments.num_circuits > 0
    models.append({'width': n, 'cuts': len(bases), 'experimentCircuits': experiments.num_circuits})
operations = ['custom gate cutting through addon and QCut APIs', 'native subcircuit and experiment generation without submission']
` },
  { id: "qibo-simulation", code: `
from qibo import Circuit, gates
from qibo.backends import NumpyBackend
for n in sizes:
    circuit = Circuit(n)
    circuit.add(gates.RY(j,theta=0.13*(j+1)) for j in range(n))
    backend = NumpyBackend()
    state = backend.execute_circuit(circuit).state()
    assert state.shape == (2**n,)
    circuit.set_parameters([0.07]*n)
    models.append({'width': n, 'parameters': len(circuit.get_parameters())})
operations = ['custom parameterized circuit', 'native parameter update and CPU execution']
` },
  { id: "qrisp-arithmetic", code: `
from qrisp import QuantumFloat, h
for n in sizes:
    register = QuantumFloat(n, exponent=-1, signed=False)
    h(register[0])
    register += 0.5
    compiled = register.qs.compile()
    assert len(compiled.qubits) >= n
    (output / f'program-{n}.txt').write_text(str(compiled))
    models.append({'fractionalBits': 1, 'width': n, 'compiledQubits': len(compiled.qubits)})
operations = ['custom quantum numeric type', 'native arithmetic and compiler']
` },
  { id: "qsteed-compilation", code: `
from quafu import QuantumCircuit
from qsteed import Backend, Model, PassFlow, Transpiler, UnrollToBasis
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.ry(n-1,0.27)
    basis = ['cx','rx','ry','rz','id']
    backend = Backend(name='offline_native_check',qubits_num=n,basis_gates=basis)
    compiled = Transpiler(PassFlow([UnrollToBasis(basis_gates=basis)]),Model(backend=backend)).transpile(circuit)
    text = compiled.to_openqasm()
    (output / f'circuit-{n}.qasm').write_text(text)
    models.append({'width': n, 'gates': len(compiled.gates)})
operations = ['custom backend and pass flow', 'native compilation and export without cloud']
` },
  { id: "quantum-circuit-verification", code: `
from mqt import qcec
from mqt.qcec.pyqcec import Configuration
from qiskit import QuantumCircuit
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.ry(0.23,n-1)
    config = Configuration()
    report = qcec.verify(circuit,circuit.copy(),configuration=config)
    assert report.considered_equivalent()
    (output / f'verification-{n}.txt').write_text(str(report))
    models.append({'width': n, 'resultType': type(report).__name__})
operations = ['custom circuits', 'native verifier configuration and API self-consistency regression']
` },
  { id: "quri-parts-estimation", code: `
from quri_parts.circuit import QuantumCircuit
from quri_parts.core.operator import Operator, pauli_label
from quri_parts.core.state import GeneralCircuitQuantumState
from quri_parts.qulacs.estimator import create_qulacs_vector_estimator
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.add_RY_gate(n-1,0.31)
    state = GeneralCircuitQuantumState(n,circuit)
    operator = Operator({pauli_label(f'Z{n-1}'): 0.37})
    estimate = create_qulacs_vector_estimator()(operator,state)
    assert abs(estimate.value.imag) < 1e-10
    models.append({'width': n, 'estimateType': type(estimate).__name__})
operations = ['custom circuit state and operator', 'native estimator composition']
` },
  { id: "qutrunk-simulation", code: `
from qutrunk.circuit import QCircuit
from qutrunk.circuit.gates import Rx, CNOT
from qutrunk.backends import BackendLocal
for n in sizes:
    circuit = QCircuit(backend=BackendLocal(run_mode='local'))
    q = circuit.allocate(n)
    for j in range(n):
        Rx(0.13*(j+1)) * q[j]
    CNOT * (q[0],q[n-1])
    text = '\\n'.join(command.qasm() for command in circuit.cmds)
    assert len(circuit.cmds) == n+1
    (output / f'commands-{n}.txt').write_text(text)
    models.append({'width': n, 'commands': len(circuit.cmds)})
operations = ['native circuit and local backend construction', 'custom rotations and command export']
` },
  { id: "tensorcircuit-differentiable", code: `
import tensorcircuit as tc
import jax
import jax.numpy as jnp
import optax
jax.config.update('jax_enable_x64',True)
backend = tc.set_backend('jax')
for n in sizes:
    def program(theta):
        circuit = tc.Circuit(n)
        circuit.ry(n-1,theta=theta)
        return backend.real(circuit.expectation_ps(z=[n-1]))
    value, gradient = backend.value_and_grad(program)(0.17)
    assert bool(jnp.isfinite(value)) and bool(jnp.isfinite(gradient))
    updated = backend.optimizer(optax.adam(0.01)).update(gradient,jnp.array(0.17))
    assert bool(jnp.isfinite(updated))
    circuit = tc.Circuit(n)
    circuit.ry(n-1,theta=0.17)
    translated = circuit.to_qiskit()
    restored = tc.Circuit.from_qiskit(translated,n)
    assert restored.state().shape == (2**n,)
    models.append({'width': n, 'backend': backend.name})
operations = ['custom JAX circuit function', 'native automatic differentiation and optimizer update', 'Qiskit conversion roundtrip']
` },
  { id: "tyxonq-workbench", code: `
import tyxonq as tq
for n in sizes:
    circuit = tq.Circuit(n)
    for j in range(n):
        circuit.h(j)
    models.append({'width': n, 'circuitType': type(circuit).__name__})
    (output / f'circuit-{n}.txt').write_text(str(circuit))
operations = ['custom native circuit and program representation']
` },
];
