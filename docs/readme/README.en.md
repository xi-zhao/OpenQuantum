<h1 align="center">
  <img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><strong>For AI-assisted research, OpenQuantum is all you need.</strong><br /><sub>Start with a quantum problem and put specialist methods and computing tools to work with AI</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum is an open-source quantum agent and application platform that helps you use AI for concrete research tasks. Start with a research question, a paper's method or an existing program. Ask the agent to write and run calculations with specialist software, inspect the outputs, then adjust inputs or compare methods.

**Complete one task, then bring the method to your own question.** Start with a supported circuit simulation, ground-state calculation or dynamics analysis. Run an example, change its inputs and inspect the results. Keep code, parameters and outputs for your next investigation.

Choose between two installation options that share the same domain capabilities: the **[Codex plugin](../integrations/CODEX_PLUGIN.md)** brings quantum Skills and scientific Tools into native Codex conversations, with a side panel for capability switches, MCP connections and tokens; **Desktop** includes the research workbench and the separate Quantum Learning application, with model services you configure yourself.

**[Install the Codex plugin](#codex)** · [Install Desktop](#desktop-installer) · [See calculations and results](#use-and-inspect-results)

**Start with a measured case:** [Use OpenQuantum to optimize a PennyLane calculation and check the results](#pennylane-rust-case), with a **5.09× speedup for the complete call** on the representative task.

[Why OpenQuantum](#why-openquantum) · [PennyLane case](#pennylane-rust-case) · [Capabilities](#what-you-can-do) · [Quick start](#quick-start) · [Results](#use-and-inspect-results) · [Extend](#extend-the-platform) · [Roadmap](#roadmap-and-rsi) · [Contribute](#documentation-and-support) · [Open source](#license-and-acknowledgments)

**OpenQuantum 0.8.3 is available:** [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) · [Codex plugin](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.3). Both use the same product version. Tools, MCP and Skills have eight use categories, search and status filters. Desktop launchers now use the OpenQuantum icon.

![OpenQuantum Desktop research workbench](../images/openquantum-desktop-20261013.jpg)

The research workbench is the platform's conversational and computational entry point. Quantum Learning is one integrated application, with its own classroom interface and data boundary.

## Why OpenQuantum

For your first attempt at AI-assisted research, start with an existing example. If you already have a quantum model or program, change inputs, compare methods and inspect the outputs. OpenQuantum brings specialist software and research methods into your agent workflow, helping you work from concrete questions and keep material for review and reuse. Local calculations, teaching experiments and method validation have practical value today, without depending on a QPU demonstrating an advantage.

### Improve open-source tools for research with AI

We work with open-source tools including Qiskit, PennyLane, PyZX, TeNPy and Stim / PyMatching, improving environment preparation, agent access, research workflows and result checks. Installing OpenQuantum lets you reuse this work, so AI can start with specialist methods and runnable programs, then adapt, compare and optimize them for your question.

This work connects method selection, program execution, comparisons and result checks, reducing repeated setup of tools and workflows. Performance improvements also come with measured evidence: the [PennyLane case](#pennylane-rust-case) reduced a research calculation's complete call from **30.62 ms to 6.02 ms, a 5.09× speedup**, with result checks and reproduction records.

### Start with a question, use specialist tools

**Turn a research question into exploration.** You can begin a supported task without first learning every SDK: Skills supply methods, the agent calls specialist Tools, and the workbench records inputs and results. We aim to reduce repeated setup, interface learning and workflow construction so learners can experiment and researchers can spend more time forming hypotheses, designing comparisons and judging results. These judgments remain yours.

**Create new research space by combining tools.** PyZX circuit optimization, QCEC equivalence checking and noise simulation answer different questions. Applied to one research goal, they let you ask whether a simpler ideal circuit also behaves better under noise. We are developing scientifically meaningful combinations by aligning models, units, bit order and budgets, and understanding when methods apply or fail. Connecting interfaces alone does not establish a conclusion. See each tool's current scope in the [computing guide](../integrations/SCALABLE_BRIDGES.md).

### Make one investigation the start of the next

**Leave experience that others can build on.** Reusable steps, calculation results and applicable independent checks support review and further work. We want to preserve method comparisons and failure evidence together with their conditions: why a method applies, and when to take a different route. Well-supported negative results are useful; a program error is not a scientific refutation. Complete scientific acceptance is available only within the [scope of the relevant capabilities](../../README.md#执行记录与科学验收), and organizing experience does not mean the system has learned automatically.

### Make your methods useful to others

**Help others continue creating from a research result.** A method can become a Skill, a calculation program can become a Tool, and a complete application can keep its own interface and workflows. Researchers, teachers, developers, and software or hardware partners can contribute their expertise without rebuilding the entire platform. We want existing work to enter new courses, investigations and applications. [Quantum Learning](#quantum-learning) is one current application entry point.

**Keep choice with users and contributors.** Open implementations and extension interfaces let you inspect, modify and maintain your own combination. Model services and computing backends are configured separately, so applications need not be tied to one model or device. Upstream authors, licenses and contributions remain visible; users decide whether to share research data. Our goal is to preserve professional methods that remain useful as models, computing resources and research directions change.

An investigation that becomes possible, a method applied to a new problem, or a contributor creating an application are all forms of value we want to accumulate. The next step is to make that experience improve the [capabilities used in the next round of research](#research-that-improves-how-research-is-done).

<a id="pennylane-rust-case"></a>

## Measured case: a 5.09× faster PennyLane calculation

**Set a research task and get a runnable result you can check.** We gave OpenQuantum a task: optimize a PennyLane research calculation, measure the actual speedup and verify the results. On 2026-10-20, we completed the experiment using OpenQuantum 0.8.4 within Codex, producing an optimized program, a performance comparison, correctness checks and records for reproduction.

| Calculation | Complete call |
| --- | ---: |
| Native PennyLane | 30.62 ms |
| Optimized | **6.02 ms** |

**A 5.09× speedup for the complete call.** The measured task was one Pauli commutator calculation for a 32-qubit local model. These are medians of nine warm rounds on an Apple M4 with PennyLane 0.45.1. Timings include input and output conversion; environment preparation and compilation are excluded.

**The results were checked too.** Outputs for all nine benchmark inputs agreed exactly, term by term, with PennyLane references. Independent matrices checked all **4,368 pairs of 1–3-qubit Pauli words**, plus 40 random complex-coefficient operator pairs, with a maximum matrix absolute error of **1.42×10⁻¹⁴**. The calculations and timings underwent independent review. All **405 raw timing samples** and the complete inputs and outputs are retained.

The 5.09× result applies to the specified calculation. The case report provides all measured results, methods and supported scope.

[Full case and reproduction steps](../../experiments/pennylane-rust-commutator/README.md) · [Raw timings](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [Result checks](../../experiments/pennylane-rust-commutator/results/validation.json) · [Independent review](../../experiments/pennylane-rust-commutator/results/review.md)

## What you can do

| Area | Available tools and results |
| --- | --- |
| Algorithm examples | QFT/QPE, Grover/Shor, HHL/VQLS/QSVT, VQE/VQD/QAOA, gradients, state preparation, DMRG, qLDPC and Schrödingerization examples; editable inputs and method-specific checks |
| Hamiltonian simulation | Trotter–Suzuki and qDrift for Pauli Hamiltonians; circuits, resource metrics, states and optional independent matrix references |
| Circuits | Qiskit and TyxonQ circuit creation, analysis, transpilation and local simulation; MQT QCEC equivalence checks; optional FlagQuantum circuit workbench |
| Local compilation and simulation | TKET, QSteed and MQT QMAP compilation or mapping; Braket LocalSimulator, QCompute, Qibo and other local simulators; explicit gate sets and bit-order conventions |
| Differentiable and hybrid programs | PennyLane, DeepQuantum, TensorCircuit, MindQuantum and VQNet expectations and gradients; Guppy / Selene measurement, reset and classical feedback |
| Fault-tolerant resources | Microsoft QDK physical-resource estimates and Qualtran Bloq gate counts, with hardware and decomposition assumptions |
| Local interoperability | qBraid Qiskit/Cirq unitary-circuit conversion through QASM2, Clifft intermediate measurements and raw detector/observable parities, and optional QDMI metadata queries through a configured C driver |
| Optimization and algebra | PyZX rewriting, Graphix measurement-based computing, Symmer symmetry tapering and PauLie Lie algebra calculations |
| Circuit optimization and cutting | Compact optimization with independent equivalence checks; QCut gate cutting and expectation reconstruction with sampling costs and an optional uncut reference |
| Ground states and chemistry | A bounded two-qubit VQE example, TeNPy spin-chain DMRG, SQD active-space chemistry and Flow-VQE parameter learning |
| Excited states and kernel classification | OpenQARP VQD low-energy states, residuals and orthogonality checks; optional cqlib-qml angle-kernel QSVM with held-out test results and classical baselines |
| Quantum information | toqito density-matrix and entanglement checks; RandomMeas subsystem-purity estimates |
| Error mitigation and correction | Mitiq ZNE, REM, PEC and CDR; Stim and PyMatching memory experiments; Deltakit code construction; BP+LSD decoding |
| Dynamics | Dynamiqs driven dissipative qubits, OQuPy non-Markovian evolution, TJM open Ising chains and Clifft noisy sampling |
| Optimization problems | QPanda QUBO compilation, constraint checks and local solving |
| Superconducting and atomic systems | FatQat local experiments and transmon leakage; Bloqade Analog / Pulser supported atom-array and pulse simulations |
| Pulse programs and control | QUA, LabOne Q, Qblox Scheduler, Qililab and OQC QAT program construction, scheduling and offline compilation; no laboratory-device execution through these adapters |
| Photonics and learning | Perceval and Lightworks linear-optical probabilities; MerLin batch inference and phase gradients; optional MrMustard Gaussian models |
| Quantum networks | SimQN link loss and decoherence; NetQASM two-node program compilation, with separately prepared licensed dependencies required for SquidASM simulation |
| Chemistry operators and data | OpenFermion / pyChemiQ fermion-to-Pauli mappings and optional read-only QCArchive single-point record queries through QCPortal |
| Hardware and reference material | FieldQKit backend discovery; optional cloud job interfaces; fixed Metriq records and Quantum-Practices guides |
| Learning and teaching | Materials, slides, interactive classrooms and project-based learning through Quantum Learning |

The table describes source `main`. QCut, Compact and OpenQARP connections are enabled by default; cqlib-qml and FlagQuantum are disabled until selected. Dependencies still need preparation. See the [integration guide and verification scope](../integrations/CANDIDATE_LIBRARIES.md).

All **66 quantum-skills guides** have native Skill adaptations; **49 executable workflows** cover the **39 upstream algorithm modules** and additional methods from the guides. They use Qiskit, PennyLane, quimb, PySCF and NumPy/SciPy, with no proprietary UnitaryLab runtime dependency. Coverage describes workflows, not complete upstream Python API or backend compatibility. See the [per-method mapping and differences](../integrations/UNITARYLAB_OPEN_COVERAGE.md).

The source inventory contains **157 Skills** (144 automatically selectable and 13 manual category indexes), **91 MCP connections** and **5 native quantum Tools**. Session availability depends on enabled connections and prepared environments. See the [capability catalog](../../README.md#能力接口目录) and [selection guide](../integrations/CAPABILITY_SELECTION.md).

Since v0.8.1, OpenQuantum provides native public API access for **85 SDK/source environments**. Agents can write custom programs, combine APIs and save complete artifacts beyond the convenience tools’ preset cases. Prepare dependencies explicitly for each task; platform, account, license and optional-backend limits still apply. See the [full SDK integration record](../integrations/FULL_SDK_ACCESS.md) for engineering checks. Real research-task acceptance was not performed; `scientificValidation=not_evaluated`.

v0.6.0 brings together **52 SDK capability packages across three integration batches**: [17 vendor SDKs](../integrations/VENDOR_SDKS.md), [20 company and research-institution capabilities](../integrations/SDK_EXPANSION.md), and [15 network, control, optics and cloud interfaces](../integrations/SDK_GAPS.md). Each adapter exposes the documented actions, rather than the whole upstream API. Users configure accounts, credentials, service permissions and applicable licenses. New adapters retain L1 / `scientificValidation=not_evaluated`; local and protocol-fixture tests do not establish live cloud, QPU or scientific acceptance.

[Bloqade Analog](../integrations/BLOQADE_ANALOG.md) adds local Python simulation of 2D Rydberg arrays with piecewise-linear global amplitude, detuning and phase. Prepare its pinned environment with `npm run capability:bloqade:setup`; the Tool returns site populations, final amplitudes and probabilities with explicit units. This interface does not submit cloud or QPU jobs.

Each integration has its own installation requirements and scientific scope. Local results do not establish hardware performance, and a completed tool call does not automatically imply scientific acceptance. See the [detailed capability catalog](../../README.md#可以用它做什么) and [integration documentation](../README.md).

For one capability, run `node scripts/setup-paper-tools.mjs <capability-id>`. Batch setup commands are `npm run capability:vendor-sdks:setup` (17 environments), `npm run capability:sdk-expansion:setup` (14 default environments), and `npm run capability:sdk-gaps:setup` (7 default environments). The linked guides list optional environments, activation and platform requirements; setup does not configure cloud credentials.

### Quantum Learning

Prepare materials, edit courseware, learn in interactive classrooms and continue project-based activities. The application keeps its own teaching workflows and local course storage.

Course resources are still being organized; a complete curriculum and full acceptance of the online AI teaching workflows remain unfinished. Teaching tasks do not automatically use the research workbench’s quantum tools. See the [learning application and its scope](../../README.md#量子学习通).

## Quick start

OpenQuantum supports an upstream Desktop with a capability package and source builds for local, single-user use. Choose Desktop, the Codex plugin or a source build below.

### Desktop installer

OpenQuantum 0.8.3 uses the original [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) with an OpenQuantum capability archive. Harness stays at `0.1.5-rc.1`. The archive includes Node.js and uv; install it using `install.command` on Mac or `install.cmd` on Windows. Branding, quantum components, Quantum Learning and OpenQuantum updates are retained with minimal changes to the upstream interface. Follow the [installation and upgrade guide](../DESKTOP_INSTALLERS.md).

Install the original DSH Desktop first. Download the Mac Apple Silicon, Mac Intel or Windows x64 capability archive from the [0.8.3 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) and verify it against `SHA256SUMS` before extracting it. The installer creates an `OpenQuantum.app` on Mac or `OpenQuantum.lnk` on Windows with the OpenQuantum icon. The original Desktop keeps its upstream name and version. Upgrades preserve existing Skills, model routes and MCP settings; compute environments and Quantum Learning still require their documented preparation.

### Codex

[Download the 0.8.3 complete installer](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.3/openquantum-0.8.3-codex-install.zip) and follow the [installation guide](../integrations/CODEX_AGENT_INSTALL.md). The plugin includes 134 Skills and 71 scientific Tools, used through native Codex conversations. It requires a compatible Codex host, Node.js 24+ and npm; prepare scientific dependencies as needed.

### From source

Install Git, Node.js 24 or newer, and [uv](https://docs.astral.sh/uv/getting-started/installation/) for Python quantum tools. Individual capabilities may need additional dependencies.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Open the login URL printed by the launcher. After authentication, the browser opens the workbench at `http://127.0.0.1:3000`.

### Desktop

To build Desktop from the same source checkout, complete the source installation above and prepare Corepack and system C++ build tools.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

When launched from the same source checkout, Web and Desktop share the same Harness home and configuration. Close the other host before opening the same home. See [desktop installation and platform requirements](../DEPLOYMENT.md).

### Configure a model

Open **Settings → Models**. Add an OpenAI-compatible Chat Completions provider, enter its endpoint, model name and API key, and use the OpenQuantum agent preset. The model must support **Tool Calling** to execute quantum tools.

A fresh Desktop installation has an empty model list. Add your own service in settings. Model credentials are separate from quantum cloud credentials. Existing secrets are not displayed in settings; configuration stores credential references.

No model key is needed for the fixed local reference example:

```bash
npm run demo:quantum-ground-state
```

The repository records a local check of this bounded two-qubit Hamiltonian at approximately `-1.85727503 Ha`. This is evidence for that input and particle sector, not a general performance claim. See the [recorded input, output and validation boundaries](../examples/quantum-ground-state-local-demo-2026-09-12.json).

### Try an agent task

After configuring a model and installing uv, explicitly prepare FatQat's pinned environment from the repository root:

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

Then ask the workbench:

> Use FatQat to prepare a Bell state from two qubits in the zero state: apply H to q0, then CX with q0 as control and q1 as target. Return the exact noiseless probabilities and compare them with 1024 samples using seed=7.

The ideal probabilities for `00` and `11` are each 50%. Finite samples fluctuate. Check that the session contains actual tool inputs and returned computation results, as well as an explanation. Setup may download dependencies; the computation does not install them automatically. Missing or stale environments produce an actionable setup command. See [local environment preparation](../integrations/LOCAL_ENVIRONMENTS.md).

### Run an algorithm example directly

No model key or quantum-cloud account is required. Start with NumPy, SciPy and Qiskit:

```bash
npm run capability:algorithms:setup -- --minimal
```

On macOS / Linux, inspect the HHL input contract and run the default example:

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

On Windows PowerShell:

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

Add dependencies with `npm run capability:algorithms:setup -- --group pennylane`, or choose `gradients`, `tensor` or `chemistry`. Adding a group preserves other installed groups; setup without arguments still prepares the full environment. The full environment includes PySCF, for which WSL is recommended on Windows. Numerical verification was performed on macOS CPU. See the [examples, custom inputs and method differences](../../examples/quantum-algorithms/README.md).

### Upgrade an existing source installation

Follow the [source update guide](../UPDATES.md), then rerun the preparation command for each computation capability you use. Python bridges verify and synchronize pinned dependencies in their existing environment directories; no environment deletion is needed. Restart the workbench and start a new session. Existing Skill and Tool names are retained; automatic tasks use `quantum-algorithms` or a specific method instead of the 13 manual category indexes.

### Set up Quantum Learning

Prepare the full learning application in the same repository checkout used to launch OpenQuantum:

```bash
npm run learning:ui:setup
```

Then open **Quantum Learning** from the workbench sidebar. Installation and startup are verified on macOS; ordinary Windows installation is not yet supported, and Linux startup is not yet verified. A new Git worktree needs its own installation. If the app reports an incomplete installation, run the setup command from that checkout and reopen it.

The integration preserves the upstream OpenMAIC course, classroom, editing and project-learning workflows. Model access goes through the Harness model route. Local course storage is separate from the research workbench's session log. Optional media and search services require their own configuration.

The interface integration does not by itself establish teaching quality or scientific correctness. Course coverage, validation evidence and remaining work are described in the [Quantum Learning documentation](../../README.md#量子学习通).

### Interface languages

Choose **Settings → General → Language**. The initial set is Simplified Chinese, English, Japanese, Korean, Spanish, French, German, Portuguese, Russian and Arabic. The selection persists after refresh, and the embedded Quantum Learning app follows it. Arabic uses right-to-left reading direction.

![Language selection in the running OpenQuantum Desktop application](../images/openquantum-languages-20260919.jpg)

Language selection changes interface text. It does not translate existing conversations, user-authored Skills, course materials, tool outputs or model responses. Ask the model for your preferred response language separately. Some native operating-system dialogs in the pinned Desktop release use English fallback outside Chinese and English.

## Use and inspect results

Choose a computing backend separately from the language model. Local calculations do not need quantum-cloud credentials. Optional IBM Quantum, IonQ and Origin Quantum job interfaces require the corresponding credentials, permissions and quota; device discovery has a separate scope.

Use the settings page to enable the required MCP Server connection, restart the workbench and specify the backend in the task. Each tool defines its own physical model, input format and resource controls. See the [backend directory](../../README.md#可以连接哪些量子后端) and [computing parameters](../integrations/SCALABLE_BRIDGES.md).

Use algorithm examples when learning or changing a method, and specialist tools when you need their defined input/output contract. [Shared selection guidance](../integrations/CAPABILITY_SELECTION.md) covers overlapping Hamiltonian, VQD, Qiskit and eigensolver entry points. Qiskit Gym, Quantum Hardware and FlagQuantum remain opt-in; their optional tool profiles expose a smaller set for a specific task, with `full` preserving the default complete interface.

A model reply, a completed tool call and scientific acceptance are separate outcomes. Inspect the actual tool input and return value; supported capabilities may also provide independent references, error estimates or a complete acceptance report with recorded provenance.

Continue with new parameters, compare results, or turn repeatable steps into a Skill. [More task examples](../../README.md#更多可复制的计算任务) and [troubleshooting](../TROUBLESHOOTING.md) provide the next steps.

## Extend the platform

- A **Skill** supplies knowledge and workflow instructions.
- A **Tool Provider** registers executable tools, either natively or through the Harness MCP Client.
- A **Scientific Validator** produces observations for a supported capability; the central Acceptance Builder determines final acceptance from the applicable profile and evidence.
- An **Agent Preset** combines the required Skills, Tool Providers and agent policies.
- Complete applications can keep their own interfaces and use bounded integration points.

OpenQuantum uses DeepSeek Harness for agent execution, sessions, approvals, tools and persistence. It does not introduce a second agent runtime. Read the [architecture overview](../README.md), [extension model](../architecture/EXTENSION_MODEL.md) and [contribution guide](../../CONTRIBUTING.md) before adding an integration.

```bash
npm run harness:config
npm run desktop:check
npm run check
```

Choose checks relevant to your change. Tests and local evidence are distinct from a published release or scientific acceptance.

## Roadmap and RSI

Our long-term goal is to help people use existing capabilities and create new ones. These are development directions, not a list of delivered features.

### Platform foundations

| Long-term track | What we aim to build |
| --- | --- |
| **0 · A more useful quantum agent** | Improve task understanding, method selection, tool calls, result interpretation and failure recovery. Measure progress through the quality, time and cost of completing real tasks. |
| **1 · An agent-ready quantum software ecosystem** | Connect specialist software and improve execution interfaces, domain Skills and dependency preparation. Preserve applicability conditions and validation records so tools and methods can be reused in real tasks. |
| **2 · Quantum, HPC and AI workflows** | Connect local CPUs, remote GPUs, HPC, quantum simulators and QPUs, and explore agent-organized quantum–classical workflows. Select resources by task size, precision, time and budget, verifying backend connections, orchestration and coordinated execution step by step. |
| **3 · Interfaces for intelligent laboratory instruments** | Prepare standardized interfaces for programmable instruments and explore device discovery, experimental control, measurement analysis and feedback, connecting computation with real experiments. |

### Applications and teaching

| Long-term track | What we aim to build |
| --- | --- |
| **4 · More high-quality courses** | Build a knowledge map from fundamentals to frontier research and develop introductory, intermediate and advanced courses. Let learners move between levels according to their knowledge and interests, connecting concepts, experiments and assessment. |
| **5 · Quantum applications for practical problems** | Integrate or co-develop complete applications around defined problems, with problem inputs, computational workflows and result displays. Users should not have to assemble the underlying tools themselves. Document each application's backends, costs, scope and validation results. |

### Personalization and improvement

| Long-term track | What we aim to build |
| --- | --- |
| **6 · Proactive, personalized support** | Use learning and research experience to understand a person's knowledge, interests and goals, suggest next topics or methods, and address missing prerequisites. Users control which records inform personalization, where they are stored and how to turn it off. |
| **7 · Research capabilities that keep improving** | Explore how task experience can improve methods and tools, then the research process itself. Evaluate changes through comparisons on new tasks, independent checks, complete costs and versions that can be rolled back, as described in the RSI direction below. |

Instrument interfaces will draw on explorations such as Anthropic's [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview), starting with simulated devices and collaborative experiments. Real-time control and device constraints remain the responsibility of the corresponding drivers and control systems.

### Research that improves how research is done

**The proposed recursive self-improvement (RSI) loop is not implemented.** OpenQuantum has methods, executable tools and some scientific checking infrastructure; proposals, independent evaluation, version acceptance and benefits across iterations still need to be established.

We distinguish three levels: preserving reusable experience across tasks; improving methods, tools or workflows on new tasks; and improving how candidate changes are designed, found and tested. The last level is what makes the process recursive.

The proposed cycle is **research task → candidate improvement → independent checks and new-task comparisons → authorized version update → further research**. For example, a circuit task could produce a better way to choose optimization strategies. Test candidate strategies for equivalence and on circuits not used during development; improving the search and evaluation process itself is a further step.

Compare with a version that has not inherited the change. Report the base model, human involvement and total improvement and usage costs; check for regressions. A candidate system must not relax its own acceptance rules, remove failure evidence or extend permissions. Independent evaluation, user authorization, data boundaries and rollback are conditions for accepting a change.

Collaboration with CyberEinstein, PRAgent and RunThePaper is a future possibility, not an existing automatic workflow across projects. OpenQuantum continues to use Harness as its agent runtime. Any claim that quantum capabilities improve later AI research must include preparation, measurement, error correction and data-transfer costs; no acceleration of foundation-model training or unlimited self-improvement is assumed.

See the [full roadmap](../../README.md#长期发展规划) and [current architecture and evidence boundaries](../README.md).

## Documentation and support

- [Documentation index](../README.md)
- [Deployment](../DEPLOYMENT.md)
- [Prepare local environments](../integrations/LOCAL_ENVIRONMENTS.md)
- [Choose methods and tool profiles](../integrations/CAPABILITY_SELECTION.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
- [Development roadmap](../../README.md#长期发展规划)
- [Report an issue](https://github.com/xi-zhao/openQuantum/issues)

This language edition covers product use and contribution entry points. Detailed technical documents are currently primarily in Chinese. Corrections to translations are welcome.

Contribute a reusable case, a checked negative result, a tool, a course or an application. Include authorship, sources, licenses, conditions and validation scope. Share only authorized material; private sessions, unpublished data and credentials do not belong in public contributions.

**[Start a quantum task](#quick-start)** · [Contribute a capability](../../CONTRIBUTING.md)

**OpenQuantum · Quantum computing at your fingertips.**

## License and acknowledgments

OpenQuantum's own code is under the [MIT license](../../LICENSE). DeepSeek Harness, OpenMAIC and the quantum ecosystem projects retain their original authorship, licenses and usage conditions. Some components have separate licenses. Consult [Third-party notices](../../THIRD_PARTY_NOTICES.md) before redistribution or enabling an optional integration.
