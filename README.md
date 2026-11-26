<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/openquantum-web-branding/assets/lockup-inverse.svg" />
    <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="300" alt="OpenQuantum" />
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/xi-zhao/OpenQuantum/stargazers"><img src="https://img.shields.io/github/stars/xi-zhao/OpenQuantum?style=flat&amp;label=%E2%98%85&amp;color=187a91" alt="GitHub stars" /></a>
  <a href="https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11"><img src="https://img.shields.io/badge/release-v0.8.11-187a91?style=flat" alt="Release v0.8.11" /></a>
  <a href="https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/xi-zhao/OpenQuantum/ci.yml?style=flat&amp;label=CI" alt="CI status" /></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/license-MIT-187a91?style=flat" alt="License: MIT" /></a>
</p>

<p align="center">
  <sub>
    <a href="./README.md"><strong>简体中文</strong></a> ·
    <a href="./docs/readme/README.en.md">English</a> ·
    <a href="./docs/readme/README.ja.md">日本語</a> ·
    <a href="./docs/readme/README.ko.md">한국어</a> ·
    <a href="./docs/readme/README.es.md">Español</a> ·
    <a href="./docs/readme/README.fr.md">Français</a> ·
    <a href="./docs/readme/README.de.md">Deutsch</a> ·
    <a href="./docs/readme/README.pt.md">Português</a> ·
    <a href="./docs/readme/README.ru.md">Русский</a> ·
    <a href="./docs/readme/README.ar.md">العربية</a>
  </sub>
</p>

<h2 align="center">量子智能体</h2>

<p align="center">
  开源开放，连接社区专业量子软件、论文方法与独立核对，在 Codex 或 Desktop 中直接开展可复算的量子研究。
</p>

<h3 align="center">
  <a href="#开始使用"><ins>立即安装</ins></a> &nbsp;·&nbsp;
  <a href="#科研能力"><ins>探索能力 →</ins></a> &nbsp;·&nbsp;
  <a href="https://xi-zhao.github.io/OpenQuantum/"><ins>访问官网</ins></a>
</h3>

<p align="center">
  <a href="https://xi-zhao.github.io/OpenQuantum/">
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcset="./docs/images/readme/banner.webp" />
      <img src="./docs/images/readme/banner-motion.webp" width="900" alt="OpenQuantum：共建可信的量子科研智能" />
    </picture>
  </a>
</p>

<a id="使用与结果"></a>
<a id="执行记录与科学验收"></a>
<a id="优化实测"></a>
<a id="实测案例"></a>
<a id="optimization-cases"></a>

## 核心特性

<table>
<tr>
<td width="50%" valign="middle">

### 一份插件，两种入口

同一套量子科研能力同时支持 **Codex 插件** 与 **OpenQuantum Desktop**。接入你自己的 Tool Calling 模型服务，按需准备科学依赖，程序、参数与计算记录全程留痕。

[Codex 插件](docs/integrations/CODEX_PLUGIN.md) · [Desktop 安装](docs/DESKTOP_INSTALLERS.md) · [架构说明 →](docs/README.md)

</td>
<td width="50%">
  <a href="./docs/images/openquantum-desktop-20261013.jpg"><img src="./docs/images/openquantum-desktop-20261013.jpg" alt="OpenQuantum Desktop 科研工作台" width="100%" /></a>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

<a id="qutip-rust-case"></a>
<a id="pennylane-rust-case"></a>

### 更快，也经得起核对

针对高频瓶颈做端到端优化并保留逐点核对：QuTiP Wigner 函数完整调用提速 **5.69×**（最大差 `6.52 × 10⁻¹⁶`），PennyLane Pauli 对易子提速 **5.09×**（9 组基准逐项一致）。

[QuTiP 复跑](experiments/qutip-rust-wigner/README.md) · [PennyLane 复跑 →](experiments/pennylane-rust-commutator/README.md)

</td>
<td width="50%">
  <a href="experiments/qutip-rust-wigner/README.md"><img src="./docs/images/readme/case-qutip.webp" alt="QuTiP Wigner 函数实测提速 5.69 倍，最大绝对差 6.52 × 10⁻¹⁶" width="100%" /></a>
</td>
</tr>
</table>

<details>
<summary>观看 78 秒产品演示视频（2026-11-02 快照）</summary>

<br />

https://github.com/user-attachments/assets/5c00a30d-eef0-493a-975f-3faeb200cc9e

<sub><a href="docs/communications/video/README.md">视频数据来源与复跑说明</a> · 另可查看 <a href="./docs/images/openquantum-settings-categories-20261013.jpg">分类设置截图</a> 与 <a href="./docs/images/openquantum-evidence-flow.png">科学证据流程图</a></sub>

</details>

**更多内置能力：**

- <a id="算法学习与方法比较"></a>**[49 项可执行开源算法](examples/quantum-algorithms/README.md)**：覆盖 QFT、HHL、VQE、QAOA、QSP/QSVT、态制备与薛定谔化，改参数即可运行。
- **运行完成 ≠ 科学验收**：独立数值对照、形式证明与科学验收分别记录；DSH 侧已支持 11 项可回放科学验收（[架构与证据边界](docs/README.md)）。
- <a id="数学与物理形式化"></a>**[Lean 4 / mathlib / physlib 形式化证明](.agents/skills/lean-physics/SKILL.md)**：复用定理并机器检查证明与公理依赖。
- <a id="纠错模型静态诊断"></a>**按需准备，本地优先**：遵循「发现 → 准备 → 执行」，不隐式装包；本地数值计算无需量子云账户，真机接口按需显式开启（[环境准备](docs/integrations/LOCAL_ENVIRONMENTS.md)）。
- <a id="量子学习通"></a>**[量子学习通](docs/integrations/OPENMAIC.md) 与 [消息渠道](docs/integrations/CC_CONNECT.md)**：支持互动课程工作台及微信、飞书等渠道接入。

---

<a id="科研能力"></a>
<a id="可以用它做什么"></a>
<a id="openquantum-的核心能力"></a>
<a id="能力接口目录"></a>

## 量子软件生态

当前源码分发 **194 个内置 Skill、91 个 MCP 服务连接、5 个原生量子 Tool**，并为 **122 个 SDK/源码环境**提供原生 API 使用路径。

<p>
  <a href="https://github.com/Qiskit/qiskit"><kbd>Qiskit</kbd></a> &nbsp;
  <a href="https://github.com/PennyLaneAI/pennylane"><kbd>PennyLane</kbd></a> &nbsp;
  <a href="https://github.com/qutip/qutip"><kbd>QuTiP</kbd></a> &nbsp;
  <a href="https://github.com/quantumlib/Stim"><kbd>Stim</kbd></a> &nbsp;
  <a href="https://github.com/oscarhiggott/PyMatching"><kbd>PyMatching</kbd></a> &nbsp;
  <a href="https://github.com/unitaryfoundation/mitiq"><kbd>Mitiq</kbd></a> &nbsp;
  <a href="https://github.com/zxcalc/pyzx"><kbd>PyZX</kbd></a> &nbsp;
  <a href="https://github.com/TeamGraphix/graphix"><kbd>Graphix</kbd></a> &nbsp;
  <a href="https://github.com/munich-quantum-toolkit/qcec"><kbd>MQT QCEC / QECC</kbd></a> &nbsp;
  <a href="https://github.com/CQCL/tket"><kbd>pytket</kbd></a> &nbsp;
  <a href="https://github.com/tenpy/tenpy"><kbd>TeNPy</kbd></a> &nbsp;
  <a href="https://github.com/quantumlib/OpenFermion"><kbd>OpenFermion</kbd></a> &nbsp;
  <a href="https://github.com/dynamiqs/dynamiqs"><kbd>Dynamiqs</kbd></a> &nbsp;
  <a href="https://github.com/QuEraComputing/bloqade-python"><kbd>Bloqade</kbd></a> &nbsp;
  <a href="https://github.com/pasqal-io/Pulser"><kbd>Pulser</kbd></a> &nbsp;
  <a href="https://github.com/Deltakit/deltakit"><kbd>Deltakit</kbd></a> &nbsp;
  <a href="https://github.com/quantumlib/chromobius"><kbd>Chromobius</kbd></a> &nbsp;
  <a href=".agents/skills/slowquant-response/SKILL.md"><kbd>SlowQuant</kbd></a> &nbsp;
  <a href=".agents/skills/tnqs-dynamics/SKILL.md"><kbd>TNQS</kbd></a> &nbsp;
  <a href=".agents/skills/rcmps-field-theory/SKILL.md"><kbd>RcmpsCore</kbd></a> &nbsp;
  <a href=".agents/skills/mwpf-decoding/SKILL.md"><kbd>MWPF</kbd></a> &nbsp;
  <a href=".agents/skills/ppvm-simulation/SKILL.md"><kbd>PPVM</kbd></a> &nbsp;
  <a href=".agents/skills/erasure-recovery/SKILL.md"><kbd>erasure-recovery</kbd></a> &nbsp;
  <a href=".agents/skills/stgrape-control/SKILL.md"><kbd>ST-GRAPE</kbd></a> &nbsp;
  <a href=".agents/skills/tropidist-distance/SKILL.md"><kbd>tropidist</kbd></a> &nbsp;
  <a href=".agents/skills/emlint-dem-audit/SKILL.md"><kbd>emlint</kbd></a> &nbsp;
  <a href=".agents/skills/lean-physics/SKILL.md"><kbd>Lean 4 / physlib</kbd></a> &nbsp;
  <a href="docs/CAPABILITIES.md#本地计算与量子云"><kbd>IBM · IonQ · 国内量子云</kbd></a> &nbsp;
  <a href="docs/integrations/FULL_SDK_ACCESS.md"><kbd>+ 122 个锁定环境</kbd></a>
</p>

[完整 Skill 目录](docs/CAPABILITIES.md#内置-skills) · [MCP 服务目录](docs/CAPABILITIES.md#mcp-服务目录) · [原生量子 Tools](docs/CAPABILITIES.md#原生量子-tools) · [选型指南](docs/integrations/CAPABILITY_SELECTION.md)

---

<a id="开始使用"></a>
<a id="快速开始"></a>

## 安装与开始

<a id="codex-plugin"></a>

### Codex 插件

**让 Codex 帮你安装：** 新建对话，复制发送以下请求（需要支持插件的 Codex、Node.js 24+ 与 npm）：

```text
请帮我安装 OpenQuantum Codex 插件 0.8.11。先阅读安装指南：
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.11/docs/integrations/CODEX_AGENT_INSTALL.md
从 https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11 下载完整安装包与 SHA256SUMS，
核对摘要后，检查 Codex、Node.js 24+ 和 npm，使用包内安装器完成安装。
请保留已有插件和用户配置，核对 Skills、MCP 工具和左侧全局“OpenQuantum 设置”入口。
需要我重载应用时，告诉我具体操作。最后报告实际验证的结果，以及仍需准备的科学计算依赖。
```

[安装包与 SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11) · [手动安装](docs/integrations/CODEX_AGENT_INSTALL.md)

### Desktop — macOS

- 下载 **[OpenQuantum 0.8.11 DMG](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.11/OpenQuantum-0.8.11-macOS-arm64.dmg)**（Apple Silicon，内置 Node / uv），核对 [SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11)，拖入「应用程序」。
- 在「设置 → 模型」中配置支持 **Tool Calling** 的模型服务。
- 首次打开（ad-hoc 签名）见[安装说明](docs/DESKTOP_INSTALLERS.md)；Intel Mac 与 Windows 可用 [0.8.4 能力包](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) 或下方源码启动。

<a id="安装源码"></a>
<a id="配置模型"></a>

### 从源码运行

```bash
git clone https://github.com/xi-zhao/OpenQuantum.git && cd OpenQuantum
npm ci
npm run demo:quantum-ground-state   # 无需模型密钥：30 秒复算固定 H₂ 算符基态 VQE
npm run dev                         # 启动本地 Web 工作台（需在设置中配置模型）
```

<details>
<summary>更多入口：源码 Desktop · Docker · 量子学习通 · 消息渠道</summary>

- **源码 Desktop**：`npm run desktop:setup` → `npm run desktop:verify-install` → `npm run desktop -- --source`（[部署文档](docs/DEPLOYMENT.md#方式三原生桌面工作台)）
- **Docker Compose（Linux）**：`cp .env.example .env && docker compose up --build`（[部署文档](docs/DEPLOYMENT.md#方式四docker-compose)）
- **量子学习通**：`npm run learning:ui:setup`（[集成说明](docs/integrations/OPENMAIC.md)）
- **微信 / 飞书等渠道**：`npm run cc-connect:setup`（[渠道说明](docs/integrations/CC_CONNECT.md)）

</details>

---

<a id="开放共建"></a>
<a id="开发与贡献"></a>
<a id="长期发展规划"></a>
<a id="rsi"></a>

## 文档、开发与社区

- **文档**：[架构与文档总入口](docs/README.md) · [任务示例](docs/EXAMPLES.md) · [部署启动](docs/DEPLOYMENT.md) · [升级指南](docs/UPDATES.md) · [故障排查](docs/TROUBLESHOOTING.md)
- **路线图**：持续扩展专业软件、科学验收覆盖、量子-经典协同与教学；长期愿景见[发展规划](docs/roadmap/VISION.md)（完整 RSI 闭环尚未实现）。
- **参与贡献**：阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 或提交 [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues)，本地离线质量检查运行 `npm run check`。
- **安全与引用**：安全漏洞请按 [SECURITY.md](SECURITY.md) 私密报告；学术引用可使用仓库的 [`CITATION.cff`](CITATION.cff) 或下方 BibTeX。

<details>
<summary>BibTeX 引用</summary>

```bibtex
@software{zhao2026openquantum,
  author  = {Zhao, Xi and {OpenQuantum contributors}},
  title   = {OpenQuantum: Building Trustworthy AI for Quantum Research},
  year    = {2026},
  version = {0.8.11},
  url     = {https://github.com/xi-zhao/OpenQuantum}
}
```

</details>

## 许可

自有代码除单独声明外采用 [MIT License](LICENSE)（© 2026 Xi Zhao）；`mitiq-error-mitigation` 采用 [GPL-3.0-only](.agents/skills/mitiq-error-mitigation/LICENSE)，Metriq 数据快照采用 [CC-BY-4.0](src/metriq-data/upstream/LICENSE)。完整第三方来源与许可见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

<p align="center"><sub>OpenQuantum · 量子计算，就在指尖。</sub></p>
