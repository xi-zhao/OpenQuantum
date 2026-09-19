<h1 align="center">
  <img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><strong>An open-source quantum agent and application platform</strong></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum brings quantum tools, specialist methods and complete applications into one open platform. Use an AI agent to connect a question to computation, open an integrated application, or contribute your own algorithm, service or product.

Our goal is to help people find useful tools, applications and approaches for quantum-related tasks. Model services and computing backends are configured independently. The platform grows through open integrations across quantum computing, high-performance computing and AI.

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

## Quick start

The current distribution runs from source and is intended for local, single-user use and development. Install Git, Node.js 24 or newer, and [uv](https://docs.astral.sh/uv/getting-started/installation/) for Python quantum tools. Individual capabilities may need additional dependencies.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Open the login URL printed by the launcher. After authentication, the browser opens the workbench at `http://127.0.0.1:3000`.

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

### Desktop

```bash
npm run desktop:setup
npm run desktop
```

Web and Desktop use the same Harness composition. Close the other host before opening the same home. See [desktop installation and platform requirements](../DEPLOYMENT.md).

### Interface languages

Choose **Settings → General → Language**. The initial set is Simplified Chinese, English, Japanese, Korean, Spanish, French, German, Portuguese, Russian and Arabic. The selection persists after refresh, and the embedded Quantum Learning app follows it. Arabic uses right-to-left reading direction.

![Language selection in the running OpenQuantum Desktop application](../images/openquantum-languages-20260919.jpg)

Language selection changes interface text. It does not translate existing conversations, user-authored Skills, course materials, tool outputs or model responses. Ask the model for your preferred response language separately. Some native operating-system dialogs in the pinned Desktop release use English fallback outside Chinese and English.

## Quantum Learning

Prepare the full learning application in the same repository checkout used to launch OpenQuantum:

```bash
npm run learning:ui:setup
```

Then open **Quantum Learning** from the workbench sidebar. A new Git worktree needs its own installation. If the app reports an incomplete installation, run the setup command from that checkout and reopen it.

The integration preserves the upstream OpenMAIC course, classroom, editing and project-learning workflows. Model access goes through the Harness model route. Local course storage is separate from the research workbench's session log. Optional media and search services require their own configuration.

The interface integration does not by itself establish teaching quality or scientific correctness. Course coverage, validation evidence and remaining work are described in the [Quantum Learning documentation](../../README.md#量子学习通).

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

## Documentation and support

- [Documentation index](../README.md)
- [Deployment](../DEPLOYMENT.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
- [Development roadmap](../../README.md#长期发展规划)
- [Report an issue](https://github.com/xi-zhao/openQuantum/issues)

This language edition covers product use and contribution entry points. Detailed technical documents are currently primarily in Chinese. Corrections to translations are welcome.

## License and acknowledgments

OpenQuantum's own code is under the [MIT license](../../LICENSE). DeepSeek Harness, OpenMAIC and the quantum ecosystem projects retain their original authorship, licenses and usage conditions. Some components have separate licenses. Consult [Third-party notices](../../THIRD_PARTY_NOTICES.md) before redistribution or enabling an optional integration.
