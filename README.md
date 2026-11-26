<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/openquantum-web-branding/assets/lockup-inverse.svg" />
    <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="340" alt="OpenQuantum" />
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/xi-zhao/OpenQuantum/stargazers"><img src="https://img.shields.io/github/stars/xi-zhao/OpenQuantum?style=flat-square&amp;label=%E2%98%85&amp;color=187a91" alt="GitHub stars" /></a>
  <a href="https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11"><img src="https://img.shields.io/badge/release-v0.8.11-187a91?style=flat-square" alt="Release v0.8.11" /></a>
  <a href="https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/xi-zhao/OpenQuantum/ci.yml?style=flat-square&amp;label=CI" alt="CI status" /></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/license-MIT%20%2B%20components-18232e?style=flat-square" alt="MIT 与组件许可证" /></a>
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
  将全球量子开源软件栈、前沿论文方法与独立科学验证汇聚为统一智能体基础设施。<br />
  让 AI 不仅能写代码，更能真正完成计算、突破底层性能瓶颈，并交付经得起核对的科研成果。
</p>

<h3 align="center">
  <a href="#开始使用"><ins>立即开始</ins></a> &nbsp;·&nbsp;
  <a href="#优化实测"><ins>实测突破 →</ins></a> &nbsp;·&nbsp;
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

<p align="center">
  <strong>194</strong> 个内置 Skill　·　<strong>91</strong> 个 MCP 服务连接　·　<strong>122</strong> 个锁定科学环境　·　<strong>11 项</strong>可回放科学验收
</p>

<br />

## 为什么是 OpenQuantum

通用大模型进入硬核科研的瓶颈从来不是“会不会写几行代码”，而是**工具链高度碎片化、底层计算低效、以及缺乏独立验证机制**。OpenQuantum 正在构建面向 AI for Quantum Science 的底层操作系统级能力：

<table>
  <tr>
    <td width="50%" valign="top">
      <strong>全栈量子软件底座</strong><br />
      一次性打通 Python、Julia、Rust 与 Lean 4 共 <strong>122 个锁定版本科学环境</strong>与 <strong>49 项可执行算法</strong>，覆盖从电路编译、化学多体、量子纠错、开放系统到国内外量子云发现的完整科研栈。
    </td>
    <td width="50%" valign="top">
      <strong>AI 反向加速科学计算</strong><br />
      不止于封装调用——面向高频科研算子进行端到端重构，在固定基准上实测 <strong>QuTiP 5.69×</strong> 与 <strong>PennyLane 5.09×</strong> 完整调用提速，逐点精度误差低至 <code>10⁻¹⁴–10⁻¹⁶</code> 量级。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>架构级可验证科学</strong><br />
      将“模型回答 / 工具执行”与“科学验收”彻底解耦。支持独立数值参照、沙箱化复核、桌面 / Web 宿主 <strong>11 项可回放科学验收</strong>，以及 <strong>Lean 4 / mathlib / physlib</strong> 机器定理证明。
    </td>
    <td width="50%" valign="top">
      <strong>跨宿主分发与复利平台</strong><br />
      一份共享科研核心同时驱动 <strong>Codex 插件</strong> 与 <strong>OpenQuantum Desktop</strong>，兼容任意支持 Tool Calling 的模型服务；本地优先、按需准备，MIT 开源，天然承接全球研究者、高校教学与产业研发。
    </td>
  </tr>
</table>

<br />

<a id="优化实测"></a>
<a id="实测案例"></a>
<a id="optimization-cases"></a>
<a id="qutip-rust-case"></a>
<a id="pennylane-rust-case"></a>

## 实测突破：更快，也经得起核对

每一项加速均基于**完整端到端调用计时**（包含输入/输出对象转换，单线程 9 轮热运行中位数），并公开全部原始计时、独立精度核对与一键复跑脚本。

<p align="center">
  <a href="experiments/qutip-rust-wigner/README.md">
    <img src="./docs/images/readme/case-qutip.webp" width="100%" alt="QuTiP Wigner 函数：原库 171.77 ms，OpenQuantum 优化后 30.18 ms，完整调用提速 5.69 倍，最大绝对差 6.52 × 10⁻¹⁶，272 项核对通过。" />
  </a>
</p>

- **QuTiP Wigner 函数（Apple M4 · 64 维 Fock 空间 201×201 网格）**：`171.77 ms → 30.18 ms`（**5.69×**），完整网格最大绝对差 `6.52 × 10⁻¹⁶`，272 项独立/解析/拒绝路径检查全部通过 · [复跑报告](experiments/qutip-rust-wigner/README.md) · [多规模对比图](site/assets/qutip-timings.svg)
- **PennyLane Pauli 对易子（Apple M4 · 32 量子位 125×512 项）**：`30.62 ms → 6.02 ms`（**5.09×**），9 组基准输出逐项一致，4,368 对 Pauli 与 40 组复系数随机矩阵最大误差 `1.42 × 10⁻¹⁴` · [复跑报告](experiments/pennylane-rust-commutator/README.md) · [全部 9 组图](site/assets/pennylane-timings.svg)

<details>
<summary>查看 PennyLane 5.09× 实测卡片与计时边界说明</summary>

<br />

<p align="center"><img src="./docs/images/readme/case-pennylane.webp" width="100%" alt="PennyLane Pauli 对易子实测提速 5.09 倍" /></p>

<sub>两项计时包含输入/输出转换，不含环境准备与编译；收益仅对应各报告定义的固定输入与硬件条件，不推广为通用加速比。</sub>

</details>

<br />

<a id="使用与结果"></a>
<a id="执行记录与科学验收"></a>
<a id="科研能力"></a>
<a id="可以用它做什么"></a>
<a id="openquantum-的核心能力"></a>
<a id="能力接口目录"></a>

## 产品形态与全景生态

<table>
<tr>
<td width="50%" valign="middle">

### 一份核心，双端交付

一套共享科研核心，原生嵌入不同宿主，不绑定单一框架或模型：

- **Codex 插件**：在 Codex 原生对话中无缝调用全部量子科研能力。
- **Desktop 独立工作台**：开箱即用的个人量子科研桌面，集成工作区、文件、执行记录与[量子学习通](docs/integrations/OPENMAIC.md)。
- **开放边界**：遵循「发现 → 准备 → 执行」，本地数值计算无需量子云凭据，真机任务按需显式开启。

[系统架构](docs/README.md) · [科学证据流](docs/images/openquantum-evidence-flow.png) · [分类设置界面](docs/images/openquantum-settings-categories-20261013.jpg)

</td>
<td width="50%">
  <a href="./docs/images/openquantum-desktop-20261013.jpg"><img src="./docs/images/openquantum-desktop-20261013.jpg" alt="OpenQuantum Desktop 科研工作台" width="100%" /></a>
</td>
</tr>
</table>

<details>
<summary>观看 78 秒产品演示视频（2026-11-02 快照）</summary>

<br />

https://github.com/user-attachments/assets/5c00a30d-eef0-493a-975f-3faeb200cc9e

<sub><a href="docs/communications/video/README.md">视频数据来源与复跑说明</a> · 另可查看 <a href="./docs/images/openquantum-codex-settings-20261011.png">Codex 全局设置界面</a></sub>

</details>

<a id="算法学习与方法比较"></a>
<a id="纠错模型静态诊断"></a>
<a id="数学与物理形式化"></a>
<a id="量子学习通"></a>

### 覆盖全球主流量子生态

当前源码分发 **194 个内置 Skill、91 个 MCP 服务连接、5 个原生量子 Tool**，并为 **122 个 SDK/源码环境**提供原生 API 路径。

<p>
  <a href="https://github.com/Qiskit/qiskit"><kbd>IBM Qiskit</kbd></a> &nbsp;
  <a href="https://github.com/PennyLaneAI/pennylane"><kbd>Xanadu PennyLane</kbd></a> &nbsp;
  <a href="https://github.com/qutip/qutip"><kbd>QuTiP</kbd></a> &nbsp;
  <a href="https://github.com/quantumlib/Stim"><kbd>Google Stim</kbd></a> &nbsp;
  <a href="https://github.com/oscarhiggott/PyMatching"><kbd>PyMatching</kbd></a> &nbsp;
  <a href="https://github.com/unitaryfoundation/mitiq"><kbd>Mitiq</kbd></a> &nbsp;
  <a href="https://github.com/zxcalc/pyzx"><kbd>PyZX</kbd></a> &nbsp;
  <a href="https://github.com/TeamGraphix/graphix"><kbd>Graphix</kbd></a> &nbsp;
  <a href="https://github.com/munich-quantum-toolkit/qcec"><kbd>MQT QCEC / QECC</kbd></a> &nbsp;
  <a href="https://github.com/CQCL/tket"><kbd>Quantinuum pytket</kbd></a> &nbsp;
  <a href="https://github.com/tenpy/tenpy"><kbd>TeNPy</kbd></a> &nbsp;
  <a href="https://github.com/quantumlib/OpenFermion"><kbd>OpenFermion</kbd></a> &nbsp;
  <a href="https://github.com/dynamiqs/dynamiqs"><kbd>Dynamiqs</kbd></a> &nbsp;
  <a href="https://github.com/QuEraComputing/bloqade-python"><kbd>QuEra Bloqade</kbd></a> &nbsp;
  <a href="https://github.com/pasqal-io/Pulser"><kbd>Pasqal Pulser</kbd></a> &nbsp;
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
  <a href=".agents/skills/lean-physics/SKILL.md"><kbd>Lean 4 / mathlib / physlib</kbd></a> &nbsp;
  <a href="examples/quantum-algorithms/README.md"><kbd>49 项开源算法示例</kbd></a> &nbsp;
  <a href="docs/CAPABILITIES.md#本地计算与量子云"><kbd>IBM · IonQ · 本源 · 夸父 · 天衍</kbd></a> &nbsp;
  <a href="docs/integrations/FULL_SDK_ACCESS.md"><kbd>+ 122 个锁定环境</kbd></a>
</p>

[完整 Skill 目录](docs/CAPABILITIES.md#内置-skills) · [MCP 服务目录](docs/CAPABILITIES.md#mcp-服务目录) · [原生量子 Tools](docs/CAPABILITIES.md#原生量子-tools) · [环境准备](docs/integrations/LOCAL_ENVIRONMENTS.md) · [方法选型](docs/integrations/CAPABILITY_SELECTION.md)

<br />

<a id="开始使用"></a>
<a id="快速开始"></a>

## 30 秒体验与安装

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

[安装包与 SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11) · [手动安装](docs/integrations/CODEX_AGENT_INSTALL.md) · [插件边界](docs/integrations/CODEX_PLUGIN.md)

### Desktop — macOS Apple Silicon

下载 **[OpenQuantum 0.8.11 DMG](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.11/OpenQuantum-0.8.11-macOS-arm64.dmg)**（内置 Node / uv），核对 [SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11) 后拖入「应用程序」，在「设置 → 模型」中接入任意支持 **Tool Calling** 的模型服务。首次打开（ad-hoc 签名）见[安装说明](docs/DESKTOP_INSTALLERS.md)；Intel Mac 与 Windows 可使用 [0.8.4 能力包](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) 或下方源码启动。

<a id="安装源码"></a>
<a id="配置模型"></a>

### 从源码运行（无需模型密钥即可复算验证）

```bash
git clone https://github.com/xi-zhao/OpenQuantum.git && cd OpenQuantum
npm ci
npm run demo:quantum-ground-state   # 零密钥复算：H₂ 算符基态 VQE（-1.85727503 Ha，误差 4.44×10⁻¹⁶ Ha）
npm run dev                         # 启动本地 Web 工作台
```

<details>
<summary>更多入口：源码 Desktop · Docker（Linux）· 量子学习通 · 微信 / 飞书渠道</summary>

- **源码 Desktop**：`npm run desktop:setup` → `npm run desktop:verify-install` → `npm run desktop -- --source`（[部署指南](docs/DEPLOYMENT.md#方式三原生桌面工作台)）
- **Docker Compose（Linux）**：`cp .env.example .env && docker compose up --build`（[部署指南](docs/DEPLOYMENT.md#方式四docker-compose)）
- **量子学习通**：`npm run learning:ui:setup`（[集成说明](docs/integrations/OPENMAIC.md)）
- **微信 / 飞书等消息渠道**：`npm run cc-connect:setup`（[渠道配置](docs/integrations/CC_CONNECT.md)）

</details>

<br />

<a id="长期发展规划"></a>
<a id="rsi"></a>
<a id="开放共建"></a>
<a id="开发与贡献"></a>

## 演进路线与开放共建

OpenQuantum 的长期目标是让每一次研究不仅产出可验证的答案，也沉淀出让下一次研究更强的工具与方法：

- **Phase 1 · 统一量子科研底座（已交付）**：194 Skill · 91 MCP · 122 锁定环境 · Desktop & Codex `v0.8.11` 同步发行 · 11 项可回放科学验收与完整沙箱隔离。
- **Phase 2 · 量子-经典协同与产业工作流（持续推进）**：面向 CPU / GPU / HPC / QPU 的协同调度、实验室仪器标准接口探索，以及体系化的[量子学习通](docs/integrations/OPENMAIC.md)教学与科研应用。
- **Phase 3 · 经验证的科研自进化（长期愿景）**：探索“真实任务 → 候选改进 → 独立评估与新任务对照 → 授权升级”的科研复利闭环（RSI）；**完整 RSI 闭环尚未实现**，评估门槛与安全边界见[长期发展规划](docs/roadmap/VISION.md)。

欢迎科研团队、量子软件维护者与生态伙伴交流与共建：[参与贡献](CONTRIBUTING.md) · [提出需求与合作交流](https://github.com/xi-zhao/OpenQuantum/issues) · [文档与架构总入口](docs/README.md) · [任务示例](docs/EXAMPLES.md) · [更新日志](CHANGELOG.md) · 本地全仓校验 `npm run check`。

<details>
<summary>学术引用（BibTeX）与合规许可详情</summary>

```bibtex
@software{zhao2026openquantum,
  author  = {Zhao, Xi and {OpenQuantum contributors}},
  title   = {OpenQuantum: Building Trustworthy AI for Quantum Research},
  year    = {2026},
  version = {0.8.11},
  url     = {https://github.com/xi-zhao/OpenQuantum}
}
```

仓库根目录已提供 [`CITATION.cff`](CITATION.cff)（支持 GitHub 侧栏一键引用）。安全问题请按 [`SECURITY.md`](SECURITY.md) 私密报告。

</details>

自有代码除单独声明外采用 [MIT License](LICENSE)（© 2026 Xi Zhao）；`mitiq-error-mitigation` 采用 [GPL-3.0-only](.agents/skills/mitiq-error-mitigation/LICENSE)，Metriq 公开数据快照采用 [CC-BY-4.0](src/metriq-data/upstream/LICENSE)。完整第三方来源、作者署名与许可清单见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

<br />

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/openquantum-web-branding/assets/lockup-inverse.svg" />
    <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="220" alt="OpenQuantum" />
  </picture>
</p>

<p align="center">
  <strong>开源开放，一起向前。</strong><br />
  <sub>OpenQuantum · 量子计算，就在指尖。</sub>
</p>
