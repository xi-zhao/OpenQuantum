import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describeSdk } from "../src/lib/sdk-access.mjs";

// Optional engineering checks of native code, never a scientific acceptance run.
// No installation, network operation or convenience Tool is invoked here.
const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_NATIVE_SDK_CHECKS === "1";
const cases = [
  { id: "flow-vqe", timeout: 300000, distributions: ["torch", "zuko", "pennylane", "openfermion", "scipy"], code: `
import flow_vqe
import optimization_baselines
import ansatz
assert callable(flow_vqe.train_flow_with_unified_hamiltonians)
assert callable(flow_vqe.generate_potential_energy_surface)
assert optimization_baselines.OptimizationRunner is not None
models = []
for n in config['sizes']:
    count = ansatz.get_ansatz_parameter_count('HEA', n, layers=2)
    assert count == 3*n
    circuit = ansatz.get_ansatz_circuit('HEA', np.zeros(count), list(range(n)), np.zeros(n, dtype=int), layers=2)
    assert callable(circuit)
    models.append({'qubits': n, 'parameters': count})
details = {'models': models, 'operations': ['complete upstream package', 'training and baseline APIs reachable', 'custom ansatz construction without training']}
` },
  { id: "cqlib-kernel", distributions: ["cqlib", "cqlib-qml", "torch"], code: `
import cqlib_qml
from cqlib_qml.ansatz import BasicQNN, HEAnsatz, CRADL, CRAML
from cqlib_qml.algorithms import VQC, QKM, QSVM
from cqlib.circuit import Circuit, Parameter
from cqlib.qis.state import Statevector
from cqlib_qml.differentiator import AdjointDifferentiator
from cqlib_qml.utils import grad_matrix
assert all(item is not None for item in [HEAnsatz, CRADL, CRAML, VQC, QKM, QSVM])
models = []
for n in config['sizes']:
    model = BasicQNN(n_qubits=n, layers=['XX', 'YY', 'ZZ'])
    assert model.num_qubits == n and model.in_dim == 3*(n-1)
    circuit = Circuit(n)
    circuit.ry(0, Parameter('theta'))
    bound = circuit.assign_parameters({'theta': 0.37})
    assert grad_matrix(bound.operations[0])[0].shape == (2, 2)
    state = Statevector(n)
    state.apply_circuit(bound)
    gradient = AdjointDifferentiator().run(circuit, {'theta': 0.37}, state.data, readouts=[0])
    np.testing.assert_allclose(gradient['theta'], [-np.sin(0.37)], atol=1e-10)
    models.append({'qubits': n, 'parameters': model.in_dim, 'adjointGradientShape': list(gradient['theta'].shape)})
details = {'models': models, 'operations': ['full QML package imports', 'custom multilayer QNN; no training', 'symbolic parameter binding and adjoint API regression']}
` },
  { id: "ocean-optimization", distributions: ["dwave-ocean-sdk", "dimod", "dwave-optimization", "dwave-cloud-client"], code: `
import dimod
from dwave.optimization import Model
from dwave.system import EmbeddingComposite
from dwave.cloud import Client
from dwave.samplers import SimulatedAnnealingSampler
assert all(item is not None for item in [EmbeddingComposite, Client, SimulatedAnnealingSampler])
models = []
for n in config['sizes']:
    variables = [dimod.Binary(f'x{j}') for j in range(n)]
    cqm = dimod.ConstrainedQuadraticModel()
    cqm.set_objective(sum((j+1) * variable for j, variable in enumerate(variables)))
    cqm.add_constraint(sum(variables) <= n-1, label='budget')
    nonlinear = Model()
    symbols = nonlinear.binary(n)
    nonlinear.minimize(symbols.sum())
    assert cqm.num_variables() == n and symbols.shape() == (n,)
    models.append({'variables': n, 'constraints': cqm.num_constraints()})
details = {'models': models, 'operations': ['custom CQM', 'nonlinear model', 'full Ocean imports without cloud connection']}
` },
  { id: "qpanda-qubo", distributions: ["pyqpanda-alg"], code: `
import pyqpanda_alg
from pyqpanda_alg import VQE, HHL, QUBO
assert VQE is not None and HHL is not None and QUBO is not None
assert pyqpanda_alg.__file__ is not None
details = {'modules': sorted(name for name in vars(pyqpanda_alg) if not name.startswith('_')), 'operations': ['full upstream package initialization including VQE and HHL; no namespace trimming']}
` },
  { id: "qcover-optimization", distributions: ["Qcover"], code: `
import networkx as nx
from Qcover.core import Qcover
from Qcover.backends import CircuitByQulacs
models = []
for n in config['sizes']:
    graph = nx.cycle_graph(n)
    nx.set_node_attributes(graph, 0.3, 'weight')
    nx.set_edge_attributes(graph, -0.8, 'weight')
    solver = Qcover(graph=graph, p=2, backend=CircuitByQulacs(is_parallel=False))
    pieces = solver.graph_decomposition(2)
    assert len(pieces) > 0
    models.append({'sites': n, 'subgraphs': len(pieces)})
details = {'models': models, 'operations': ['custom graph', 'graph decomposition without optimization']}
` },
  { id: "spinqit-simulation", distributions: ["spinqit"], code: `
import spinqit as sq
models = []
for n in config['sizes']:
    circuit = sq.Circuit()
    qubits = circuit.allocateQubits(n)
    for j in range(n):
        circuit << (sq.Rx, qubits[j], 0.27 * (j+1))
    assert len(circuit.instructions) == n
    models.append({'qubits': n, 'instructions': len(circuit.instructions)})
details = {'models': models, 'operations': ['native circuit and rotations']}
` },
  { id: "vqnet-learning", distributions: ["pyvqnet"], code: `
import pyvqnet as vn
from pyvqnet.qnn import vqc
models = []
for n in config['sizes']:
    machine = vqc.QMachine(n, dtype=vn.kcomplex128)
    tensor = vn.QTensor(np.ones((n, 3)), dtype=vn.kfloat64, requires_grad=True)
    assert tuple(tensor.shape) == (n, 3)
    models.append({'qubits': n, 'tensorShape': list(tensor.shape)})
details = {'models': models, 'operations': ['native tensor', 'quantum machine']}
` },
  { id: "tenpy-ground-state", distributions: ["physics-tenpy"], code: `
from tenpy.models.hubbard import BoseHubbardChain
from tenpy.networks.mps import MPS
models = []
for n in config['sizes']:
    model = BoseHubbardChain(dict(L=n, Nmax=3, t=0.73, U=1.4, mu=-0.2, conserve='N'))
    state = MPS.from_product_state(model.lat.mps_sites(), [1] * n, bc='finite')
    assert model.lat.N_sites == n and state.L == n
    models.append({'sites': n, 'localDimension': model.lat.mps_sites()[0].dim})
assert all(m['localDimension'] == 4 for m in models)
details = {'models': models, 'operations': ['bosonic model', 'MPS construction']}
` },
  { id: "dynamiqs-dynamics", distributions: ["dynamiqs", "jax"], code: `
import dynamiqs as dq
import jax.numpy as jnp
models = []
for n in config['sizes']:
    a = dq.destroy(n)
    h = a.dag() @ a + 0.37 * (a + a.dag())
    drive = dq.modulated(lambda t: jnp.cos(0.23 * t), h)
    assert tuple(drive(0.0).shape) == (n, n)
    models.append({'dimension': n, 'shape': list(h.shape)})
details = {'models': models, 'operations': ['custom dimension', 'time-dependent operator']}
` },
  { id: "fatqat-workbench", distributions: ["fatqat", "qutip"], code: `
import fatqat
import qutip as qt
models = []
for n in config['sizes']:
    a = qt.destroy(n)
    h = qt.tensor(a.dag() * a, qt.qeye(3)) + 0.17 * qt.tensor(a + a.dag(), qt.num(3))
    state = qt.tensor(qt.basis(n, 1), qt.basis(3, 2))
    assert h.shape == (3*n, 3*n) and state.shape == (3*n, 1)
    qt.qsave({'hamiltonian': h, 'state': state}, str(output / f'model-{n}'))
    restored = qt.qload(str(output / f'model-{n}'))
    assert restored['hamiltonian'] == h
    models.append({'dimensions': [n, 3], 'shape': list(h.shape)})
details = {'models': models, 'operations': ['composite operator', 'native serialization']}
` },
  { id: "oqupy-dynamics", distributions: ["oqupy"], code: `
import oqupy
models = []
for n in config['sizes']:
    h = np.diag(np.linspace(-0.4, 0.7, n)).astype(complex)
    system = oqupy.TimeDependentSystem(lambda t: h * np.cos(t))
    correlations = oqupy.CustomCorrelations(lambda tau: 0.2 * np.exp(-abs(tau)))
    bath = oqupy.Bath(np.diag(np.arange(n)).astype(complex), correlations)
    assert system.dimension == n and bath.dimension == n
    models.append({'dimension': n})
details = {'models': models, 'operations': ['custom multilevel system', 'custom bath correlation']}
` },
  { id: "qec-memory-experiment", distributions: ["stim", "pymatching"], code: `
import stim
import pymatching
models = []
for n in config['sizes']:
    circuit = stim.Circuit()
    circuit.append('R', range(n))
    circuit.append('X_ERROR', range(n), 0.017)
    circuit.append('M', range(n))
    for j in range(n):
        circuit.append('DETECTOR', [stim.target_rec(-n+j)])
    circuit.append('OBSERVABLE_INCLUDE', [stim.target_rec(-1)], 0)
    restored = stim.Circuit(str(circuit))
    assert restored == circuit
    matching = pymatching.Matching.from_detector_error_model(circuit.detector_error_model())
    assert matching.num_detectors == n
    (output / f'custom-{n}.stim').write_text(str(circuit))
    models.append({'detectors': matching.num_detectors})
details = {'models': models, 'operations': ['custom detectors', 'DEM to matching graph']}
` },
  { id: "quantum-algorithms", distributions: ["qiskit", "pennylane", "quimb", "pyscf"], code: `
from qiskit import QuantumCircuit, qpy
from qiskit.circuit import Parameter
import pennylane as qml
import quimb.tensor as qtn
from pyscf import gto
models = []
for n in config['sizes']:
    circuit = QuantumCircuit(n)
    theta = Parameter('theta')
    for j in range(n):
        circuit.ry(theta * (j+1), j)
    with (output / f'custom-{n}.qpy').open('wb') as stream:
        qpy.dump(circuit, stream)
    with (output / f'custom-{n}.qpy').open('rb') as stream:
        assert qpy.load(stream)[0] == circuit
    observable = qml.sum(*(qml.PauliZ(j) * (j+1) for j in range(n)))
    tensors = [qtn.Tensor(np.ones((3,3)), inds=(f'b{j}', f'b{j+1}')) for j in range(n)]
    network = qtn.TensorNetwork(tensors)
    assert len(observable.wires) == n and network.num_tensors == n
    models.append({'qubits': n, 'tensors': network.num_tensors})
molecule = gto.M(atom='He 0 0 0', basis='sto-3g', verbose=0)
assert molecule.nelectron == 2
details = {'models': models, 'operations': ['parameterized circuit', 'QPY round trip', 'custom observable', 'tensor network', 'molecule construction without solver']}
` },
];

for (const fixture of cases) test(`native SDK engineering: ${fixture.id} accepts custom code and file artifacts`, { skip: !enabled, timeout: (fixture.timeout ?? 100000) + 20000 }, async t => {
  const sdk = await describeSdk(root, fixture.id);
  assert.equal(sdk.environmentState, "prepared", `Explicitly prepare ${fixture.id} first`);
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT;
  if (parent) await fs.mkdir(path.resolve(parent), { recursive: true });
  const output = await fs.mkdtemp(path.join(parent ? path.resolve(parent) : os.tmpdir(), `${fixture.id}-`));
  if (!parent) t.after(() => fs.rm(output, { recursive: true, force: true }));
  const program = path.join(output, "custom program.py");
  const input = path.join(output, "input.json");
  await fs.writeFile(input, JSON.stringify({ sizes: [3, 7] }));
  await fs.writeFile(path.join(output, "sdk.json"), JSON.stringify(sdk, null, 2));
  const prelude = `import json, sys, pathlib, importlib.util\nimport numpy as np\noutput = pathlib.Path.cwd()\nconfig = json.loads(pathlib.Path(sys.argv[1]).read_text())\n`;
  const evidence = path.join(root, ".agents/skills/quantum-sdk-workbench/references/evidence.py");
  const postlude = `\nnp.save(output / 'full-array.npy', np.zeros((1024, 384), dtype=np.float64))\n(output / 'api-objects.json').write_text(json.dumps(details))\nspec = importlib.util.spec_from_file_location('evidence', sys.argv[2])\nhelper = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(helper)\nhelper.write_evidence(output / 'execution.json', files=[file for file in output.iterdir() if file.is_file()], distributions=${JSON.stringify(fixture.distributions)}, argv=[sys.executable, *sys.argv[:2]], cwd=output, lock_sha256=sys.argv[3], execution_status='completed', backend='native SDK API construction; no research solver')\nprint(json.dumps({'status': 'completed', 'scientificValidation': 'not_evaluated'}))\n`;
  const bootstrap = sdk.bootstrap ? `spec = importlib.util.spec_from_file_location('sdk_bootstrap', ${JSON.stringify(sdk.bootstrap.path)})\nloader = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(loader)\nloader.prepare_sdk(${JSON.stringify(fixture.id)})\n` : "";
  await fs.writeFile(program, prelude + bootstrap + fixture.code + postlude);
  const result = await run(sdk.run.command, ["-B", program, input, evidence, sdk.lock.sha256], { cwd: output, timeout: fixture.timeout ?? 100000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, MPLBACKEND: "Agg", MPLCONFIGDIR: path.join(output, "mpl"), NUMBA_CACHE_DIR: path.join(output, "numba"), OMP_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2" } });
  assert.equal(JSON.parse(result.stdout.trim().split("\n").at(-1)).status, "completed");
  const record = JSON.parse(await fs.readFile(path.join(output, "execution.json"), "utf8"));
  assert.equal(record.dependencyLockSha256, sdk.lock.sha256);
  assert.equal(record.scientificValidation, "not_evaluated");
  assert.ok((await fs.stat(path.join(output, "full-array.npy"))).size > 2 * 1024 * 1024);
  // A second arbitrary user script fails; preserve its partial output and diagnostic.
  const failed = path.join(output, "failure.py");
  await fs.writeFile(failed, "from pathlib import Path\nPath('partial.txt').write_text('retain for debugging')\nraise ValueError('user-program-diagnostic')\n");
  await assert.rejects(run(sdk.run.command, ["-B", failed], { cwd: output, timeout: 10000 }), error => error.code === 1 && error.stderr.includes("user-program-diagnostic"));
  assert.equal(await fs.readFile(path.join(output, "partial.txt"), "utf8"), "retain for debugging");
  t.diagnostic(`Evidence: ${output}`);
});

test("native SDK host process can stop and resume a saved user program", { skip: !enabled, timeout: 15000 }, async t => {
  const sdk = await describeSdk(root, "quantum-algorithms");
  assert.equal(sdk.environmentState, "prepared");
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "oq sdk cancellation "));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const program = path.join(output, "checkpoint.py");
  await fs.writeFile(program, "import pathlib, sys, time\np = pathlib.Path('checkpoint.txt')\nif '--resume' in sys.argv:\n assert p.read_text() == 'saved'\n p.write_text('resumed')\nelse:\n p.write_text('saved')\n time.sleep(30)\n");
  await assert.rejects(run(sdk.run.command, [program], { cwd: output, timeout: 1500 }), error => error.killed === true);
  assert.equal(await fs.readFile(path.join(output, "checkpoint.txt"), "utf8"), "saved");
  await run(sdk.run.command, [program, "--resume"], { cwd: output, timeout: 5000 });
  assert.equal(await fs.readFile(path.join(output, "checkpoint.txt"), "utf8"), "resumed");
});
