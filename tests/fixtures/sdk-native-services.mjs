// These checks build local programs/configurations only. They do not authenticate,
// query accounts, connect laboratory hardware, or submit remote jobs.
export const serviceSdkCases = [
  { id: "aqt-workbench", code: `
from qiskit_aqt_provider import AQTProvider
from qiskit import QuantumCircuit, transpile
provider = AQTProvider(access_token='',load_dotenv=False)
backend = provider.get_backend('offline_simulator_no_noise',backend_type='offline_simulator')
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.ry(0.27,n-1)
    compiled = transpile(circuit,backend,optimization_level=0)
    assert compiled.num_qubits >= n
    models.append({'width': n, 'instructions': len(compiled.data)})
operations = ['explicit offline provider', 'custom native circuit compilation without job submission']
` },
  { id: "braket-simulation", code: `
from braket.circuits import Circuit
from braket.circuits.serialization import IRType
from braket.devices import LocalSimulator
for n in sizes:
    circuit = Circuit()
    for j in range(n):
        circuit.rx(j,0.17*(j+1))
    program = circuit.to_ir(ir_type=IRType.OPENQASM)
    assert circuit.qubit_count == n
    (output / f'custom-{n}.qasm').write_text(program.source)
    models.append({'width': n, 'irType': type(program).__name__})
assert LocalSimulator is not None
operations = ['custom circuit', 'native OpenQASM IR export; no AWS resource construction']
` },
  { id: "classiq-synthesis", code: `
import classiq as cq
@cq.qfunc
def main(q: cq.Output[cq.QArray[cq.QBit]]):
    cq.allocate(5,q)
    cq.apply_to_all(cq.H,q)
model = cq.create_model(main)
parsed = json.loads(model)
assert parsed
(output / 'custom-model.json').write_text(model)
models.append({'modelKeys': sorted(parsed)})
operations = ['custom Qmod function', 'local model construction and complete JSON export; no synthesis request']
` },
  { id: "cudaq-simulation", code: `
import cudaq
cudaq.set_target('qpp-cpu')
for n in sizes:
    kernel = cudaq.make_kernel()
    q = kernel.qalloc(n)
    kernel.ry(0.27,q[n-1])
    ir = str(kernel)
    assert 'func' in ir
    (output / f'kernel-{n}.mlir').write_text(ir)
    models.append({'width': n, 'target': cudaq.get_target().name})
operations = ['custom native kernel', 'CPU target selection and MLIR export; no GPU run']
` },
  { id: "fieldqkit-hardware", code: `
from fieldqkit import QuantumHardwareClient
from fieldqkit.api.quantum_platform import create_provider_runtime
client = QuantumHardwareClient()
runtime = create_provider_runtime(provider='simulator',client=client)
for n in sizes:
    profile = runtime.backend_adapter.discover_hardware(num_qubits=n)[0]
    resolved = runtime.backend_adapter.resolve_backend(num_qubits=n)
    assert profile.nqubits_available >= n and resolved.provider == 'simulator'
    models.append({'qubits': n, 'backendType': type(resolved.backend).__name__, 'provider': profile.provider})
operations = ['native client and explicit local simulator provider', 'custom-size backend profile construction and resolution; no physical hardware']
` },
  { id: "ionq-programs", code: `
from qiskit import QuantumCircuit
from qiskit_ionq.helpers import qiskit_circ_to_ionq_circ
for n in sizes:
    circuit = QuantumCircuit(n)
    for j in range(n):
        circuit.ry(0.19*(j+1),j)
    operations_native, measured, mapping = qiskit_circ_to_ionq_circ(circuit,gateset='qis')
    assert len(operations_native) == n
    (output / f'program-{n}.json').write_text(json.dumps(operations_native))
    models.append({'width': n, 'instructions': len(operations_native)})
operations = ['custom circuit', 'native IonQ program conversion without provider connection']
` },
  { id: "iqm-circuit-workbench", code: `
from qiskit import QuantumCircuit, transpile
from iqm.qiskit_iqm.fake_backends import IQMFakeApollo
from iqm.qiskit_iqm.iqm_circuit_validation import validate_circuit
backend = IQMFakeApollo()
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.h(0)
    circuit.cz(0,n-1)
    compiled = transpile(circuit,backend,optimization_level=0)
    validate_circuit(compiled,backend)
    models.append({'logicalWidth': n, 'compiledWidth': compiled.num_qubits})
operations = ['offline backend model', 'custom circuit compilation and native validation']
` },
  { id: "laboneq-control", code: `
from laboneq.simple import Experiment, ExperimentSignal, pulse_library
for n in sizes:
    experiment = Experiment(uid=f'custom_{n}',signals=[ExperimentSignal('drive')])
    with experiment.acquire_loop_rt(uid='shots',count=n):
        with experiment.section(uid='body'):
            experiment.play(signal='drive',pulse=pulse_library.gaussian(uid='shaped',length=80e-9,amplitude=0.23))
    assert experiment.sections
    (output / f'experiment-{n}.txt').write_text(str(experiment))
    models.append({'repetitions': n, 'sections': len(experiment.sections)})
operations = ['custom pulse and loop structure', 'native experiment construction without session connection']
` },
  { id: "oqc-cloud", code: `
from qcaas_client.client import CompilerConfig, QPUTask, QuantumResultsFormat
for n in sizes:
    text = 'OPENQASM 2.0;\\ninclude "qelib1.inc";\\nqreg q['+str(n)+'];\\nh q[0];'
    task = QPUTask(program=text,config=CompilerConfig(repeats=17,results_format=QuantumResultsFormat().binary_count()))
    assert task.program == text
    (output / f'program-{n}.qasm').write_text(task.program)
    models.append({'width': n, 'taskType': type(task).__name__})
operations = ['custom OpenQASM task and compiler options without client or submission']
` },
  { id: "qblox-scheduling", code: `
from qblox_scheduler.schedules.schedule import TimeableSchedule
from qblox_scheduler.operations import SquarePulse, IdlePulse
for n in sizes:
    schedule = TimeableSchedule(f'custom-{n}',repetitions=n)
    for j in range(n):
        schedule.add(SquarePulse(amplitude=0.17,duration=20e-9,port='q0:mw',clock='cl0.baseband'))
        schedule.add(IdlePulse(duration=4e-9))
    assert len(schedule.schedulables) == 2*n
    (output / f'schedule-{n}.json').write_text(schedule.to_json())
    models.append({'pulses': n, 'scheduledOperations': len(schedule.schedulables)})
operations = ['custom schedule and pulse sequence', 'native JSON export without instruments']
` },
  { id: "qcarchive-query", code: `
from qcportal.singlepoint import QCSpecification
from qcportal.molecules import Molecule
specification = QCSpecification(program='psi4',driver='energy',method='hf',basis='sto-3g')
molecule = Molecule(symbols=['He'],geometry=[[0,0,0]])
payload = specification.dict()
assert QCSpecification(**payload) == specification
(output / 'specification.json').write_text(json.dumps(payload,default=str))
models.append({'specificationType': type(specification).__name__, 'moleculeType': type(molecule).__name__})
operations = ['native calculation specification and molecule data', 'serialization without PortalClient connection']
` },
  { id: "qctrl-workbench", code: `
import numpy as np
import boulderopal as bo
import fireopal
from qctrlcommons.serializers import DataTypeEncoder
for n in sizes:
    graph = bo.Graph()
    signal = graph.pwc_signal(values=np.linspace(0.1,0.3,n),duration=1e-6)
    operator = graph.pwc_operator(signal=signal,operator=np.diag([1,-1]))
    propagator = graph.time_evolution_operators_pwc(operator,sample_times=[1e-6],name='custom')
    payload = json.dumps(graph,cls=DataTypeEncoder)
    (output / f'graph-{n}.json').write_text(payload)
    models.append({'segments': n, 'nodeType': type(propagator).__name__})
operations = ['custom control graph and time-dependent operator', 'native graph export without cloud evaluation']
` },
  { id: "qililab-control", code: `
from qililab.qprogram import QProgram, QbloxCompiler
from qililab.waveforms import Square, IQPair
for n in sizes:
    program = QProgram()
    for j in range(n):
        program.play(bus='drive',waveform=IQPair(I=Square(amplitude=0.1,duration=20),Q=Square(amplitude=0.03,duration=20)))
    compiled = QbloxCompiler().compile(program)
    payload = compiled.sequences['drive'].todict()
    (output / f'sequence-{n}.json').write_text(json.dumps(payload))
    models.append({'pulses': n, 'sequenceKeys': sorted(payload)})
operations = ['custom IQ program', 'native offline Qblox compilation and sequence export']
` },
  { id: "qua-programs", code: `
spec = importlib.util.spec_from_file_location('qua_offline',root / '.agents/skills/qua-programs/mcp/bridge.py')
offline_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(offline_module)
with offline_module.offline_user_config():
    from qm.qua import program, declare, for_, play, wait
    from qm import generate_qua_script, QuantumMachinesManager
    QuantumMachinesManager.set_capabilities_offline([])
    with program() as prog:
        i = declare(int)
        with for_(i,0,i<5,i+1):
            play('custom_pulse','drive')
            wait(7,'drive')
    source = generate_qua_script(prog)
assert 'custom_pulse' in source
(output / 'custom_qua.py').write_text(source)
models.append({'programType': type(prog).__name__})
operations = ['custom QUA loop and pulse program', 'native source generation with isolated offline configuration']
` },
  { id: "quantuminspire-cloud", code: `
from compute_api_client import Configuration
from quantuminspire.settings.models import Project, LocalAlgorithm
config = Configuration(host='https://api.quantum-inspire.com')
for n in sizes:
    source = output / f'custom-{n}.cq'
    source.write_text('version 3.0\\nqubit['+str(n)+'] q\\nH q[0]\\n')
    algorithm = LocalAlgorithm(file_path=source,num_shots=17,store_raw_data=True)
    project = Project(name=f'local-{n}',algorithms={'custom':algorithm})
    payload = project.model_dump_json()
    restored = Project.model_validate_json(payload)
    assert restored.algorithms['custom'].file_path.read_text() == source.read_text()
    assert restored.algorithms['custom'].num_shots == 17
    (output / f'project-{n}.json').write_text(payload)
    models.append({'width':n,'projectType':type(project).__name__,'algorithmType':type(algorithm).__name__})
operations = ['custom saved cQASM program and native local project model', 'native project serialization round trip without authentication or client connection']
` },
  { id: "superstaq-compilation", code: `
import qiskit_superstaq as qss
from qiskit import QuantumCircuit
for n in sizes:
    circuit = QuantumCircuit(n)
    circuit.ry(0.17,n-1)
    payload = qss.serialize_circuits(circuit)
    assert qss.deserialize_circuits(payload)[0] == circuit
    (output / f'program-{n}.txt').write_text(payload)
    models.append({'width': n, 'bytes': len(payload)})
operations = ['custom circuit', 'native service serialization round trip without remote compiler']
` },
];
