<h1 align="center">
  <img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><strong>Put your quantum ideas to work.</strong><br /><sub>An open-source quantum agent and application platform</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum brings quantum tools, specialist methods and complete applications into one open platform. Use an AI agent to connect a question to computation, open an integrated application, or contribute your own algorithm, service or product.

**Ask questions, run calculations and build capabilities together.** Start with a supported task, inspect the tool results, and contribute methods or applications that others can use.

[Capabilities](#what-you-can-do) · [Why OpenQuantum](#why-openquantum) · [Quick start](#quick-start) · [Results](#use-and-inspect-results) · [Extend](#extend-the-platform) · [Roadmap](#roadmap-and-rsi) · [Contribute](#documentation-and-support) · [Open source](#license-and-acknowledgments)

![OpenQuantum Desktop research workbench](../images/openquantum-desktop-20260919.jpg)

The research workbench is the platform's conversational and computational entry point. Quantum Learning is one integrated application, with its own classroom interface and data boundary.

## What you can do

| Area | Available tools and results |
| --- | --- |
| Circuits | Qiskit and TyxonQ circuit creation, analysis, transpilation and local simulation; MQT QCEC equivalence checks |
| Optimization and algebra | PyZX rewriting, Graphix measurement-based computing, Symmer symmetry tapering and PauLie Lie algebra calculations |
| Ground states and chemistry | A bounded two-qubit VQE example, TeNPy spin-chain DMRG, SQD active-space chemistry and Flow-VQE parameter learning |
| Quantum information | toqito density-matrix and entanglement checks; RandomMeas subsystem-purity estimates |
| Error mitigation and correction | Mitiq ZNE, REM, PEC and CDR; Stim and PyMatching memory experiments; Deltakit code construction; BP+LSD decoding |
| Dynamics | Dynamiqs driven dissipative qubits, OQuPy non-Markovian evolution, TJM open Ising chains and Clifft noisy sampling |
| Optimization problems | QPanda QUBO compilation, constraint checks and local solving |
| Superconducting and atomic systems | FatQat local experiments, transmon leakage and Rydberg dynamics |
| Hardware and reference material | FieldQKit backend discovery; optional cloud job interfaces; fixed Metriq records and Quantum-Practices guides |
| Learning and teaching | Materials, slides, interactive classrooms and project-based learning through Quantum Learning |

Each integration has its own installation requirements and scientific scope. Local results do not establish hardware performance, and a completed tool call does not automatically imply scientific acceptance. See the [detailed capability catalog](../../README.md#可以用它做什么) and [integration documentation](../README.md).

### Quantum Learning

Prepare materials, edit courseware, learn in interactive classrooms and continue project-based activities. The application keeps its own teaching workflows and local course storage.

Course resources are still being organized; a complete curriculum and full acceptance of the online AI teaching workflows remain unfinished. Teaching tasks do not automatically use the research workbench’s quantum tools. See the [learning application and its scope](../../README.md#量子学习通).

## Why OpenQuantum

**People, AI and an open ecosystem can build quantum capabilities together.** Start with a supported task, then leave methods and results that others can build on.

### Start with a question, use specialist tools

Describe a supported task and let the agent call the appropriate tools. Skills supply methods and steps; the workbench records tool inputs and results. You define the physical assumptions, design comparisons and judge the findings.

Combining tools also opens new questions: optimize a circuit with PyZX, check its equivalence with QCEC, then compare noisy behavior. A simpler circuit need not have a smaller error. Match the model, bit order and budget before interpreting a comparison; see the [computing guide](../integrations/SCALABLE_BRIDGES.md).

### Make one investigation the start of the next

Keep the tool inputs and results, vary parameters and continue the discussion. Reusable procedures can become Skills. Supported capabilities provide reference calculations, statistical errors or scientific acceptance reports within their own scope.

We want to preserve method comparisons and useful failure evidence with their conditions. A program error is not a scientific refutation, and saved experience is not automatic learning.

### Make your methods useful to others

Contribute a method, calculation tool, course or complete application. Applications can retain their own interfaces and workflows, as Quantum Learning does. Model services and computing backends are configured separately; open implementations, upstream authorship and licenses remain visible. Users decide whether to share their research data.

## Quick start

The current distribution runs from source and is intended for local, single-user use and development. Install Git, Node.js 24 or newer, and [uv](https://docs.astral.sh/uv/getting-started/installation/) for Python quantum tools. Individual capabilities may need additional dependencies.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Open the login URL printed by the launcher. After authentication, the browser opens the workbench at `http://127.0.0.1:3000`.

### Desktop

```bash
npm run desktop:setup
npm run desktop
```

Web and Desktop use the same Harness composition. Close the other host before opening the same home. See [desktop installation and platform requirements](../DEPLOYMENT.md).

### Configure a model

Open **Settings → Models**. Add an OpenAI-compatible Chat Completions provider, enter its endpoint, model name and API key, and use the OpenQuantum agent preset. The model must support **Tool Calling** to execute quantum tools.

The bundled public and private routes contain `.invalid` placeholder endpoints. Configure an actual service before using them. These are model credentials, separate from quantum cloud credentials. Existing secrets are not displayed in settings; configuration stores credential references.

No model key is needed for the fixed local reference example:

```bash
npm run demo:quantum-ground-state
```

The repository records a local check of this bounded two-qubit Hamiltonian at approximately `-1.85727503 Ha`. This is evidence for that input and particle sector, not a general performance claim. See the [recorded input, output and validation boundaries](../examples/quantum-ground-state-local-demo-2026-09-12.json).

### Try an agent task

After configuring a model and installing uv, ask the workbench:

> Use FatQat to prepare a Bell state from two qubits in the zero state: apply H to q0, then CX with q0 as control and q1 as target. Return the exact noiseless probabilities and compare them with 1024 samples using seed=7.

The ideal probabilities for `00` and `11` are each 50%. Finite samples fluctuate. Check that the session contains actual tool inputs and returned computation results, as well as an explanation. The first use may download the pinned Python dependencies.

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

| Theme | Direction |
| --- | --- |
| Platform foundations | Improve task understanding, tool use and recovery; expand the agent-ready ecosystem; explore collaboration among quantum computing, HPC and AI, including instrument interfaces |
| Applications and teaching | Integrate applications for concrete problems; connect courses, experiments and assessment from introductory topics to advanced research |
| Personalization and improvement | Explore proactive support under user control, and evaluate changes to research methods through independent checks and comparable costs |

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
- [Troubleshooting](../TROUBLESHOOTING.md)
- [Development roadmap](../../README.md#长期发展规划)
- [Report an issue](https://github.com/xi-zhao/openQuantum/issues)

This language edition covers product use and contribution entry points. Detailed technical documents are currently primarily in Chinese. Corrections to translations are welcome.

Contribute a reusable case, a checked negative result, a tool, a course or an application. Include authorship, sources, licenses, conditions and validation scope. Share only authorized material; private sessions, unpublished data and credentials do not belong in public contributions.

**[Start a quantum task](#quick-start)** · [Contribute a capability](../../CONTRIBUTING.md)

**OpenQuantum · Quantum computing at your fingertips.**

## License and acknowledgments

OpenQuantum's own code is under the [MIT license](../../LICENSE). DeepSeek Harness, OpenMAIC and the quantum ecosystem projects retain their original authorship, licenses and usage conditions. Some components have separate licenses. Consult [Third-party notices](../../THIRD_PARTY_NOTICES.md) before redistribution or enabling an optional integration.
