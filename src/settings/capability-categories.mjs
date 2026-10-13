// Presentation metadata only. Categories never activate a Skill, Tool or service.
const groups = [
  ["circuits", "电路与编译", `
    quantum-sdk-workbench qiskit-circuit-workbench quantum-circuit-verification
    qiskit-ibm-transpiler qiskit-gym tyxonq-workbench pyzx-optimization graphix-mbqc
    qcut-knitting compact-optimization cqlib-kernel flagquantum-workbench qbraid-conversion
    pytket-compilation pyquil-simulation spinqit-simulation qutrunk-simulation
    iqm-circuit-workbench qoolqit-workbench superstaq-compilation qsteed-compilation
    qcompute-simulation qibo-simulation braket-simulation quri-parts-estimation
    qdk-resource-estimation qualtran-resources mqt-ddsim mqt-qmap classiq-synthesis
    cudaq-simulation guppy-programs oqc-qat mimiq-simulation myqlm-simulation
  `],
  ["algorithms", "算法与优化", `
    qpanda-qubo flow-vqe quantum-discrete-log quantum-shor quantum-simon
    quantum-guide-algorithms-cryptography quantum-guide-algorithms-eigensolvers
    quantum-numpy-minimum-eigensolver quantum-numpy-eigensolver quantum-vqd
    quantum-guide-algorithms-gradients quantum-finite-difference quantum-linear-combination
    quantum-parameter-shift quantum-reverse quantum-spsa
    quantum-guide-algorithms-linear-systems quantum-aqc quantum-hhl quantum-lcu
    quantum-qsvt-qlsa quantum-qft quantum-qsp quantum-vqls
    quantum-guide-algorithms-primitives quantum-amplitude-amplification
    quantum-amplitude-estimation quantum-grover quantum-hadamard-test
    quantum-hadamard-transform quantum-qpe quantum-qaoa quantum-vqe
    quantum-guide-algorithms-search quantum-glued-trees quantum-hidden-shift
    quantum-guide-algorithms-state-preparation quantum-mottonen quantum-multiplexer
    quantum-superposition quantum-algorithms ocean-optimization kaiwu-qubo
    qrisp-arithmetic qcover-optimization
  `],
  ["simulation", "模拟与化学", `
    hamiltonian-simulation sqd-chemistry tjm-dynamics tenpy-ground-state
    quantum-ground-state dynamiqs-dynamics oqupy-dynamics symmer-tapering
    openqarp-excited-states pairinteraction-rydberg
    quantum-guide-algorithms-hamiltonian-simulation quantum-cartan quantum-qdrift
    quantum-hamiltonian-qsp quantum-taylor quantum-trotter
    quantum-guide-algorithms-quantum-chemistry quantum-molecular-dmrg
    quantum-fermi-hubbard-vqe quantum-ising quantum-guide-algorithms-schrodingerization
    quantum-advection quantum-heat-1d quantum-heat-2d quantum-mps
    bloqade-analog perceval-photonics pulser-dynamics lightworks-photonics
    openfermion-mapping pychemiq-chemistry mrmustard-optics
  `],
  ["qec", "纠错与噪声", `
    qec-memory-experiment mitiq-error-mitigation ldpc-decoding clifft-sampling
    deltakit-qec quantum-qldpc alicebob-cat-circuits
  `],
  ["learning", "量子机器学习", `
    quantum-guide-algorithms-quantum-machine-learning quantum-cvqnn quantum-qcbm
    quantum-vqc pennylane-differentiable deepquantum-differentiable
    tensorcircuit-differentiable mindquantum-differentiable vqnet-learning merlin-learning
  `],
  ["hardware", "硬件与实验", `
    qiskit-ibm-runtime qpanda-runtime quantum-hardware fieldqkit-hardware
    fatqat-workbench qmclaw-workbench qdmi-device pasqal-experiments ionq-programs
    qctrl-workbench qua-programs laboneq-control qblox-scheduling qililab-control
    aqt-workbench oqc-cloud quantuminspire-cloud
  `],
  ["information", "量子信息与网络", `
    quantum-information-audit randomized-measurements paulie-algebra quantum-qfi
    quantum-pauli quairkit-information netqasm-network simqn-network
  `],
  ["reference", "资料与辅助", `
    quantum-practices quantum-learning quantum-sdk-advisor platform-diagnostics
    metriq-data qcarchive-query quantum-guide-algorithms quantum-guide-simulators
    quantum-guide-simulators-pennylane quantum-guide-simulators-qiskit
    quantum-guide-simulators-unitarylab
  `],
];

export const CAPABILITY_CATEGORIES = Object.freeze([
  ...groups.map(([id, title]) => Object.freeze({ id, title })),
  Object.freeze({ id: "other", title: "其他与自定义" }),
]);
export const CAPABILITY_CATEGORY_IDS = Object.freeze(Object.fromEntries(
  groups.flatMap(([category, , ids]) => ids.trim().split(/\s+/).map(id => [id, category])),
));

export function capabilityCategory(id) {
  return Object.hasOwn(CAPABILITY_CATEGORY_IDS, id) ? CAPABILITY_CATEGORY_IDS[id] : "other";
}

export function providerCategory(capabilities) {
  const categories = [...new Set(capabilities.map(item => capabilityCategory(item.id)))];
  // A shared native provider can serve several subjects; its Tools keep their own categories.
  return categories.length === 1 ? categories[0] : categories.length ? "reference" : "other";
}

export function mcpCategories(packages) {
  return Object.assign(Object.create(null), Object.fromEntries(packages.flatMap(item => (item.execution?.mcpServers ?? [])
    .map(server => [server.name, server.name === "qiskit_docs" ? "reference" : capabilityCategory(item.id)]))));
}
