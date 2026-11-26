<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./packages/openquantum-web-branding/assets/lockup-inverse.svg" />
    <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="320" alt="OpenQuantum" />
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
  <strong>让研究思路，有路可走。</strong><br />
  从一个问题、一篇论文或一段程序出发，让 AI 选择方法、执行计算、核对结果，把一次探索留给下一次研究。
</p>

<p align="center">
  <a href="https://xi-zhao.github.io/OpenQuantum/">
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcset="./docs/images/readme/banner.webp" />
      <img src="./docs/images/readme/banner-motion.webp" width="100%" alt="OpenQuantum：共建可信的量子科研智能" />
    </picture>
  </a>
</p>

<h3 align="center">
  <a href="#开始使用"><ins>立即获取</ins></a> &nbsp;·&nbsp;
  <a href="#发布演示"><ins>观看 78 秒演示</ins></a> &nbsp;·&nbsp;
  <a href="#优化实测"><ins>实测 5.69× 突破 →</ins></a> &nbsp;·&nbsp;
  <a href="https://xi-zhao.github.io/OpenQuantum/"><ins>访问官网</ins></a>
</h3>

<br />

---

<br />

<a id="发布演示"></a>
<a id="使用与结果"></a>
<a id="执行记录与科学验收"></a>
<a id="科研能力"></a>
<a id="可以用它做什么"></a>

<h2 align="center">不止回答问题。<br />真正动手计算，并替你验算。</h2>

<p align="center">
  普通聊天 AI 只能停在文字解释或未经运行的代码。<br />
  在 OpenQuantum，你用自然语言提出一个量子问题，它直接调动本地专业科学软件算出来，并独立核对结果。
</p>

<br />

https://github.com/user-attachments/assets/5c00a30d-eef0-493a-975f-3faeb200cc9e

<p align="center"><sub>78 秒产品演示（2026-11-02 快照） · <a href="docs/communications/video/README.md">视频来源与复跑说明</a></sub></p>

<br />

<table>
  <tr>
    <td width="33.3%" valign="top">
      <sub><strong>01 · 提问</strong></sub><br />
      <strong>自然语言，直达研究</strong><br />
      从氢分子基态、噪声线路到论文复现，直接描述物理目标即可起步。
    </td>
    <td width="33.3%" valign="top">
      <sub><strong>02 · 实算</strong></sub><br />
      <strong>本地原生，真实执行</strong><br />
      按需准备专业软件与锁定环境，在本地完成真实计算，无需云端凭据。
    </td>
    <td width="33.4%" valign="top">
      <sub><strong>03 · 核验</strong></sub><br />
      <strong>独立校验，全程可查</strong><br />
      分离“跑通”与“成立”，内置独立参照与形式化检查，复跑脚本完整留档。
    </td>
  </tr>
</table>

<br />

---

<br />

<a id="openquantum-的核心能力"></a>
<a id="能力接口目录"></a>
<a id="算法学习与方法比较"></a>
<a id="纠错模型静态诊断"></a>
<a id="数学与物理形式化"></a>
<a id="量子学习通"></a>

<h2 align="center">广阔的专业世界。<br />一个共同的起点。</h2>

<div align="center">

横跨 Python、Julia、Rust 与 Lean 4，将全球分散的量子工具链与前沿论文方法收敛进同一个入口。<br />
当前源码分发 **194 个内置 Skill、91 个 MCP 服务连接、5 个原生量子 Tool**，直连 **122 个锁定科学环境**。

</div>

<br />

<table>
  <tr>
    <th width="14%" align="left">领域</th>
    <th width="86%" align="left">已接入的开源软件、论文方法与生态入口</th>
  </tr>
  <tr>
    <td width="14%"><strong>电路编译</strong></td>
    <td width="86%"><a href="https://github.com/Qiskit/qiskit"><kbd>IBM Qiskit</kbd></a> <a href="https://github.com/PennyLaneAI/pennylane"><kbd>Xanadu PennyLane</kbd></a> <a href="https://github.com/CQCL/tket"><kbd>Quantinuum pytket</kbd></a> <a href="https://github.com/zxcalc/pyzx"><kbd>PyZX</kbd></a> <a href="https://github.com/TeamGraphix/graphix"><kbd>Graphix</kbd></a> <a href="https://github.com/munich-quantum-toolkit/qcec"><kbd>MQT QCEC</kbd></a></td>
  </tr>
  <tr>
    <td width="14%"><strong>纠错控制</strong></td>
    <td width="86%"><a href="https://github.com/quantumlib/Stim"><kbd>Google Stim</kbd></a> <a href="https://github.com/oscarhiggott/PyMatching"><kbd>PyMatching</kbd></a> <a href="https://github.com/unitaryfoundation/mitiq"><kbd>Mitiq</kbd></a> <a href="https://github.com/munich-quantum-toolkit/qecc"><kbd>MQT QECC</kbd></a> <a href="https://github.com/quantumlib/chromobius"><kbd>Chromobius</kbd></a> <a href="https://github.com/Deltakit/deltakit"><kbd>Deltakit</kbd></a> <a href=".agents/skills/mwpf-decoding/SKILL.md"><kbd>MWPF</kbd></a> <a href=".agents/skills/emlint-dem-audit/SKILL.md"><kbd>emlint</kbd></a> <a href=".agents/skills/tropidist-distance/SKILL.md"><kbd>tropidist</kbd></a> <a href=".agents/skills/erasure-recovery/SKILL.md"><kbd>erasure-recovery</kbd></a> <a href=".agents/skills/stgrape-control/SKILL.md"><kbd>ST-GRAPE</kbd></a></td>
  </tr>
  <tr>
    <td width="14%"><strong>多体化学</strong></td>
    <td width="86%"><a href="https://github.com/qutip/qutip"><kbd>QuTiP</kbd></a> <a href="https://github.com/tenpy/tenpy"><kbd>TeNPy</kbd></a> <a href="https://github.com/quantumlib/OpenFermion"><kbd>OpenFermion</kbd></a> <a href="https://github.com/dynamiqs/dynamiqs"><kbd>Dynamiqs</kbd></a> <a href=".agents/skills/slowquant-response/SKILL.md"><kbd>SlowQuant</kbd></a> <a href=".agents/skills/tnqs-dynamics/SKILL.md"><kbd>TNQS</kbd></a> <a href=".agents/skills/rcmps-field-theory/SKILL.md"><kbd>RcmpsCore</kbd></a> <a href=".agents/skills/ppvm-simulation/SKILL.md"><kbd>PPVM</kbd></a> <a href="https://github.com/QuEraComputing/bloqade-python"><kbd>QuEra Bloqade</kbd></a> <a href="https://github.com/pasqal-io/Pulser"><kbd>Pasqal Pulser</kbd></a></td>
  </tr>
  <tr>
    <td width="14%"><strong>形式与云</strong></td>
    <td width="86%"><a href=".agents/skills/lean-physics/SKILL.md"><kbd>Lean 4 / mathlib / physlib</kbd></a> <a href="examples/quantum-algorithms/README.md"><kbd>49 项开源算法</kbd></a> <a href="docs/integrations/OPENMAIC.md"><kbd>量子学习通</kbd></a> <a href="docs/CAPABILITIES.md#本地计算与量子云"><kbd>IBM · IonQ · 本源 · 夸父 · 天衍</kbd></a> <a href="docs/integrations/FULL_SDK_ACCESS.md"><kbd>+ 122 个锁定环境</kbd></a></td>
  </tr>
</table>

<div align="center">

[完整 Skill 目录](docs/CAPABILITIES.md#内置-skills) · [MCP 服务目录](docs/CAPABILITIES.md#mcp-服务目录) · [原生量子 Tools](docs/CAPABILITIES.md#原生量子-tools) · [环境准备](docs/integrations/LOCAL_ENVIRONMENTS.md) · [方法选型](docs/integrations/CAPABILITY_SELECTION.md) · [系统架构](docs/README.md)

</div>

<br />

---

<br />

<a id="优化实测"></a>
<a id="实测案例"></a>
<a id="optimization-cases"></a>
<a id="qutip-rust-case"></a>
<a id="pennylane-rust-case"></a>

<h2 align="center">更快。<br />也经得起核对。</h2>

<p align="center">
  <strong>把时间还给新的想法。</strong><br />
  不止于调用既有软件——面向高频计算瓶颈做端到端重构，完整调用计时、逐点精度核对，全部开源可复跑。
</p>

<br />

<p align="center">
  <a href="experiments/qutip-rust-wigner/README.md">
    <img src="./docs/images/readme/case-qutip.webp" width="100%" alt="QuTiP Wigner 函数：原库 171.77 ms，OpenQuantum 优化后 30.18 ms，完整调用提速 5.69 倍，最大绝对差 6.52 × 10⁻¹⁶，272 项核对通过。" />
  </a>
</p>

| 优化算子 | 固定输入与硬件 | 完整调用中位数 | 提速 | 独立精度核对 | 复跑 |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **QuTiP Wigner** | 64 维 Fock · 201×201 · M4 | `171.77 → 30.18 ms` | **5.69×** | 最大差 `6.52×10⁻¹⁶` · 272 项通过 | [报告](experiments/qutip-rust-wigner/README.md) · [图](site/assets/qutip-timings.svg) |
| **PennyLane 对易子** | 32 量子位 · 125×512 · M4 | `30.62 → 6.02 ms` | **5.09×** | 9 组一致 · 最大差 `1.42×10⁻¹⁴` | [报告](experiments/pennylane-rust-commutator/README.md) · [图](site/assets/pennylane-timings.svg) |

<details>
<summary>查看 PennyLane 5.09× 实测卡片与计时边界说明</summary>

<br />

<p align="center"><img src="./docs/images/readme/case-pennylane.webp" width="100%" alt="PennyLane Pauli 对易子实测提速 5.09 倍" /></p>

<sub>两项计时包含输入/输出对象转换（单线程 9 轮热运行中位数），不含环境准备与编译；收益仅对应各报告定义的固定输入与硬件条件，不推广为通用加速比。</sub>

</details>

<br />

---

<br />

<a id="开始使用"></a>
<a id="快速开始"></a>

<h2 align="center">一份核心。<br />两种形态，今天可用。</h2>

<p align="center">
  同一套量子科研核心，原生运行于 <strong>OpenQuantum Desktop</strong> 与 <strong>Codex 插件</strong>。<br />
  模型无关、本地优先、MIT 开源——接入任意支持 Tool Calling 的模型服务，即可开始。
</p>

<br />

<table>
<tr>
<td width="48%" valign="middle">

### OpenQuantum Desktop

**面向首次使用与独立科研工作台**（macOS Apple Silicon · 内置 Node / uv · 无需命令行）：

1. 下载 **[OpenQuantum 0.8.11 DMG](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.11/OpenQuantum-0.8.11-macOS-arm64.dmg)** 并核对 [SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11)，拖入「应用程序」。
2. 打开后在「设置 → 模型」填入你常用的 Tool Calling 模型服务，立即开始对话与计算。

<sub>首次打开见<a href="docs/DESKTOP_INSTALLERS.md">安装说明</a> · Intel Mac / Windows 见 <a href="https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4">0.8.4 能力包</a> · <a href="docs/images/openquantum-evidence-flow.png">科学证据流</a> · <a href="docs/images/openquantum-settings-categories-20261013.jpg">分类设置</a></sub>

</td>
<td width="52%">
  <a href="./docs/images/openquantum-desktop-20261013.jpg"><img src="./docs/images/openquantum-desktop-20261013.jpg" alt="OpenQuantum Desktop 量子科研工作台" width="100%" /></a>
</td>
</tr>
</table>

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

[安装包与 SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11) · [手动安装](docs/integrations/CODEX_AGENT_INSTALL.md) · [插件边界](docs/integrations/CODEX_PLUGIN.md) · [Codex 设置界面](docs/images/openquantum-codex-settings-20261011.png)

<a id="安装源码"></a>
<a id="配置模型"></a>

### 30 秒零密钥本地复算

```bash
git clone https://github.com/xi-zhao/OpenQuantum.git && cd OpenQuantum
npm ci
npm run demo:quantum-ground-state   # 零密钥复算：H₂ 基态 VQE（-1.85727503 Ha，误差 4.44×10⁻¹⁶ Ha）
npm run dev                         # 启动本地 Web 工作台
```

<details>
<summary>更多部署方式：源码 Desktop · Docker（Linux）· 量子学习通 · 微信 / 飞书渠道</summary>

- **源码 Desktop**：`npm run desktop:setup` → `npm run desktop:verify-install` → `npm run desktop -- --source`（[部署指南](docs/DEPLOYMENT.md#方式三原生桌面工作台)）
- **Docker Compose（Linux）**：`cp .env.example .env && docker compose up --build`（[部署指南](docs/DEPLOYMENT.md#方式四docker-compose)）
- **量子学习通**：`npm run learning:ui:setup`（[集成说明](docs/integrations/OPENMAIC.md)）
- **微信 / 飞书等消息渠道**：`npm run cc-connect:setup`（[渠道配置](docs/integrations/CC_CONNECT.md)）

</details>

<br />

---

<br />

<a id="长期发展规划"></a>
<a id="rsi"></a>
<a id="开放共建"></a>
<a id="开发与贡献"></a>

<h2 align="center">把一次探索，<br />留给下一次研究。</h2>

<p align="center">
  今天，让全球量子科研基础设施开箱即用。<br />
  明天，让每一次经验证的研究产出，反哺下一次研究本身。
</p>

<br />

<table>
  <tr>
    <td width="33.3%" valign="top">
      <sub><strong>01 · 已交付（v0.8.11）</strong></sub><br />
      <strong>统一量子科研层</strong><br />
      跨语言锁定环境、双端同步发行、11 项可回放科学验收与完整沙箱隔离。
    </td>
    <td width="33.3%" valign="top">
      <sub><strong>02 · 持续推进</strong></sub><br />
      <strong>多算力协同与教学</strong><br />
      CPU / GPU / HPC / QPU 协同调度、仪器接口探索与<a href="docs/integrations/OPENMAIC.md">量子学习通</a>课程体系。
    </td>
    <td width="33.4%" valign="top">
      <sub><strong>03 · 长期愿景</strong></sub><br />
      <strong>经验证的科研自进化</strong><br />
      探索受独立评估约束的 RSI 闭环；<strong>尚未实现</strong>，详见<a href="docs/roadmap/VISION.md">长期发展规划</a>。
    </td>
  </tr>
</table>

<br />

<p align="center">
  <a href="CONTRIBUTING.md">参与贡献</a> ·
  <a href="https://github.com/xi-zhao/OpenQuantum/issues">需求与合作交流</a> ·
  <a href="docs/README.md">系统架构</a> ·
  <a href="docs/EXAMPLES.md">任务示例</a> ·
  <a href="CHANGELOG.md">更新日志</a> ·
  <code>npm run check</code>
</p>

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

<p align="center">
  <sub>
    自有代码除单独声明外采用 <a href="LICENSE">MIT License</a>（© 2026 Xi Zhao）；<code>mitiq-error-mitigation</code> 采用 <a href=".agents/skills/mitiq-error-mitigation/LICENSE">GPL-3.0-only</a>，Metriq 公开数据快照采用 <a href="src/metriq-data/upstream/LICENSE">CC-BY-4.0</a>。完整清单见 <a href="THIRD_PARTY_NOTICES.md">THIRD_PARTY_NOTICES.md</a>。
  </sub>
</p>

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
