export const physicsSdkCases = [
  { id: "bloqade-analog", code: `
from bloqade.analog import start
for n in sizes:
    program = (start.add_position([(4.2*j, 0) for j in range(n)])
        .rydberg.rabi.amplitude.uniform.piecewise_linear([0.2,0.3],[0,1.1,0])
        .detuning.uniform.constant(0.17,0.5))
    compiled = program.bloqade.python().hamiltonian(blockade_radius=0.0)[0]
    assert len(compiled.hamiltonian.space.configurations) == 2**n
    models.append({'atoms': n, 'basisSize': len(compiled.hamiltonian.space.configurations)})
operations = ['custom atom positions and waveforms', 'native Hamiltonian compilation without evolution']
` },
  { id: "clifft-sampling", code: `
import clifft
for n in sizes:
    text = '\\n'.join([f'H {j}' for j in range(n)] + ['M ' + ' '.join(map(str,range(n)))])
    compiled = clifft.compile(text)
    result = clifft.sample(compiled,shots=5,seed=17,threads=1)
    assert result.measurements.shape == (5,n)
    (output / f'program-{n}.stim').write_text(text)
    models.append({'qubits': n, 'recordShape': list(result.measurements.shape)})
operations = ['user-defined instruction program', 'native compilation and measurement record API']
` },
  { id: "deltakit-qec", code: `
from deltakit.circuit.gates import PauliBasis
from deltakit.explorer.codes import RotatedPlanarCode, css_code_memory_circuit
from deltakit.explorer.qpu import QPU, ToyNoise
for distance in sizes:
    code = RotatedPlanarCode(width=distance,height=distance)
    circuit = css_code_memory_circuit(code,num_rounds=2,logical_basis=PauliBasis.Z)
    text = str(circuit.as_stim_circuit())
    assert 'DETECTOR' in text
    (output / f'code-{distance}.stim').write_text(text)
    models.append({'distance': distance, 'codeType': type(code).__name__, 'programBytes': len(text)})
operations = ['native code and measurement program construction', 'Stim export; no memory experiment sampling']
` },
  { id: "ldpc-decoding", code: `
import numpy as np
from ldpc.bplsd_decoder import BpLsdDecoder
for n in sizes:
    matrix = np.zeros((n-1,n),dtype=np.uint8)
    for j in range(n-1):
        matrix[j,j:j+2] = 1
    decoder = BpLsdDecoder(matrix,error_rate=0.031,max_iter=10,bp_method='ms')
    correction = decoder.decode(np.zeros(n-1,dtype=np.uint8))
    assert correction.shape == (n,)
    assert not np.any(matrix @ correction % 2)
    np.save(output / f'parity-{n}.npy',matrix)
    models.append({'bits': n, 'checks': n-1})
operations = ['custom parity-check matrix', 'native decoder configuration and syndrome interface']
` },
  { id: "lightworks-photonics", code: `
import lightworks as lw
for n in sizes:
    circuit = lw.PhotonicCircuit(n)
    circuit.bs(0,1,reflectivity=0.37)
    circuit.ps(n-1,0.19)
    state = lw.State([1]+[0]*(n-1))
    task = lw.Simulator(circuit,state)
    assert circuit.U.shape == (n,n)
    models.append({'modes': n, 'taskType': type(task).__name__})
operations = ['custom photonic network', 'Fock state and simulator task construction']
` },
  { id: "merlin-learning", code: `
import torch
import perceval as pcvl
from merlin import QuantumLayer, MeasurementStrategy, ComputationSpace
for n in sizes:
    circuit = pcvl.Circuit(n).add(0,pcvl.BS()).add(0,pcvl.PS(pcvl.P('phi_0')))
    layer = QuantumLayer(circuit=circuit,input_state=[1]+[0]*(n-1),input_parameters=['phi'],trainable_parameters=[],measurement_strategy=MeasurementStrategy.probs(ComputationSpace.FOCK),dtype=torch.float64,device=torch.device('cpu'))
    result = layer(torch.tensor([[0.27]],dtype=torch.float64))
    assert result.shape[-1] == n
    models.append({'modes': n, 'outputShape': list(result.shape)})
operations = ['custom optical neural layer', 'native Torch forward interface; no training']
` },
  { id: "mitiq-error-mitigation", code: `
import cirq
from mitiq.zne.scaling import fold_global
from mitiq.zne.inference import RichardsonFactory
from mitiq import pec, cdr, rem
for n in sizes:
    q = cirq.LineQubit.range(n)
    circuit = cirq.Circuit(cirq.rx(0.17*(j+1))(q[j]) for j in range(n))
    folded = fold_global(circuit,3)
    assert folded.all_qubits() == circuit.all_qubits()
    assert len(list(folded.all_operations())) >= n
    models.append({'qubits': n, 'foldedOperations': len(list(folded.all_operations()))})
assert RichardsonFactory(scale_factors=[1,2,3]) is not None
operations = ['custom circuit scaling', 'extrapolator configuration', 'PEC/CDR/REM modules; no mitigation experiment']
` },
  { id: "mrmustard-optics", code: `
from mrmustard.lab import Vacuum, Dgate, Sgate, Attenuator
for n in sizes:
    state = Vacuum(n) >> Dgate(x=0.23,y=-0.11)[0] >> Sgate(r=0.19)[n-1]
    noisy = state >> Attenuator(transmissivity=0.87)[0]
    assert noisy.cov.shape == (2*n,2*n)
    models.append({'modes': n, 'covarianceShape': list(noisy.cov.shape)})
operations = ['custom Gaussian state and channel composition', 'native covariance representation']
` },
  { id: "netqasm-network", code: `
from netqasm.sdk.connection import DebugConnection
from netqasm.sdk.qubit import Qubit
from netqasm.backend.messages import deserialize_host_msg, SubroutineMessage
from netqasm.lang.parsing import deserialize
DebugConnection.node_ids = {'CustomNode': 0}
for n in sizes:
    with DebugConnection('CustomNode',max_qubits=n) as connection:
        q = [Qubit(connection) for _ in range(n)]
        for qubit in q:
            qubit.H()
            qubit.measure()
    programs = [m for raw in connection.storage if isinstance(m:=deserialize_host_msg(raw),SubroutineMessage)]
    assert programs
    binary = programs[0].subroutine
    assert bytes(deserialize(binary)) == binary
    (output / f'custom-{n}.netqasm').write_bytes(binary)
    models.append({'qubits': n, 'subroutines': len(programs)})
operations = ['custom network-node program', 'native offline compiler and binary round trip; no NetSquid']
` },
  { id: "openfermion-mapping", code: `
from openfermion import FermionOperator, jordan_wigner, bravyi_kitaev, hermitian_conjugated
for n in sizes:
    hopping = FermionOperator(((0,1),(n-1,0)),0.31)
    h = hopping + hermitian_conjugated(hopping)
    jw, bk = jordan_wigner(h), bravyi_kitaev(h,n_qubits=n)
    assert jw.terms and bk.terms
    (output / f'operators-{n}.txt').write_text(str(jw)+'\\n'+str(bk))
    models.append({'modes': n, 'jwTerms': len(jw.terms), 'bkTerms': len(bk.terms)})
operations = ['custom fermionic polynomial', 'two native mappings and operator export']
` },
  { id: "pairinteraction-rydberg", code: `
import pairinteraction.real as pi
import pairinteraction.complex as pic
for n in [43,47]:
    ket = pi.KetAtom('Rb',n=n,l=0,j=0.5,m=0.5)
    basis = pi.BasisAtom('Rb',n=(n-1,n+1),l=(0,1))
    system = pi.SystemAtom(basis)
    assert ket is not None and system is not None
    models.append({'principalNumber': n, 'systemType': type(system).__name__})
assert pic.KetAtom is not None
operations = ['custom atomic basis and state', 'real/complex native APIs with explicit local database; no pair-potential task']
` },
  { id: "paulie-algebra", code: `
from paulie import get_pauli_string
for n in sizes:
    first = get_pauli_string('X'+'I'*(n-1))
    second = get_pauli_string('I'*(n-1)+'Z')
    product = first @ second
    assert str(product)
    models.append({'width': n, 'product': str(product)})
operations = ['custom Pauli words', 'native algebra composition']
` },
  { id: "perceval-photonics", code: `
import perceval as pcvl
from perceval.serialization import serialize, deserialize
for n in sizes:
    circuit = pcvl.Circuit(n).add((0,1),pcvl.BS.Rx(theta=0.31)).add(n-1,pcvl.PS(0.17))
    state = pcvl.BasicState([1]+[0]*(n-1))
    processor = pcvl.Processor('SLOS',circuit).with_input(state)
    payload = serialize(circuit)
    restored = deserialize(payload)
    assert restored.m == n
    (output / f'optical-{n}.txt').write_text(payload)
    models.append({'modes': n, 'processorType': type(processor).__name__})
operations = ['custom optical processor and Fock input', 'native serialization round trip']
` },
  { id: "pulser-dynamics", code: `
from pulser import Register, Sequence, Pulse
from pulser.devices import MockDevice
from pulser.waveforms import RampWaveform, ConstantWaveform
for n in sizes:
    register = Register({f'atom{j}': (6*j,0) for j in range(n)})
    sequence = Sequence(register,MockDevice)
    sequence.declare_channel('custom','rydberg_global')
    sequence.add(Pulse(RampWaveform(200,0,0.7),ConstantWaveform(200,-0.3),0.17),'custom')
    payload = sequence.to_abstract_repr()
    restored = Sequence.from_abstract_repr(payload)
    assert len(restored.register.qubits) == n
    (output / f'pulse-{n}.json').write_text(payload)
    models.append({'atoms': n, 'duration': sequence.get_duration()})
operations = ['custom geometry and pulse shape', 'native sequence serialization; no evolution']
` },
  { id: "pychemiq-chemistry", code: `
from pychemiq import FermionOperator, PauliOperator
from pychemiq.Transform.Mapping import jordan_wigner
for n in sizes:
    number = FermionOperator(f'{n-1}+ {n-1}',0.37)
    mapped = jordan_wigner(number)
    assert mapped.data()
    models.append({'modes': n, 'mappedTerms': len(mapped.data())})
operations = ['custom fermionic operator', 'native mapping interface without molecular solver']
` },
  { id: "qdk-resource-estimation", code: `
import qdk
from qdk import qsharp
from qdk.qre.application import QSharpApplication
from qdk.qre.models import GateBased, SurfaceCode, RoundBasedFactory
qsharp.init()
qsharp.eval('operation NativeCustomProgram(n : Int) : Unit { use qs = Qubit[n]; for q in qs { H(q); } ResetAll(qs); }')
application = QSharpApplication(qdk.code.NativeCustomProgram,3)
hardware = GateBased(error_rate=0.001,gate_time=50,measurement_time=100)
assert application is not None and hardware is not None
models.append({'applicationType': type(application).__name__, 'hardwareType': type(hardware).__name__})
operations = ['custom parameterized Q# program', 'resource application and hardware model; no estimate claim']
` },
  { id: "qoolqit-workbench", code: `
import qoolqit as qq
for n in sizes:
    register = qq.Register({f'q{j}': (2.1*j,0) for j in range(n)})
    drive = qq.Drive(amplitude=qq.RampWaveform(0.5,0.1,0.7),detuning=qq.ConstantWaveform(0.5,-0.2),phase=0.17)
    program = qq.QuantumProgram(register,drive)
    assert not program.is_compiled
    models.append({'atoms': n, 'programType': type(program).__name__})
operations = ['custom atom register and waveform', 'native quantum program before target selection']
` },
  { id: "quairkit-information", code: `
import quairkit as qkit
qkit.set_device('cpu')
qkit.set_dtype('complex128')
for n in sizes:
    circuit = qkit.Circuit(n)
    circuit.ry(qubits_idx=[n-1],param=0.17)
    state = circuit()
    rho = state.density_matrix
    assert list(rho.shape[-2:]) == [2**n,2**n]
    models.append({'qubits': n, 'densityShape': list(rho.shape)})
operations = ['custom circuit', 'native state and density representation']
` },
  { id: "qualtran-resources", code: `
from qualtran import QUInt
from qualtran.bloqs.arithmetic import Add
from qualtran.resource_counting import get_cost_value, QECGatesCost
for n in sizes:
    bloq = Add(QUInt(n))
    graph = bloq.decompose_bloq()
    cost = get_cost_value(bloq,QECGatesCost())
    assert graph is not None and cost is not None
    (output / f'bloq-{n}.txt').write_text(str(graph)+'\\n'+str(cost))
    models.append({'bits': n, 'costType': type(cost).__name__})
operations = ['custom typed Bloq', 'native decomposition and cost-model API']
` },
  { id: "quantum-information-audit", code: `
import numpy as np
from toqito.matrix_ops import partial_transpose
from toqito.matrix_props import is_density
from toqito.states import basis
for n in sizes:
    rho = np.eye(n*3)/(n*3)
    transposed = partial_transpose(rho,sys=[1],dim=[n,3])
    assert transposed.shape == (n*3,n*3) and is_density(transposed)
    assert basis(n,n-1).shape == (n,1)
    np.save(output / f'matrix-{n}.npy',transposed)
    models.append({'subsystemDimensions': [n,3]})
operations = ['custom subsystem dimensions', 'native matrix/state interfaces and array export']
` },
  { id: "simqn-network", code: `
from qns.simulator.simulator import Simulator
from qns.simulator.event import func_to_event
from qns.entity.node.node import QNode
from qns.entity.qchannel.qchannel import QuantumChannel
for n in sizes:
    simulator = Simulator(0,1,accuracy=1000)
    nodes = [QNode(f'node{j}') for j in range(n)]
    channel = QuantumChannel(name='custom',node_list=[nodes[0],nodes[-1]],delay=0.01)
    for node in (nodes[0],nodes[-1]):
        node.add_qchannel(channel)
        node.install(simulator)
    received = []
    simulator.add_event(func_to_event(simulator.time(sec=0.2),lambda: received.append('event')))
    simulator.run()
    assert received == ['event']
    models.append({'nodes': n, 'events': len(received)})
operations = ['custom node/channel topology', 'native discrete-event scheduling']
` },
  { id: "sqd-chemistry", code: `
import numpy as np
from qiskit_addon_sqd.counts import counts_to_arrays
from qiskit_addon_sqd.configuration_recovery import recover_configurations
from qiskit_addon_sqd.fermion import diagonalize_fermionic_hamiltonian
for n in sizes:
    counts = {'0'*(2*n): 2, '1'*(2*n): 3}
    matrix, probabilities = counts_to_arrays(counts)
    recovered, weights = recover_configurations(matrix,probabilities,(np.full(n,1/n),np.full(n,1/n)),num_elec_a=1,num_elec_b=1,rand_seed=17)
    assert recovered.shape[1] == 2*n and weights.shape == (len(recovered),)
    assert np.all(recovered[:,:n].sum(axis=1) == 1) and np.all(recovered[:,n:].sum(axis=1) == 1)
    assert np.isfinite(weights).all() and np.isclose(weights.sum(),1)
    models.append({'orbitals': n, 'configurationShape': list(recovered.shape)})
assert callable(recover_configurations) and callable(diagonalize_fermionic_hamiltonian)
operations = ['custom bitstring data', 'native configuration recovery and output contract; no molecular solver']
` },
  { id: "symmer-tapering", code: `
from symmer.operators import PauliwordOp
for n in sizes:
    op = PauliwordOp.from_list(['X'+'I'*(n-1),'I'*(n-1)+'Z'],[0.31,-0.27])
    squared = op * op
    assert squared.n_qubits == n
    (output / f'operator-{n}.txt').write_text(str(squared))
    models.append({'qubits': n, 'terms': squared.n_terms})
operations = ['custom Pauli operator', 'native symbolic algebra without eigensolver']
` },
  { id: "tjm-dynamics", code: `
from mqt.yaqs import State, Hamiltonian, Observable, NoiseModel, AnalogSimParams
for n in sizes:
    state = State(length=n,initial='zeros')
    observable = Observable('x',sites=n-1)
    noise = NoiseModel([{'name':'lowering','sites':[n-1],'strength':0.013}])
    hamiltonian = Hamiltonian.pauli(length=n,two_body=[(0.17,'X','Z')],one_body=[(-0.23,'Y')],bc='open')
    parameters = AnalogSimParams(observables=[observable],elapsed_time=0.125,dt=0.0625,num_traj=1,max_bond_dim=8,svd_threshold=1e-10,krylov_tol=1e-10,random_seed=17,order=2)
    assert hamiltonian.length == n and hamiltonian.representation == 'mpo'
    assert len(hamiltonian.mpo.tensors) == n
    assert parameters.times.shape == (3,) and parameters.observables[0] is observable
    models.append({'sites': n, 'stateType': type(state).__name__, 'noiseType': type(noise).__name__, 'timePoints': len(parameters.times)})
operations = ['custom MPS state, observable and noise model', 'Hamiltonian MPO construction and time-grid configuration; no trajectory task']
` },
];
