# UnitaryLab 开源适配覆盖表

66 份上游指南逐项对应原生 Skill，其中 49 项算法工作流带可执行示例；覆盖原算法仓库的全部 39 个模块。其余 17 项是分类、后端或开源迁移指南。

这张表说明工作流与模块覆盖，不表示兼容上游 Python API 的所有参数、优化器和后端。每项实际方法、范围和替换差异以 Skill 与 [coverage.json](../../examples/quantum-algorithms/coverage.json) 为准。

| 上游指南 | 本地 Skill | 运行示例 | 上游算法模块 |
| --- | --- | --- | --- |
| `algorithms` | [quantum-guide-algorithms](../../.agents/skills/quantum-guide-algorithms/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/cryptography` | [quantum-guide-algorithms-cryptography](../../.agents/skills/quantum-guide-algorithms-cryptography/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/cryptography/discretelog` | [quantum-discrete-log](../../.agents/skills/quantum-discrete-log/SKILL.md) | `discrete_log` | `cryptology/discrete_log/algorithm.py` |
| `algorithms/cryptography/shor` | [quantum-shor](../../.agents/skills/quantum-shor/SKILL.md) | `shor` | `cryptology/shor/algorithm.py` |
| `algorithms/cryptography/simon` | [quantum-simon](../../.agents/skills/quantum-simon/SKILL.md) | `simon` | `cryptology/simon/algorithm.py` |
| `algorithms/eigensolvers` | [quantum-guide-algorithms-eigensolvers](../../.agents/skills/quantum-guide-algorithms-eigensolvers/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/eigensolvers/minimum-eigensolvers/numpy-minimum-eigensolver` | [quantum-numpy-minimum-eigensolver](../../.agents/skills/quantum-numpy-minimum-eigensolver/SKILL.md) | `numpy_minimum_eigensolver` | quantum-skills 独有指南 |
| `algorithms/eigensolvers/numyeigensolver` | [quantum-numpy-eigensolver](../../.agents/skills/quantum-numpy-eigensolver/SKILL.md) | `numpy_eigensolver` | quantum-skills 独有指南 |
| `algorithms/eigensolvers/vqd` | [quantum-vqd](../../.agents/skills/quantum-vqd/SKILL.md) | `vqd` | quantum-skills 独有指南 |
| `algorithms/gradients` | [quantum-guide-algorithms-gradients](../../.agents/skills/quantum-guide-algorithms-gradients/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/gradients/finite-difference` | [quantum-finite-difference](../../.agents/skills/quantum-finite-difference/SKILL.md) | `finite_difference` | quantum-skills 独有指南 |
| `algorithms/gradients/linear-combination` | [quantum-linear-combination](../../.agents/skills/quantum-linear-combination/SKILL.md) | `linear_combination` | quantum-skills 独有指南 |
| `algorithms/gradients/parameter-shift` | [quantum-parameter-shift](../../.agents/skills/quantum-parameter-shift/SKILL.md) | `parameter_shift` | quantum-skills 独有指南 |
| `algorithms/gradients/qfi` | [quantum-qfi](../../.agents/skills/quantum-qfi/SKILL.md) | `qfi` | quantum-skills 独有指南 |
| `algorithms/gradients/reverse` | [quantum-reverse](../../.agents/skills/quantum-reverse/SKILL.md) | `reverse` | quantum-skills 独有指南 |
| `algorithms/gradients/spsa` | [quantum-spsa](../../.agents/skills/quantum-spsa/SKILL.md) | `spsa` | quantum-skills 独有指南 |
| `algorithms/hamiltonian-simulation` | [quantum-guide-algorithms-hamiltonian-simulation](../../.agents/skills/quantum-guide-algorithms-hamiltonian-simulation/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/hamiltonian-simulation/cartan` | [quantum-cartan](../../.agents/skills/quantum-cartan/SKILL.md) | `cartan` | `hamiltonian_simulation/cartan/algorithm.py` |
| `algorithms/hamiltonian-simulation/qdrift` | [quantum-qdrift](../../.agents/skills/quantum-qdrift/SKILL.md) | `qdrift` | `hamiltonian_simulation/qdrift/algorithm.py` |
| `algorithms/hamiltonian-simulation/qsp` | [quantum-hamiltonian-qsp](../../.agents/skills/quantum-hamiltonian-qsp/SKILL.md) | `hamiltonian_qsp` | `hamiltonian_simulation/qsp/algorithm.py` |
| `algorithms/hamiltonian-simulation/taylor` | [quantum-taylor](../../.agents/skills/quantum-taylor/SKILL.md) | `taylor` | `hamiltonian_simulation/taylor/algorithm.py` |
| `algorithms/hamiltonian-simulation/trotter` | [quantum-trotter](../../.agents/skills/quantum-trotter/SKILL.md) | `trotter` | `hamiltonian_simulation/trotter/algorithm.py` |
| `algorithms/linear-systems` | [quantum-guide-algorithms-linear-systems](../../.agents/skills/quantum-guide-algorithms-linear-systems/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/linear-systems/aqc` | [quantum-aqc](../../.agents/skills/quantum-aqc/SKILL.md) | `aqc` | `linear_algebra/aqc/algorithm.py` |
| `algorithms/linear-systems/hhl` | [quantum-hhl](../../.agents/skills/quantum-hhl/SKILL.md) | `hhl` | `linear_algebra/hhl/algorithm.py` |
| `algorithms/linear-systems/lcu` | [quantum-lcu](../../.agents/skills/quantum-lcu/SKILL.md) | `lcu` | `linear_algebra/lcu/algorithm.py` |
| `algorithms/linear-systems/qsvt-qlsa` | [quantum-qsvt-qlsa](../../.agents/skills/quantum-qsvt-qlsa/SKILL.md) | `qsvt_qlsa` | `linear_algebra/qsvt_qlsa/algorithm.py` |
| `algorithms/linear-systems/quantum-fourier-transform` | [quantum-qft](../../.agents/skills/quantum-qft/SKILL.md) | `qft` | `linear_algebra/qft/algorithm.py` |
| `algorithms/linear-systems/quantum-signal-processing` | [quantum-qsp](../../.agents/skills/quantum-qsp/SKILL.md) | `qsp` | `linear_algebra/qsp/algorithm.py` |
| `algorithms/linear-systems/vqls` | [quantum-vqls](../../.agents/skills/quantum-vqls/SKILL.md) | `vqls` | `linear_algebra/vqls/algorithm.py` |
| `algorithms/primitives` | [quantum-guide-algorithms-primitives](../../.agents/skills/quantum-guide-algorithms-primitives/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/primitives/amplitude-amplification` | [quantum-amplitude-amplification](../../.agents/skills/quantum-amplitude-amplification/SKILL.md) | `amplitude_amplification` | `fundamental_algorithm/amplitude_amplification/algorithm.py` |
| `algorithms/primitives/amplitude-estimation` | [quantum-amplitude-estimation](../../.agents/skills/quantum-amplitude-estimation/SKILL.md) | `amplitude_estimation` | `fundamental_algorithm/amplitude_estimation/algorithm.py` |
| `algorithms/primitives/grover` | [quantum-grover](../../.agents/skills/quantum-grover/SKILL.md) | `grover` | `fundamental_algorithm/grover/algorithm.py` |
| `algorithms/primitives/hadamard-test` | [quantum-hadamard-test](../../.agents/skills/quantum-hadamard-test/SKILL.md) | `hadamard_test` | `fundamental_algorithm/hadamard_test/algorithm.py` |
| `algorithms/primitives/hadamard-transform` | [quantum-hadamard-transform](../../.agents/skills/quantum-hadamard-transform/SKILL.md) | `hadamard_transform` | `fundamental_algorithm/hadamard_transform/algorithm.py` |
| `algorithms/primitives/quantum-phase-estimation` | [quantum-qpe](../../.agents/skills/quantum-qpe/SKILL.md) | `qpe` | `fundamental_algorithm/qpe/algorithm.py` |
| `algorithms/quantum-chemistry` | [quantum-guide-algorithms-quantum-chemistry](../../.agents/skills/quantum-guide-algorithms-quantum-chemistry/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/quantum-chemistry/molecular-dmrg` | [quantum-molecular-dmrg](../../.agents/skills/quantum-molecular-dmrg/SKILL.md) | `molecular_dmrg` | `quantum_chemistry/molecular_dmrg/algorithm.py` |
| `algorithms/quantum-error-correction` | [quantum-qldpc](../../.agents/skills/quantum-qldpc/SKILL.md) | `qldpc` | quantum-skills 独有指南 |
| `algorithms/quantum-machine-learning` | [quantum-guide-algorithms-quantum-machine-learning](../../.agents/skills/quantum-guide-algorithms-quantum-machine-learning/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/quantum-machine-learning/cvqnn` | [quantum-cvqnn](../../.agents/skills/quantum-cvqnn/SKILL.md) | `cvqnn` | `quantum_machine_learning/cvqnn/algorithm.py` |
| `algorithms/quantum-machine-learning/fermi-hubbard-vqe` | [quantum-fermi-hubbard-vqe](../../.agents/skills/quantum-fermi-hubbard-vqe/SKILL.md) | `fermi_hubbard_vqe` | `quantum_machine_learning/fermi_hubbard_vqe/algorithm.py` |
| `algorithms/quantum-machine-learning/ising` | [quantum-ising](../../.agents/skills/quantum-ising/SKILL.md) | `ising` | `quantum_machine_learning/ising/algorithm.py` |
| `algorithms/quantum-machine-learning/qaoa` | [quantum-qaoa](../../.agents/skills/quantum-qaoa/SKILL.md) | `qaoa` | `quantum_machine_learning/qaoa/algorithm.py` |
| `algorithms/quantum-machine-learning/qcbm` | [quantum-qcbm](../../.agents/skills/quantum-qcbm/SKILL.md) | `qcbm` | `quantum_machine_learning/qcbm/algorithm.py` |
| `algorithms/quantum-machine-learning/vqc` | [quantum-vqc](../../.agents/skills/quantum-vqc/SKILL.md) | `vqc` | `quantum_machine_learning/vqc/algorithm.py` |
| `algorithms/quantum-machine-learning/vqe` | [quantum-vqe](../../.agents/skills/quantum-vqe/SKILL.md) | `vqe` | `quantum_machine_learning/vqe/algorithm.py` |
| `algorithms/schrodingerization` | [quantum-guide-algorithms-schrodingerization](../../.agents/skills/quantum-guide-algorithms-schrodingerization/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/schrodingerization/advection-schrodingerization` | [quantum-advection](../../.agents/skills/quantum-advection/SKILL.md) | `advection` | `schrodingerization/equation_advection/algorithm.py` |
| `algorithms/schrodingerization/heat-1d-schrodingerization` | [quantum-heat-1d](../../.agents/skills/quantum-heat-1d/SKILL.md) | `heat_1d` | `schrodingerization/equation_heat/algorithm.py` |
| `algorithms/schrodingerization/heat-2d-schrodingerization` | [quantum-heat-2d](../../.agents/skills/quantum-heat-2d/SKILL.md) | `heat_2d` | `schrodingerization/equation_heat2d/algorithm.py` |
| `algorithms/search` | [quantum-guide-algorithms-search](../../.agents/skills/quantum-guide-algorithms-search/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/search/glued-trees` | [quantum-glued-trees](../../.agents/skills/quantum-glued-trees/SKILL.md) | `glued_trees` | `search/glued_trees/algorithm.py` |
| `algorithms/search/hidden-shift` | [quantum-hidden-shift](../../.agents/skills/quantum-hidden-shift/SKILL.md) | `hidden_shift` | `search/hidden_shift/algorithm.py` |
| `algorithms/state-preparation` | [quantum-guide-algorithms-state-preparation](../../.agents/skills/quantum-guide-algorithms-state-preparation/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `algorithms/state-preparation/mottonen` | [quantum-mottonen](../../.agents/skills/quantum-mottonen/SKILL.md) | `mottonen` | `state_preparation/mottonen/algorithm.py` |
| `algorithms/state-preparation/mps` | [quantum-mps](../../.agents/skills/quantum-mps/SKILL.md) | `mps` | `state_preparation/mps/algorithm.py` |
| `algorithms/state-preparation/multiplexer` | [quantum-multiplexer](../../.agents/skills/quantum-multiplexer/SKILL.md) | `multiplexer` | `state_preparation/multiplexer/algorithm.py` |
| `algorithms/state-preparation/pauli` | [quantum-pauli](../../.agents/skills/quantum-pauli/SKILL.md) | `pauli` | `state_preparation/pauli/algorithm.py` |
| `algorithms/state-preparation/superposition` | [quantum-superposition](../../.agents/skills/quantum-superposition/SKILL.md) | `superposition` | `state_preparation/Superposition/algorithm.py` |
| `root` | [quantum-algorithms](../../.agents/skills/quantum-algorithms/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `simulators` | [quantum-guide-simulators](../../.agents/skills/quantum-guide-simulators/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `simulators/pennylane` | [quantum-guide-simulators-pennylane](../../.agents/skills/quantum-guide-simulators-pennylane/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `simulators/qiskit` | [quantum-guide-simulators-qiskit](../../.agents/skills/quantum-guide-simulators-qiskit/SKILL.md) | 分类/后端工作流 | quantum-skills 独有指南 |
| `simulators/unitarylab` | [quantum-guide-simulators-unitarylab](../../.agents/skills/quantum-guide-simulators-unitarylab/SKILL.md) | 开源迁移指引 | quantum-skills 独有指南 |
