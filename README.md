<h1 align="center">
  <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><a href="./README.md">简体中文</a> · <a href="./docs/readme/README.en.md">English</a> · <a href="./docs/readme/README.ja.md">日本語</a> · <a href="./docs/readme/README.ko.md">한국어</a> · <a href="./docs/readme/README.es.md">Español</a> · <a href="./docs/readme/README.fr.md">Français</a> · <a href="./docs/readme/README.de.md">Deutsch</a> · <a href="./docs/readme/README.pt.md">Português</a> · <a href="./docs/readme/README.ru.md">Русский</a> · <a href="./docs/readme/README.ar.md">العربية</a></p>

<p align="center">
  <strong>让量子想法运行起来。</strong><br />
  <sub>开源量子 Agent 与应用平台</sub>
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="MIT 与组件许可证" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
</p>

OpenQuantum 是面向量子研究、实验与教学的开源 Agent 与应用平台。你可以用自然语言选择方法、调用专业量子软件、查看计算过程与结果，也可以直接复跑算法示例、进入量子学习通准备课程，或接入自己的算法与应用。

**提出问题，运行计算，共创能力。** 从学习者的第一次实验，到研究者的方法比较，再到开发者的应用集成，都可以从已支持的任务开始。

当前源码提供 **49 个可运行的开源算法示例**，以及电路、量子化学、纠错、动力学等计算工具。按任务选择方法、准备所需依赖，再检查实际运行结果；完整范围见[能力目录](#可以用它做什么)。本页以源码 `main` 为准，安装包所含功能以对应[发布说明](docs/DESKTOP_INSTALLERS.md)为准。

<p align="center">
  <a href="#为什么选择-openquantum">为什么选择</a> ·
  <a href="#可以用它做什么">浏览能力</a> ·
  <a href="#快速开始">开始使用</a> ·
  <a href="#使用与结果">使用与结果</a> ·
  <a href="#把你的量子能力接进来">开发与扩展</a> ·
  <a href="#长期发展规划">路线与 RSI</a> ·
  <a href="#一起建设-openquantum">参与建设</a> ·
  <a href="#开源生态与致谢">开源生态</a>
</p>

<p align="center">
  <img src="./docs/images/openquantum-desktop-20260919.jpg" width="100%" alt="OpenQuantum Desktop 科研工作台：新会话、工作区与量子学习通入口" /><br />
  <sub>在科研工作台提出问题，查看工具调用，再带着结果继续探索。</sub>
</p>

<a id="为什么做-openquantum"></a>

## 为什么选择 OpenQuantum

**让人、AI 与开放生态共同创造量子能力。**

**我们不重造量子软件生态，而是让专业能力更容易被使用、组合和继续建设。** OpenQuantum 的工作，是把领域方法、Agent 执行和开放工具接到具体任务上；它的价值不必等到真实 QPU 取得优势才开始，本地计算、教学实验和方法验证也是实际用途。

### 从问题出发，调用专业能力

**让问题意识转化为探索能力。** 你不必先学会每套 SDK，才能开始一个已支持的任务：Skill 提供工作方法，Agent 调用专业 Tool，工作台保留输入与结果。我们希望减少反复配置、接口学习和流程搭建，让学习者能够动手，让研究者把更多精力放在提出假设、设计对照与判断结果上，而不是替代这些判断。

**让工具之间产生新的研究空间。** PyZX 电路优化、QCEC 等价性检查与噪声模拟，分别回答不同问题。把它们用于同一个研究目标，可以进一步追问“理想电路更简洁，含噪表现是否也更好”。我们持续建设这种有科学意义的组合：对齐模型、单位、位序和预算，理解方法何时适用、何时失效；接口接通本身不等于结论成立。各工具的当前范围见[计算与资源配置](docs/integrations/SCALABLE_BRIDGES.md)。

### 让一次研究，成为下一次的起点

**让一次工作留下可继承的经验。** 常用步骤、计算结果与适用的独立检查，为复核和后续使用提供基础。我们希望进一步积累带条件的方法比较与失败证据：不仅知道一次计算成功，也理解它为什么适用、何时应换一条路线。有依据的负结果同样有价值，但程序报错不等于科学反驳。完整科学验收目前按[相应能力的支持范围](#执行记录与科学验收)提供，经验整理也不等于系统已自动学习。

### 把你的方法，变成别人能用的能力

**让成果从“有人做出”走向“他人继续创造”。** 方法可以写成 Skill，计算程序可以接成 Tool，完整应用可以保留自己的界面和业务流程。研究者、教师、开发者与软硬件伙伴，可以从自己的专长出发贡献，而不必先重做整套平台。我们的目标不只是传播已有成果，也让它们进入新的课程、研究与应用；[量子学习通](#量子学习通)是现有应用入口之一。

**把选择权留给使用者和贡献者。** 开源实现与扩展接口允许你检查、修改和维护自己的组合；模型服务与计算后端分别配置，不把所有应用绑定到单一模型或设备。上游作者、许可证与贡献继续可见，研究数据是否共享由使用者决定。我们希望保留下来的不只是一个界面，而是能够随模型、算力与研究方向变化继续使用的专业方法。

一个人因此完成了原本难以开展的探索，一项方法因此进入新的问题，一个贡献者因此做出新的应用，都是平台值得积累的价值。下一步是让这些经验不仅帮助使用者，也帮助[改善下一轮研究的能力](#rsi)。

**[先运行一个任务](#快速开始)**　·　[把你的能力接进来](#把你的量子能力接进来)

<a id="openquantum-的核心能力"></a>
<a id="已集成的量子工具与能力"></a>

## 可以用它做什么

选择一个方向，告诉工作台你的问题、输入和希望检查的结果。OpenQuantum 的 Agent 按任务使用 Skill 中的方法，并调用相应 Tool 执行计算；量子学习通提供独立的教学界面。

[算法学习与方法比较](#算法学习与方法比较) · [电路与量子信息](#电路与量子信息) · [基态、化学与优化](#基态化学与优化) · [误差缓解与量子纠错](#误差缓解与量子纠错) · [哈密顿量模拟与开放系统](#哈密顿量模拟与开放系统) · [实验模拟与硬件](#实验模拟与硬件) · [参考资料与选型](#参考资料与选型) · [量子学习通](#量子学习通)

本地计算可以从无需量子云账户的任务开始。真实硬件和付费服务按需配置；各方法的输入范围、准备条件与验证状态分别保留在详细目录中。

### 算法学习与方法比较

从一个可运行示例开始，修改输入、检查数值结果，再把方法用于自己的问题。已将 UnitaryLab 的 **66 份 quantum-skills 指南**适配为原生 Skill，其中 **49 项提供可执行示例**，逐项覆盖原算法库的 **39 个模块**及指南独有方法；其余指南用于分类、后端选择和迁移。

| 任务方向 | 可运行的方法与示例 |
| --- | --- |
| 算法基础与搜索 | QFT、QPE、Hadamard test、振幅放大与估计、Grover、Shor、Simon、离散对数和图行走 |
| 线性系统与矩阵方法 | HHL、VQLS、QSVT 线性求解、绝热求解、LCU 与 QSP；附经典本征求解参考 |
| 哈密顿量模拟 | Trotter–Suzuki、qDrift、QSP、Taylor LCU，以及披露替换方式的 Cartan 示例 |
| 变分计算与机器学习 | VQE、VQD、QAOA、VQC、QCBM、CVQNN，以及梯度与量子 Fisher 信息计算 |
| 态制备与多体计算 | Möttönen、MPS、Isometry、变分态制备，分子 DMRG、Fermi–Hubbard VQE 与 Ising 演化 |
| 纠错构码与微分方程 | qLDPC 构码与 syndrome；一维、二维热方程和周期平流的薛定谔化示例 |

这些示例使用 Qiskit、PennyLane、quimb、PySCF、NumPy/SciPy 等开源后端，可直接运行，也可由 Agent 经已有代码执行工具调用。默认参数是教学算例；实际输入、参考误差和收敛状态需要按任务检查。

适配保留上游来源与许可证，不依赖闭源 UnitaryLab 运行时。工作流覆盖不表示上游 Python API、优化器或后端完全兼容；Cartan、CVQNN、DMRG 等差异在[逐项覆盖表](docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)和[运行说明](examples/quantum-algorithms/README.md)中公开。

[直接运行算法示例](#直接运行开源算法示例) · [选择相近方法](docs/integrations/CAPABILITY_SELECTION.md)

### 电路与量子信息

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 量子电路 | 分析或转换 OpenQASM / QPY 电路，比较转译，检查等价性，运行电路仿真 | 电路结构、转译结果、等价性检查、态矢或采样分布 |
| Qiskit / Cirq 互操作 | 用 qBraid 按固定 OpenQASM 2 路径转换受支持的酉电路 | 转换后的电路、保留的量子位编号与空闲位；可选完整酉矩阵对照 |
| 电路优化与测量式计算 | 用 PyZX 做 ZX 重写与电路提取，用 Graphix 转换和模拟 MBQC 模式 | 优化前后电路与门数、资源图和测量模式；可选独立对照 |
| 电路优化与切割 | 用 Compact 优化门序列，用 QCut 切分电路并重建期望值 | 优化前后电路与独立等价对照；切割开销、实际采样量与可选未切割参考 |
| Clifford+T 噪声采样 | 用 Clifft 研究 T 门干涉与噪声，或采样受支持的 Stim 格式电路 | 最终位串频数与可选密度矩阵参考；另可返回中间测量及 detector / observable 原始奇偶记录 |
| 量子态与测量 | 审计密度矩阵与纠缠指标；模拟已知 product / GHZ 态的局域随机测量 | 状态指标与独立检查，子区纯度估计及有限样本误差 |

### 基态、化学与优化

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 基态求解与验证 | 提供二量子位实 Pauli Hamiltonian，在固定粒子扇区运行 VQE，并检查精确参考 | 能量、收敛轨迹、独立检查，以及完整流程中的科学验收报告 |
| 量子化学与多体基态 | 用 SQD 研究分子与活性空间，或用 TeNPy 计算 XYZ 自旋链基态 | SQD 能量与轨道占据，DMRG 能量、磁化、纠缠熵及收敛信息；可选精确参考 |
| 变分参数学习 | 对 Pauli Hamiltonian 训练 Flow-VQE，学习低能量电路参数 | Flow 参数学习与等评估预算随机搜索比较 |
| 激发态与核分类 | 用 OpenQARP VQD 搜索多个低能态，或用 cqlib 角度核训练 QSVM | 能量、残差、正交性与可选精确谱；独立测试集分类、解析核及经典基线 |
| 对称性与控制代数 | 用 Symmer 在指定对称性扇区降比特，用 PauLie 分析 Pauli 生成元 | 降维 Hamiltonian、Lie 代数分类与维数；可选能谱对照或闭包 |
| 组合优化 | 构建 QUBO，检查约束 penalty，运行经典求解或可选本地 QAOA | 优化解、约束检查与经典枚举复核 |

### 误差缓解与量子纠错

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 误差缓解 | 用 Mitiq 运行 ZNE、REM、PEC 或 CDR，比较相同采样预算下的原始与缓解结果 | 理想参考、经验偏差、方差和 RMSE，以及校准、训练与采样成本 |
| 量子纠错 | 用 Stim / PyMatching 运行 surface-code memory，用 Deltakit 构建矩形码片实验，或进行 BP+LSD 解码 | 实际含噪电路、固定 shots 的逻辑错误率与区间；LSD 的 syndrome 一致性检查 |

<a id="开放系统动力学"></a>

### 哈密顿量模拟与开放系统

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 哈密顿量模拟 | 提供实系数 Pauli Hamiltonian，用 Trotter–Suzuki 或 qDrift 构建演化电路或计算末态 | 电路、资源指标、态矢及可选独立矩阵参考；步数、阶数、时间与随机种子可配置 |
| 开放系统动力学 | 用 TJM 计算开放 Ising 链，用 Dynamiqs 扫描单量子位驱动与梯度，或用 OQuPy 研究环境记忆 | 观测量轨迹、独立参考、梯度以及时间步长与记忆截断信息 |

### 实验模拟与硬件

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 超导与原子实验 | 模拟调校流程、原生门约束、三能级 transmon 泄漏或小型里德堡原子链动力学 | 合成实验数据、动力学轨迹与图表 |
| 量子硬件接入 | 发现后端、检查拓扑与凭据；按需启用云任务查询、提交与取消 | 设备候选、使用条件；已启用任务接口的结果与状态 |
| 本地设备接口 | 用 QDMI 查询已配置的 C 驱动 | 驱动报告的设备、量子位、门与耦合信息；官方示例驱动用于接口验证，不代表在线 QPU |

### 参考资料与选型

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 算法参考与工具选型 | 检索 Quantum-Practices 的 66 份算法指南、比较量子 SDK、复用研究步骤 | 固定版本的参考材料、适用假设与选型建议 |
| 公开设备基准 | 从 Metriq 的 410 条固定历史记录中按厂商、设备或基准类型查询 | 原始参数、指标、时间、来源与许可；保留模拟器标签 |

<a id="学习应用"></a>

<a id="openquantum-全景"></a>
<a id="产品体验"></a>

<a id="教学桌面与消息入口"></a>

<a id="学习与教学"></a>

### 量子学习通

把材料、课件与课堂放在一起，让学习者动手，也让教师组织自己的教学内容。

| 学习与教学场景 | 可用功能 |
| --- | --- |
| 准备材料 | 首页、课程库、材料附件、课程导入与 PPTX 导入 |
| 制作课程 | 建课预览、课件编辑器和 Pro 专业工作台 |
| 课堂学习 | 幻灯片、测验、互动问答与 PBL 项目式学习 |
| 继续学习 | 本机课程、任务、材料与服务端学习记录持久化，兼容旧版课堂迁移 |

课程建设目标是覆盖中学基础到前沿研究，按初级、中级、高级组织内容，允许按知识基础跨阶段学习。当前公开资源仍在整理，完整课程体系尚未制作和发布。应用装配、启动和本机持久化已有验证，真实在线 AI 建课、问答和编辑仍待完整验收。

Pro 教学任务使用上游应用自己的工具与记录，尚未自动接入科研工作台的量子工具。媒体、语音和搜索等可选能力需要对应服务配置。安装、备份、迁移与逐项验证见[量子学习通集成说明](docs/integrations/OPENMAIC.md)。

<p align="center">
  <img src="./docs/images/openquantum-learning-20260912.jpg" width="100%" alt="量子学习通：课程材料、课堂与课件编辑入口" />
</p>

[准备学习通并打开课堂](#量子学习通安装)。

<a id="在桌面和消息中使用"></a>
<a id="桌面与消息入口"></a>

### 桌面、消息与多语言

#### 桌面工作台

OpenQuantum 桌面端提供原生窗口、系统托盘、终端与通知，复用科研工作台的模型、量子 Skill、计算工具和执行记录。

提供 Mac（Apple Silicon / Intel）和 Windows 桌面安装包，也支持从源码构建。

[下载并安装桌面客户端](#桌面安装包) · [从源码启动桌面客户端](#桌面客户端)。

#### 消息入口

通过 CC Connect，可从微信、飞书、钉钉、Slack、Telegram、Discord 等渠道发起任务，复用工作台已有的 Skill、Tool 和执行记录。

<p align="center">
  <img src="./docs/images/openquantum-wechat-chat.jpg" width="380" alt="通过微信 ClawBot 与 OpenQuantum 对话的已有演示截图" /><br />
  <sub>微信渠道中的任务与回复示例。</sub>
</p>

[配置微信、飞书与其他消息渠道](#微信飞书与其他消息入口)。

#### 界面语言

在「设置 → 通用设置 → 语言」选择简体中文、英语、日语、韩语、西班牙语、法语、德语、葡萄牙语、俄语或阿拉伯语。选择会保存，学习通跟随工作台；阿拉伯语使用从右到左的阅读方向。

![OpenQuantum Desktop 实际界面的语言选择](docs/images/openquantum-languages-20260919.jpg)

界面语言不会改写已有对话、课程材料、用户 Skill 或工具输出。部分原生系统对话框在中英文之外使用英语回退。

## 快速开始

OpenQuantum 支持桌面安装包和源码运行，适合本机单用户使用。直接使用工作台可下载安装包；二次开发或使用源码主线能力可选择源码路径。

### 桌面安装包

从 [GitHub Release](https://github.com/xi-zhao/OpenQuantum/releases/latest) 下载 Mac（Apple Silicon / Intel）或 Windows 安装包。安装包内置 Node 和 uv，无需先配置源码构建环境；当前为未签名测试构建。按[安装说明](docs/DESKTOP_INSTALLERS.md)安装并启动后，继续[配置模型](#配置模型)。计算组件的额外依赖按对应版本说明准备，量子学习通等可选应用另有安装步骤。

本页能力目录描述源码 `main`。[v0.5.1 安装包](docs/releases/v0.5.1.md)不包含后续的[新增量子能力](docs/integrations/CANDIDATE_LIBRARIES.md)、[9 月 22 日量子库更新](docs/releases/2026-09-22-quantum-upstream-update.md)，以及 9 月 24 日的[算法适配](docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md)、[互操作接入](docs/integrations/QUANTUM_INTEROP.md)和[扩展治理](docs/architecture/EXTENSION_GOVERNANCE.md)。使用这些更新请选择源码路径；安装版不会随主线自动升级，数据迁移与备份见[安装包说明](docs/DESKTOP_INSTALLERS.md#数据与升级)。

### 安装源码

先准备 Git、Node.js 24；Python 量子工具还需要 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。其他依赖按所选能力安装，例如 RandomMeas 需要 Julia 1.12.7。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

没有模型密钥也可以先运行[固定本地示例](#不需要模型密钥复算一个固定案例)。要通过 Agent 发起任务，继续选择工作台入口并配置模型。

### 选择工作台入口

从同一源码目录启动的 Web 与 Desktop 使用同一套模型配置、量子能力和执行记录，共用 `.openquantum/dsh` 中的本机状态。切换前先退出正在运行的入口。

#### 网页工作台

```bash
npm run dev
```

打开启动日志中带登录令牌的地址；认证后进入 <http://127.0.0.1:3000>。

<details>
<summary><strong>桌面源码安装与启动</strong></summary>

#### 桌面客户端

完成源码依赖安装，并准备 Corepack 和系统 C++ 构建工具后：

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
```

`desktop:setup` 构建固定的上游源码、下载 Electron、编译原生模块并准备 OpenQuantum 品牌资源。请使用仓库启动命令，加载模型和量子能力配置。

</details>

<a id="模型由你选择"></a>

### 配置模型

在「设置 → 模型」填写支持 OpenAI-compatible Chat Completions 协议的服务地址、模型名称和 API Key，保持 OpenQuantum 为默认 Agent Preset。**模型需要支持 Tool Calling，才能调用量子计算工具。** 这里配置的是模型服务，量子云凭据在对应后端中另行配置。

内置 `openquantum-public` / `openquantum-private` 的默认地址均为 `.invalid` 占位地址，请替换为自己的服务。

<details>
<summary><strong>高级模型配置与命令行诊断</strong></summary>

界面保存的模型路由覆盖写入 Git 忽略的 `$DSH_HOME/settings.yaml`；密钥保存在本地环境或 Harness 凭据库中，项目配置只保存凭据引用。若希望使用 `.env` 提供服务地址和密钥，macOS 终端执行 `cp .env.example .env`，Windows PowerShell 执行 `Copy-Item .env.example .env`，再按文件内注释填写。`.env` 不覆盖模型名称；服务使用其他模型名时，仍需在「设置 → 模型」中配置。

以下命令检查 `.env` 或环境变量中的 public 路由，以及脚本固定的 `kimi-k2.7-code`、`glm5.2` 两个模型名，分别验证文本生成和 Tool Calling。它不会读取界面保存的路由覆盖；服务提供这些模型时可使用，其他模型请通过上面的工作台任务验证。

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### 按任务准备计算环境

源码中的本地 Python 计算工具使用显式准备的固定依赖。完成 `npm ci` 后，在仓库根目录选择要使用的能力执行准备命令；准备阶段可能联网下载和构建，计算调用不再自动安装依赖。

| 准备什么 | 命令或入口 |
| --- | --- |
| 第一个 Bell 态实验 | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Trotter / qDrift 哈密顿量模拟 | `npm run capability:hamiltonian:setup` |
| Clifft 采样与 qBraid 电路转换 | `npm run capability:interop:setup` |
| 指定其他 Python 计算能力 | `node scripts/setup-paper-tools.mjs <能力 ID>`，例如 `qec-memory-experiment`；各 Skill 列出自己的准备命令 |
| 算法示例 | 从[最小依赖环境](#直接运行开源算法示例)开始，按需补充梯度、PennyLane、张量或化学依赖 |

环境准备、连接启用与模型配置分别完成。默认开启的连接也需要准备依赖；计算时若缺少环境或锁文件已更新，Tool 会返回具体准备命令。Julia、QDMI 驱动和上游 MCP 服务按各自说明准备。详见[本地计算环境](docs/integrations/LOCAL_ENVIRONMENTS.md)。

<a id="科研工作台"></a>

<a id="从一个真实任务开始"></a>
<a id="从一个量子任务开始"></a>

### 跑通第一个任务

#### 不需要模型密钥：复算一个固定案例

以仓库内固定的[二量子位 Pauli Hamiltonian](.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json)为输入，原生 `solve_and_validate_ground_state` Tool 在指定粒子扇区内运行无噪声 VQE，再用独立闭式计算检查结果。完成[快速开始](#快速开始)的 `git clone` 与 `npm ci` 后，在仓库目录执行即可复算，无需模型密钥或量子云凭据：

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>VQE 能量</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>独立精确参考</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>能量差</sub></td>
    <td align="center"><strong>15 项通过</strong><br /><sub>本地计算检查</sub></td>
  </tr>
</table>

以上数值来自 **2026-09-12 的本地复验**；[原始输出与运行记录](docs/examples/quantum-ground-state-local-demo-2026-09-12.json)包含完整数值、检查状态、时间、源码提交、输入摘要和 Node.js 版本。

<details>
<summary><strong>这次运行检查了什么，以及还差什么</strong></summary>

这次运行完成了 15 项本地计算检查，1 项会话来源检查未执行，尚未生成完整科学验收结论。差值表示该数值案例与精确参考的一致程度；科学适用范围仍是给定 Hamiltonian 和粒子扇区。

完整科学验收还需要通过 Harness 执行任务、保存结果文件和会话来源，并生成可重读的验收报告。配置模型后的验证入口见[开发与验证](#开发与验证)。

</details>

<a id="发起任务并选择后端"></a>

#### 让 Agent 执行任务：Bell 态的制备与采样

配置模型后，新建会话，发送下面的请求：

> 用 FatQat 从双量子位全零态出发，对 q0 施加 H，再以 q0 为控制位、q1 为目标位施加 CX。返回无噪声精确概率，并用 1024 次采样、seed=7 比较频数。

Agent 可以调用 FatQat 电路工具执行计算，工作台保留工具输入和返回结果。你可以查看精确概率与采样频数，再继续提出问题：

> 保持电路和 seed 不变，把采样量改为 8192 次，比较两次频率与精确概率的偏差。

这个电路的理想概率是 `00`、`11` 各 50%；有限采样的频率会波动。比较两次采样可以观察这种波动，单次增加采样量不保证每个频率都更接近理想值。

此处展示可复制请求与理论预期。FatQat 连接默认开启，先用 `node scripts/setup-paper-tools.mjs fatqat-workbench` 准备锁定依赖；接口和本地验证记录见 [FatQat 使用说明](docs/integrations/FATQAT.md)。这条路径需要先按[配置模型](#配置模型)接入一个支持 Tool Calling 的模型，否则 Agent 不会调用计算 Tool。

#### 直接运行开源算法示例

不需要模型密钥或量子云账户。基础方法先准备 NumPy、SciPy 和 Qiskit：

```bash
npm run capability:algorithms:setup -- --minimal
```

macOS / Linux 可直接查看方法、输入说明并运行默认 HHL 算例：

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

Windows PowerShell 使用对应解释器路径：

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

需要 QSP/QSVT 等方法时，运行 `npm run capability:algorithms:setup -- --group pennylane`；其他组为 `gradients`、`tensor`、`chemistry`，补装会保留已安装的其他组。不带参数的 `npm run capability:algorithms:setup` 仍准备全部依赖。完整环境含 PySCF，Windows 建议使用 WSL；已完成的数值验证范围是 macOS CPU。

自己的参数通过 JSON 文件和 `--input` 传入，结果可用 `--output` 保存。也可以在配置模型后，让 Agent 使用 `quantum-algorithms` 或具体方法 Skill 执行。完整参数、位序、方法差异与依赖组见[算法示例说明](examples/quantum-algorithms/README.md)。

### 从已有源码升级

按[版本更新说明](docs/UPDATES.md)更新源码和项目依赖，再为要使用的计算能力运行一次原准备命令。Python 桥接会在原环境目录核验并同步锁定依赖，无需删除环境；算法示例可继续按组补装。

随后重启工作台并新建会话。已有 Skill、Tool 名称和参数保持有效；13 个分类索引仍可手动调用，Agent 自动任务改为直接选择 `quantum-algorithms` 或具体方法。需要恢复可选服务的完整工具范围时，使用默认 `full` 配置，详见[能力选择与兼容说明](docs/integrations/CAPABILITY_SELECTION.md)。

### 按需开启其他入口

<details>
<summary><strong>量子学习通安装</strong></summary>

#### 量子学习通安装

完成源码依赖安装后，在同一个 checkout 执行：

```bash
npm run learning:ui:setup
```

随后启动 Web 或 Desktop，从侧栏打开「量子学习通」。首次打开会启动本机数据库与课程服务，无需另装全局 PostgreSQL；模型请求使用 OpenQuantum 当前选择的模型。

安装和启动已在 macOS 验证；安装器依赖 `/bin/sh`，尚未适配普通 Windows 环境，Linux 也尚未完成验证。新 Git worktree 需要自己的学习应用安装。备份、迁移与平台状态见[学习通集成说明](docs/integrations/OPENMAIC.md#使用)。

</details>

<details>
<summary><strong>微信、飞书与其他消息入口的配置</strong></summary>

#### 微信、飞书与其他消息入口

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

第一项平台需先按上游方式配置；可另开终端运行 `npm run cc-connect:web` 管理其他平台及凭据。Token 保存在 Git 忽略的本地配置中，完整步骤见[消息接入说明](docs/integrations/CC_CONNECT.md)。

</details>


部署方式与启动问题见[部署与启动](docs/DEPLOYMENT.md)和[故障排查](docs/TROUBLESHOOTING.md)。

<a id="按自己的需要使用"></a>

## 使用与结果

一次任务跑通以后，你可以选择其他后端、调整计算规模，再带着结果继续研究。

### 选择合适的入口

学习或修改算法时，从[可运行示例](#算法学习与方法比较)开始；需要既定输入输出的计算动作时，选择下面的专业工具。Trotter / qDrift、VQD、Qiskit 和本征求解的相近入口已有[统一选择说明](docs/integrations/CAPABILITY_SELECTION.md)，原名称保留，具有不同物理假设或数值方法的实现仍分别提供。

Qiskit Gym、Quantum Hardware 和 FlagQuantum 默认关闭。需要这些服务时，可按训练、设备查询、编译或仿真等用途配置较小的工具范围；未选择时仍使用兼容旧配置的 `full`。当前会话可调用的工具取决于已启用连接、实际注册状态和所选范围。

### 本地计算与量子云

本地数值计算无需量子云账户。启用其他工具时，在「设置 → 量子组件 → MCP Server 连接」配置相应连接，重启工作台，再在任务中指定所需后端；默认开关见[服务目录](#mcp-服务目录)。

需要真实硬件时，按服务准备凭据、权限与额度。**设备发现、真实任务提交和本地模拟的接入范围分别说明**，不能用配置存在代替服务在线或任务成功。

<details>
<summary><strong>可以连接哪些量子后端</strong></summary>

#### 可以连接哪些量子后端

OpenQuantum 为本地模拟、IBM Quantum、IonQ 和多家国内量子云保留明确的接入边界：先发现后端，再由使用者决定是否配置并启用任务接口。下表是集成范围，不是这些服务当前在线可用的证明。

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地计算 | 电路与噪声仿真、基态参考计算、量子态审计、纠错采样、优化与实验模拟；各有输入范围 | 数值计算无需云凭据；计算前显式准备锁定依赖 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，任务类 MCP Server 连接按需开启 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，任务类 MCP Server 连接按需开启 |
| 本源量子云 | 只读后端发现（FieldQKit）；另经 QPanda3 Runtime MCP Server 查询悟空 QPU，并可选提交采样、期望值与批量任务 | `ORIGIN_API_TOKEN` 只读发现；`QPANDA3_API_KEY` 可选开启真机任务 |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

硬件任务和付费服务按需开启。后端发现类能力保持只读，适合先了解设备、拓扑和校准信息，再决定是否进入真实任务流程。

这里的“只读”仅指不改变云端/QPU 状态。本地 Python 计算桥接在调用前[显式准备锁定环境](docs/integrations/LOCAL_ENVIRONMENTS.md)；
计算 Tool 不再自动安装依赖。SDK 缓存和结果物化仍可能写入工作区，因此保留相应 `workspace-write` 合同。

</details>

### 计算参数与运行方式

在各工具支持的模型与输入范围内，你可以选择量子位数、电路长度、Hamiltonian 项数、采样量和迭代预算。可用参数与规模以具体工具接口为准，运行能力取决于所选算法、后端和计算资源；限定模型的参考案例不代表所有工具的适用范围。

主计算与精确对照分开：可以直接优化电路、生成 MBQC 模式、做对称性降维、分析 Lie 代数或运行张量算法。需要额外验证时，通过 `referenceMode` 选择自动、强制执行或跳过独立参考。完整参数、返回值和资源配置见[本地计算说明](docs/integrations/SCALABLE_BRIDGES.md)。

本地核验的具体输入、版本和结果保留在各接入文档的验证记录中，便于复现。

<a id="从论文方法开始一次计算"></a>
<a id="试用-sqd-与-tenpy"></a>
<a id="试用误差缓解动力学与公开基准"></a>

### 更多可复制的计算任务

<details>
<summary><strong>电路、基态、噪声、动力学与基准查询示例</strong></summary>

先完成模型配置，再按所选能力准备固定依赖。以下计算无需量子云账户；使用 uv 的能力准备各自的 Python 3.12 环境，Dynamiqs 使用已安装的 JAX 后端。升级后重启工作台并新建会话。

| 能力 | 准备命令 |
| --- | --- |
| SQD 与 TeNPy | `npm run capability:paper-tools:setup -- sqd-chemistry tenpy-ground-state` |
| Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Mitiq 误差缓解 | `npm run capability:mitiq:setup` |
| Dynamiqs、Clifft、OQuPy、Deltakit | `npm run capability:unitary:setup` |
| Clifft 记录采样与 qBraid 转换；QDMI 驱动查询 | `npm run capability:interop:setup`；QDMI 另运行 `npm run capability:qdmi:setup` 并启用连接，见[接入说明](docs/integrations/QUANTUM_INTEROP.md) |
| Metriq 公开基准查询 | 已随源码提供，完成 `npm ci` 即可，无需 Python 或额外下载 |

| 想探索什么 | 示例请求 | 重点查看 |
| --- | --- | --- |
| 演化精度与资源 | 用 hamiltonian-simulation 从两量子位全零态出发，模拟 H = XX + 0.5 ZI 的无量纲演化 t=1；分别使用二阶 Trotter、4 步和 8 步，要求独立精确参考，返回末态并比较酉矩阵误差与电路资源。 | Pauli 字符从左到右为 q0、q1；步数与误差、资源的关系 |
| 电路互操作 | 用 qBraid 把三量子位电路 H(0)、CX(0,2) 从 Qiskit 转为 Cirq，保留空闲 q1，并检查完整酉矩阵在忽略整体相位后是否一致。 | 空闲量子位、位序、转换路径与实际参考状态 |
| T 门干涉 | 用 Clifft 从两量子位全零态出发执行 H(0)、T(0)、H(0)、CX(0,1)，无噪声、4096 shots、seed=7；比较位串频数与密度矩阵参考。 | 位串从左到右为 q0、q1；有限采样误差 |
| 分子基态 | 用 SQD 计算键长 0.735 Å 的 H₂/STO-3G，使用默认合成样本，报告总能量、同基组 FCI 参考和能量差，并标明样本来源。 | 样本覆盖与能量差；合成样本的结果不构成量子优势证据 |
| 多体基态 | 用 TeNPy 计算四站点、自旋 1/2 的开放 Heisenberg 链，Jx=Jy=Jz=1，hx=hz=0。报告 DMRG 能量、精确对角化参考、能量差与纠缠熵，并注明 S=Pauli/2。 | Hamiltonian 约定、参考结果与收敛情况 |
| 噪声缓解效果 | 用 Mitiq 对单量子位 H–RZ(0.7)–H 电路的 Z 期望值做 ZNE。门去极化概率 0.02，每个比较臂每次 8192 shots，重复 8 次、seed=7；比较原始与缓解后的误差和成本。 | 经验偏差、方差和 RMSE；缓解结果也可能变差 |
| 纠错码片 | 用 Deltakit 构建 5×3 码片的 Z 存储实验，3 轮、ToyNoise p=0.02、4096 shots、seed=718，返回含噪电路、逻辑失败数和 Wilson 区间。 | 数据量子位尺寸与实际总量子位数；固定采样分母 |
| 驱动灵敏度 | 用 Dynamiqs 从计算基态出发，比较驱动幅度 0.5 和 1，失谐 0、衰减率 0.1、时长 1、20 步；采用一致的无量纲单位，返回激发态人口与末态人口对驱动的梯度。 | 自动微分与独立有限差分是否一致 |
| 环境记忆 | 用 OQuPy 从 plus 态出发，tunneling=0、bias=0.4、alpha=0.1、cutoff=2、temperature=0、duration=0.5；分别用 steps=memorySteps=8 和 12，与零温纯退相干解析式比较。 | 两组网格保持相同物理记忆时长；此算例不代表整个参数域收敛 |
| 公开设备基准 | 查询 Metriq 中 provider 包含 origin 的记录，列出设备、测试时间、基准类型、原始参数和指标，并标明来源。 | 历史数据的基准定义与实验条件；不等同于当前设备性能 |

其余论文方法也可按需安装；RandomMeas 随机测量另需 Julia 1.12.7。[完整安装与输入范围](docs/integrations/PAPER_BACKED_TOOLS.md#安装与调用)列出了各项准备条件。

这些能力已运行本地数值或数据检查，并验证了真实 Harness 的调用和会话重读；端到端测试使用本地模型协议替身，未验证外部模型自主执行或真实 QPU。当前保持 L1，返回 `scientificValidation=not_evaluated`。模型约定、资源配置与验证记录见 [Mitiq 接入说明](docs/integrations/MITIQ.md)和 [Unitary 生态接入说明](docs/integrations/UNITARY_ECOSYSTEM.md)。

</details>

<a id="执行记录与科学验收"></a>

### 方法与结果可以继续复用

工作台保存任务的请求、工具调用和返回结果，便于查看过程并继续追问。你可以调整参数、选择其他已接入的后端，或把常用研究步骤写成 Skill，供后续任务按需读取。

在支持的能力中，计算结果附带精确参考、独立检查或统计误差信息。基态求解与量子信息审计还提供完整科学验收流程，连接输入、结果文件和会话来源，便于复核。

<details>
<summary><strong>执行记录与科学验收的详细说明</strong></summary>

科研工作台保留请求、Skill 加载、工具调用、权限状态与返回结果，便于追踪一次任务的执行过程。设置中的“已启用”表示配置策略；当前工具是否可调用、服务是否可达，需要查看对应运行证据。

运行完成与科学验收分别显示。具备完整验收流程的能力会把输入、结果文件、独立检查和会话记录连接起来，生成验收报告，列出通过、失败或尚未检查的项目。其他工具按各自范围报告数值结果和检查状态。

![从计算结果、证据物化和独立检查，到结合规则与来源链的科学验收](docs/images/openquantum-evidence-flow.png)

图中展示已接入完整科学验收的能力如何形成证据；[查看可编辑图源](docs/architecture/openquantum-evidence-flow.html)。

限定量子基态求解与量子信息审计提供完整科学验收流程；QUBO、电路等价性检查和量子纠错存储实验等能力按各自规则报告计算结果与检查。验证依据见[能力声明](.agents/capability-packages.yml)、[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)和[固定量子能力 Benchmark](benchmarks/quantum-capabilities/README.md)。

[候选库接入与回归证据](docs/integrations/CANDIDATE_LIBRARIES.md)说明新增五项入口、CleitonForge 编译回归样本及 qec-burst-scaling 局域爆发噪声实验；后两项属于开发证据。

</details>

<a id="开始前的几个问题"></a>

### 常见问题

- 需要量子计算机账户或模型密钥吗？查看[本地示例](#不需要模型密钥复算一个固定案例)、[模型配置](#配置模型)与[量子云连接](#本地计算与量子云)。
- [需要先学会每套 SDK 吗？](#从问题出发调用专业能力)
- [只有文字回复，算完成计算了吗？](#让-agent-执行任务bell-态的制备与采样)
- [升级后提示需要准备环境，怎么处理？](#从已有源码升级)
- [算法示例和专业计算工具，该选哪个？](#选择合适的入口)
- [量子学习通已有完整课程吗？](#量子学习通)

## 把你的量子能力接进来

**让你的量子软件成为 Agent 可用的能力，让完整应用进入开放平台。** OpenQuantum 的 Agent-ready（面向智能体使用）扩展方式包括：用 Skill 描述工作方法，通过原生 Tool 或 MCP Server 接入计算程序。完整应用按其业务与数据边界独立集成，不必拆成单个 Tool；需要独立科学检查时，再增加 Validator 和相应证据流程。

OpenQuantum 的领域能力运行在 DeepSeek Harness 上，通用 Agent 运行、工具调度、模型连接与执行记录由 Harness 负责。

先确定用户需要解决的任务，再选择扩展方式：

| 需要增加什么 | 放在哪里 |
| --- | --- |
| 领域知识、步骤、工具选择与结果解释 | Skill，可复用已有通用或量子 Tool |
| 稳定的计算、查询或操作 | Tool，由原生 Tool Provider 或 Harness MCP Client 注册 |
| 有独立界面和任务流程的量子应用或教学产品 | 按应用边界逐项集成，保留业务、数据、权限和计算后端职责；量子学习通是现有完整应用实例 |
| 独立的科学检查与验收 | Validator；需要最终验收时再组合 Acceptance Profile、证据物化与 central Acceptance Builder |

现有 Skill、桥接实现和原生 Tool 可作为扩展参考。先读[文档与架构入口](docs/README.md)，再按需要查阅[贡献指南](CONTRIBUTING.md)、[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)和[模块地图](docs/architecture/MODULES.md)。

### 接入面向实际问题的量子应用

OpenQuantum 的接入对象不止是底层 SDK、算法和计算服务，也包括面向明确用户与具体问题的完整应用。应用可以保留自己的交互界面、任务流程、数据管理和结果展示；需要 Agent 协作时，再通过明确的执行接口连接，而不是把所有产品都改写成对话工具。

例如，后续可以探索排程优化、分子与材料计算等场景的完整应用：让使用者提交实际问题、检查输入条件、查看计算结果与适用范围，而不是从单个算法开始搭建流程。这些是接入方向，不是已经交付的应用清单。

已有完整应用集成实例是[量子学习通](#量子学习通)。其他量子应用需要逐项完成适配，明确数据权限、计算后端、运行成本和验证范围；界面接入、Agent 可调用与结果验证分别说明。应用是否使用真实 QPU、是否优于经典方法，应以各自的运行记录与对照结果为准。

<details>
<summary><strong>架构与职责：了解扩展如何进入平台</strong></summary>

![OpenQuantum 架构：科研入口进入 Harness，Agent 读取 Skill，通过原生 Tool Provider 或 Harness MCP Client 使用工具，并连接模型服务和执行日志](docs/images/openquantum-platform-overview.png)

这张图展示科研工作台的核心调用关系；[查看可编辑图源](docs/architecture/openquantum-platform-overview.html)。量子学习通的课程任务和数据沿用完整子应用的职责边界，详见[应用集成说明](docs/integrations/OPENMAIC.md)。

在开发文档中，`L3` 表示具备可回放的完整科学验收流程。Validator 产生检查结果，Acceptance Profile 定义规则，只有 central Acceptance Builder 汇聚检查结果与来源链、推导最终验收状态。能力等级不代表每一次调用都已完成验收。

Skill 与 Tool 可独立存在。计算后端按任务需要选用，只有额外的选择、步骤或解释规则有价值时才增加 Skill。进程内、同语言且无需隔离的动作优先使用原生 Tool Provider；跨语言、独立进程或远程部署时使用 MCP Server，由 Harness MCP Client 注册其 Tool。

Harness 是通用 Agent Runtime，扩展通过 Cordis Plugin 装配。UI、模型连接、量子计算和科学判定各自保持职责边界。完整外部子应用的教学任务与数据归上游应用维护，其任务不自动获得 Harness Session、科研审批或科学验收语义。

</details>

### 能力接口目录

<p>
  <a href="#内置-skills">Skill 目录</a> ·
  <a href="#mcp-服务目录">MCP 服务目录</a> ·
  <a href="#原生量子-tools">原生量子 Tools</a>
</p>

当前源码分发 **101 个内置 Skill、37 个 MCP 服务连接、5 个原生量子 Tool**。其中 66 个 Skill 来自 quantum-skills 的开源工作流适配，共用现有代码执行工具；其中 49 项提供可运行示例，覆盖 unitarylab_algorithms 的全部 39 个模块。29 个 MCP 服务使用 OpenQuantum 的本地桥接实现。Skill、Tool 和 MCP 连接分别统计。

治理清单共覆盖 **220 个可配置 Tool 名称**：196 个由 MCP 服务提供，18 个为 Harness 通用工具，6 个为平台原生工具（上面的 5 个量子动作及 1 个教学生成动作）。这是配置全集；`bash` / `pwsh` 按平台互斥，连接开关、环境和工具范围也会影响实际可调用集合。逐项决定、兼容影响与验证范围见[完整治理记录](docs/architecture/EXTENSION_GOVERNANCE.md)。

<details>
<summary><strong>内置 Skills：按研究方法查找工作流</strong></summary>

#### 内置 Skills

全量条目与完成情况见[治理清单](docs/architecture/EXTENSION_GOVERNANCE.md)；相近入口及大型可选服务的专业工具范围见[能力选择](docs/integrations/CAPABILITY_SELECTION.md)。

这 101 个 Skill 覆盖方法选择、计算实验、结果解释和平台诊断。其中 88 项可由 Agent 自动选择，13 个分类索引保留为用户手动导航；原名称和手动调用均可继续使用。点击名称即可查看完整的 `SKILL.md`；所需工具与连接分别配置。新增算法工作流的参数、安装与开源替换差异见[运行说明](examples/quantum-algorithms/README.md)。

下表按**研究方法与用途**介绍能力。各 Tool 提供的模型、参数和输入格式见[计算参数与运行方式](#计算参数与运行方式)。

##### 电路构建、变换与仿真

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qiskit-circuit-workbench`](.agents/skills/qiskit-circuit-workbench/SKILL.md) | 量子电路分析、格式转换、转译比较与 Qiskit 文档查证 | `qiskit`、`qiskit_docs` |
| [`flagquantum-workbench`](.agents/skills/flagquantum-workbench/SKILL.md) | 第二家量子 MCP 电路工作台 | `flagquantum`；[使用说明](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`tyxonq-workbench`](.agents/skills/tyxonq-workbench/SKILL.md) | 门电路仿真、态矢演化、量子噪声与采样分布分析 | `tyxonq_local` |
| [`pyzx-optimization`](.agents/skills/pyzx-optimization/SKILL.md) | ZX 重写、Clifford+T 优化与电路提取 | `pyzx_local` |
| [`compact-optimization`](.agents/skills/compact-optimization/SKILL.md) | 线路优化与独立等价对照 | `compact_local`；[使用说明](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`hamiltonian-simulation`](.agents/skills/hamiltonian-simulation/SKILL.md) | Trotter/qDrift 演化电路、态矢量与独立误差对照 | `hamiltonian_local`；[使用说明](docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md) |
| [`qcut-knitting`](.agents/skills/qcut-knitting/SKILL.md) | 门切割与期望值重建 | `qcut_local`；[使用说明](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`graphix-mbqc`](.agents/skills/graphix-mbqc/SKILL.md) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | `graphix_local` |
| [`quantum-circuit-verification`](.agents/skills/quantum-circuit-verification/SKILL.md) | 量子电路等价性验证、优化前后对照与全局相位差异判定 | `qcec_local` |
| [`clifft-sampling`](.agents/skills/clifft-sampling/SKILL.md) | Clifford+T 噪声采样、Stim 格式记录与 detector/observable 原始奇偶值 | `clifft_local` |
| [`qbraid-conversion`](.agents/skills/qbraid-conversion/SKILL.md) | Qiskit/Cirq 酉电路转换、OpenQASM 2 导出与位序等价对照 | `qbraid_local` |

##### 量子态与测量

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-information-audit`](.agents/skills/quantum-information-audit/SKILL.md) | 量子态合法性检查、密度矩阵性质分析与纠缠诊断 | `toqito_audit`；支持完整科学验收流程 |
| [`randomized-measurements`](.agents/skills/randomized-measurements/SKILL.md) | 局域随机测量、子区纯度估计与有限样本误差分析 | `random_meas_local` |

##### 基态、化学与优化方法

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-ground-state`](.agents/skills/quantum-ground-state/SKILL.md) | 变分量子本征求解（VQE）、基态能量估计与独立精确参考比较 | 原生 `solve_and_validate_ground_state`；支持完整科学验收流程 |
| [`sqd-chemistry`](.agents/skills/sqd-chemistry/SKILL.md) | 量子化学的采样子空间对角化、测量频数后处理与电子基态能量分析 | `sqd_local` |
| [`tenpy-ground-state`](.agents/skills/tenpy-ground-state/SKILL.md) | 张量网络 DMRG 基态求解、磁性观测量与纠缠结构分析 | `tenpy_local` |
| [`flow-vqe`](.agents/skills/flow-vqe/SKILL.md) | 流模型辅助的 VQE 参数学习、低能量态搜索与基线比较 | `flow_vqe_local` |
| [`openqarp-excited-states`](.agents/skills/openqarp-excited-states/SKILL.md) | VQD 激发态、残差与正交性 | `openqarp_local`；[使用说明](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`cqlib-kernel`](.agents/skills/cqlib-kernel/SKILL.md) | 角度编码核与 QSVM | `cqlib_kernel_local`；[使用说明](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`symmer-tapering`](.agents/skills/symmer-tapering/SKILL.md) | 指定 Pauli 对称性扇区的降比特与同扇区保谱检查 | `symmer_local` |
| [`paulie-algebra`](.agents/skills/paulie-algebra/SKILL.md) | Pauli 生成元的 Lie 代数分类、精确维数与可选闭包 | `paulie_local` |
| [`qpanda-qubo`](.agents/skills/qpanda-qubo/SKILL.md) | 组合优化问题的 QUBO 建模、约束转换、经典求解与本地 QAOA 对照 | `qpanda_qubo` |

##### 误差缓解与量子纠错

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`mitiq-error-mitigation`](.agents/skills/mitiq-error-mitigation/SKILL.md) | 量子误差缓解方法比较、采样预算规划与误差成本分析，涵盖 ZNE、REM、PEC、CDR | `mitiq_local`；[使用说明](docs/integrations/MITIQ.md) |
| [`qec-memory-experiment`](.agents/skills/qec-memory-experiment/SKILL.md) | 表面码存储实验、噪声采样、MWPM 译码与逻辑错误率分析 | `qec_local` |
| [`deltakit-qec`](.agents/skills/deltakit-qec/SKILL.md) | 表面码码片建模、噪声实验、采样与译码性能分析 | `deltakit_local` |
| [`ldpc-decoding`](.agents/skills/ldpc-decoding/SKILL.md) | 二元校验矩阵的 BP+LSD 解码与 syndrome 一致性检查 | `ldpc_local` |

##### 开放系统动力学

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`dynamiqs-dynamics`](.agents/skills/dynamiqs-dynamics/SKILL.md) | 开放系统 Lindblad 动力学、驱动参数扫描与自动微分灵敏度分析 | `dynamiqs_local` |
| [`oqupy-dynamics`](.agents/skills/oqupy-dynamics/SKILL.md) | 非马尔可夫开放系统动力学、环境记忆效应与 TEMPO 数值收敛分析 | `oqupy_local` |
| [`tjm-dynamics`](.agents/skills/tjm-dynamics/SKILL.md) | 开放多体系统的张量跳跃轨迹模拟、耗散演化与参考结果比较 | `tjm_local` |

##### 实验模拟与硬件

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qmclaw-workbench`](.agents/skills/qmclaw-workbench/SKILL.md) | 超导量子比特调校实验设计、测量流程模拟与合成数据分析，覆盖 S21、Rabi、Ramsey、T₁ 等 | 原生 `list_qmclaw_experiments`、`simulate_qmclaw_experiment` |
| [`fatqat-workbench`](.agents/skills/fatqat-workbench/SKILL.md) | 量子电路与硬件原生门约束分析、transmon 泄漏及里德堡原子动力学 | `fatqat_local`；[使用说明](docs/integrations/FATQAT.md) |
| [`fieldqkit-hardware`](.agents/skills/fieldqkit-hardware/SKILL.md) | 量子云设备发现、量子位与拓扑筛选、接入条件检查 | `fieldqkit`；只读设备发现 |
| [`qdmi-device`](.agents/skills/qdmi-device/SKILL.md) | 已配置 QDMI 驱动的设备、门集与耦合关系查询 | `qdmi_local`；默认关闭，需显式准备驱动 |

##### 方法选型与平台支持

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-sdk-advisor`](.agents/skills/quantum-sdk-advisor/SKILL.md) | 量子 SDK 选型、迁移比较与 PoC 技术路线规划 | 知识型 Skill，按任务使用已有通用 Tool |
| [`platform-diagnostics`](.agents/skills/platform-diagnostics/SKILL.md) | 工作台、工具与模型联调排障，形成可追溯的诊断报告 | Harness 通用 Tool 与本地诊断脚本 |

<!-- BEGIN OPEN ALGORITHM SKILLS -->
##### 开源算法与后端工作流

66 个适配 Skill 共用现有执行工具；49 个算法示例覆盖原库的 39 个模块和指南新增方法。13 个分类索引保留为手动导航，53 个方法与入口可由 Agent 自动选择。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-guide-algorithms`](.agents/skills/quantum-guide-algorithms/SKILL.md) | algorithms 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-algorithms-cryptography`](.agents/skills/quantum-guide-algorithms-cryptography/SKILL.md) | algorithms/cryptography 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-discrete-log`](.agents/skills/quantum-discrete-log/SKILL.md) | 可逆 g^a y^b oracle、循环群 Fourier 采样与同余恢复 | 已有 Harness `bash` / `pwsh`；`discrete_log` 开源示例 |
| [`quantum-shor`](.agents/skills/quantum-shor/SKILL.md) | 可逆模乘 oracle、QPE/连分数和因子验证 | 已有 Harness `bash` / `pwsh`；`shor` 开源示例 |
| [`quantum-simon`](.agents/skills/quantum-simon/SKILL.md) | 二对一 XOR oracle、Hadamard 采样和 GF(2) 零空间恢复 | 已有 Harness `bash` / `pwsh`；`simon` 开源示例 |
| [`quantum-guide-algorithms-eigensolvers`](.agents/skills/quantum-guide-algorithms-eigensolvers/SKILL.md) | algorithms/eigensolvers 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-numpy-minimum-eigensolver`](.agents/skills/quantum-numpy-minimum-eigensolver/SKILL.md) | NumPy 最小本征对，明确标记经典算法并报告残差。 | 已有 Harness `bash` / `pwsh`；`numpy_minimum_eigensolver` 开源示例 |
| [`quantum-numpy-eigensolver`](.agents/skills/quantum-numpy-eigensolver/SKILL.md) | NumPy Hermitian 稠密本征求解，明确标记经典算法并报告特征残差。 | 已有 Harness `bash` / `pwsh`；`numpy_eigensolver` 开源示例 |
| [`quantum-vqd`](.agents/skills/quantum-vqd/SKILL.md) | 通过逐态重叠惩罚求激发态（VQD），报告能量与态间重叠 | 已有 Harness `bash` / `pwsh`；`vqd` 开源示例 |
| [`quantum-guide-algorithms-gradients`](.agents/skills/quantum-guide-algorithms-gradients/SKILL.md) | algorithms/gradients 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-finite-difference`](.agents/skills/quantum-finite-difference/SKILL.md) | Qiskit FiniteDiffEstimatorGradient，中心差分与显式 epsilon。 | 已有 Harness `bash` / `pwsh`；`finite_difference` 开源示例 |
| [`quantum-linear-combination`](.agents/skills/quantum-linear-combination/SKILL.md) | Qiskit LinCombEstimatorGradient，实际生成线性组合导数电路。 | 已有 Harness `bash` / `pwsh`；`linear_combination` 开源示例 |
| [`quantum-parameter-shift`](.agents/skills/quantum-parameter-shift/SKILL.md) | Qiskit ParamShiftEstimatorGradient，RY 参数移位规则。 | 已有 Harness `bash` / `pwsh`；`parameter_shift` 开源示例 |
| [`quantum-qfi`](.agents/skills/quantum-qfi/SKILL.md) | Qiskit QFI/ReverseQGT，纯态量子 Fisher 信息 | 已有 Harness `bash` / `pwsh`；`qfi` 开源示例 |
| [`quantum-reverse`](.agents/skills/quantum-reverse/SKILL.md) | Qiskit ReverseEstimatorGradient，反向态矢量导数。 | 已有 Harness `bash` / `pwsh`；`reverse` 开源示例 |
| [`quantum-spsa`](.agents/skills/quantum-spsa/SKILL.md) | Qiskit SPSAEstimatorGradient，显式 epsilon、批量与随机种子 | 已有 Harness `bash` / `pwsh`；`spsa` 开源示例 |
| [`quantum-guide-algorithms-hamiltonian-simulation`](.agents/skills/quantum-guide-algorithms-hamiltonian-simulation/SKILL.md) | algorithms/hamiltonian-simulation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cartan`](.agents/skills/quantum-cartan/SKILL.md) | 实对称 Hamiltonian 的 SO(N) 谱 Cartan 分解 | 已有 Harness `bash` / `pwsh`；`cartan` 开源示例 |
| [`quantum-qdrift`](.agents/skills/quantum-qdrift/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qdrift` 开源示例 |
| [`quantum-hamiltonian-qsp`](.agents/skills/quantum-hamiltonian-qsp/SKILL.md) | 偶/奇 QSP 多项式通过 LCU 合成 exp(-iHt) | 已有 Harness `bash` / `pwsh`；`hamiltonian_qsp` 开源示例 |
| [`quantum-taylor`](.agents/skills/quantum-taylor/SKILL.md) | 截断 Taylor 级数展开为 Pauli LCU，实际执行 PREPARE/SELECT/unprepare 并报告后选择概率 | 已有 Harness `bash` / `pwsh`；`taylor` 开源示例 |
| [`quantum-trotter`](.agents/skills/quantum-trotter/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`trotter` 开源示例 |
| [`quantum-guide-algorithms-linear-systems`](.agents/skills/quantum-guide-algorithms-linear-systems/SKILL.md) | algorithms/linear-systems 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-aqc`](.agents/skills/quantum-aqc/SKILL.md) | 正定 Hermitian 系统的绝热线性求解路径、条件数相关 schedule 与分片幺正演化 | 已有 Harness `bash` / `pwsh`；`aqc` 开源示例 |
| [`quantum-hhl`](.agents/skills/quantum-hhl/SKILL.md) | Hermitian 非奇异 A、QPE、有符号倒数旋转、反 QPE 与后选择 | 已有 Harness `bash` / `pwsh`；`hhl` 开源示例 |
| [`quantum-lcu`](.agents/skills/quantum-lcu/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`lcu` 开源示例 |
| [`quantum-qsvt-qlsa`](.agents/skills/quantum-qsvt-qlsa/SKILL.md) | Hermitian 非奇异矩阵，PennyLane QSVT 和受控 U/U† 后选择 | 已有 Harness `bash` / `pwsh`；`qsvt_qlsa` 开源示例 |
| [`quantum-qft`](.agents/skills/quantum-qft/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qft` 开源示例 |
| [`quantum-qsp`](.agents/skills/quantum-qsp/SKILL.md) | QSP/QSVT 相位综合计算 cos(t x) 的有界偶次多项式 | 已有 Harness `bash` / `pwsh`；`qsp` 开源示例 |
| [`quantum-vqls`](.agents/skills/quantum-vqls/SKILL.md) | Qiskit 参数电路与全局归一化残差 cost 的变分线性求解 | 已有 Harness `bash` / `pwsh`；`vqls` 开源示例 |
| [`quantum-guide-algorithms-primitives`](.agents/skills/quantum-guide-algorithms-primitives/SKILL.md) | algorithms/primitives 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-amplitude-amplification`](.agents/skills/quantum-amplitude-amplification/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_amplification` 开源示例 |
| [`quantum-amplitude-estimation`](.agents/skills/quantum-amplitude-estimation/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_estimation` 开源示例 |
| [`quantum-grover`](.agents/skills/quantum-grover/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`grover` 开源示例 |
| [`quantum-hadamard-test`](.agents/skills/quantum-hadamard-test/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_test` 开源示例 |
| [`quantum-hadamard-transform`](.agents/skills/quantum-hadamard-transform/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_transform` 开源示例 |
| [`quantum-qpe`](.agents/skills/quantum-qpe/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qpe` 开源示例 |
| [`quantum-guide-algorithms-quantum-chemistry`](.agents/skills/quantum-guide-algorithms-quantum-chemistry/SKILL.md) | algorithms/quantum-chemistry 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-molecular-dmrg`](.agents/skills/quantum-molecular-dmrg/SKILL.md) | PySCF 活性空间积分、Jordan-Wigner MPO 与 quimb 双站点 DMRG。使用开源态制备替换闭源 CVD | 已有 Harness `bash` / `pwsh`；`molecular_dmrg` 开源示例 |
| [`quantum-qldpc`](.agents/skills/quantum-qldpc/SKILL.md) | HGP CSS 校验矩阵、GF(2) 秩、交换关系和 syndrome | 已有 Harness `bash` / `pwsh`；`qldpc` 开源示例 |
| [`quantum-guide-algorithms-quantum-machine-learning`](.agents/skills/quantum-guide-algorithms-quantum-machine-learning/SKILL.md) | algorithms/quantum-machine-learning 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cvqnn`](.agents/skills/quantum-cvqnn/SKILL.md) | 两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层 | 已有 Harness `bash` / `pwsh`；`cvqnn` 开源示例 |
| [`quantum-fermi-hubbard-vqe`](.agents/skills/quantum-fermi-hubbard-vqe/SKILL.md) | 开放边界 Hubbard 链，Jordan-Wigner 与全 Fock 空间 VQE | 已有 Harness `bash` / `pwsh`；`fermi_hubbard_vqe` 开源示例 |
| [`quantum-ising`](.agents/skills/quantum-ising/SKILL.md) | 开放边界二维矩形 Ising 网格，quimb MPS 与二阶 Strang 演化 | 已有 Harness `bash` / `pwsh`；`ising` 开源示例 |
| [`quantum-qaoa`](.agents/skills/quantum-qaoa/SKILL.md) | 无权 MaxCut 的交替 cost/mixer 电路与参数优化 | 已有 Harness `bash` / `pwsh`；`qaoa` 开源示例 |
| [`quantum-qcbm`](.agents/skills/quantum-qcbm/SKILL.md) | 参数电路 Born 分布拟合目标概率，KL 目标与 total variation 对照。 | 已有 Harness `bash` / `pwsh`；`qcbm` 开源示例 |
| [`quantum-vqc`](.agents/skills/quantum-vqc/SKILL.md) | RY 特征编码与参数电路二分类 | 已有 Harness `bash` / `pwsh`；`vqc` 开源示例 |
| [`quantum-vqe`](.agents/skills/quantum-vqe/SKILL.md) | 实 Pauli Hamiltonian、RY/RZ/CX ansatz 和 SciPy 优化 | 已有 Harness `bash` / `pwsh`；`vqe` 开源示例 |
| [`quantum-guide-algorithms-schrodingerization`](.agents/skills/quantum-guide-algorithms-schrodingerization/SKILL.md) | algorithms/schrodingerization 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-advection`](.agents/skills/quantum-advection/SKILL.md) | 周期边界、常速一维平流，中心差分和显式薛定谔化电路 | 已有 Harness `bash` / `pwsh`；`advection` 开源示例 |
| [`quantum-heat-1d`](.agents/skills/quantum-heat-1d/SKILL.md) | 齐次一维热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_1d` 开源示例 |
| [`quantum-heat-2d`](.agents/skills/quantum-heat-2d/SKILL.md) | 齐次二维方形网格热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_2d` 开源示例 |
| [`quantum-guide-algorithms-search`](.agents/skills/quantum-guide-algorithms-search/SKILL.md) | algorithms/search 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-glued-trees`](.agents/skills/quantum-glued-trees/SKILL.md) | 随机交替叶环连接的双树连续时间邻接矩阵量子行走 | 已有 Harness `bash` / `pwsh`；`glued_trees` 开源示例 |
| [`quantum-hidden-shift`](.agents/skills/quantum-hidden-shift/SKILL.md) | 偶数位二次 bent 函数的 shifted/dual 相位 oracle | 已有 Harness `bash` / `pwsh`；`hidden_shift` 开源示例 |
| [`quantum-guide-algorithms-state-preparation`](.agents/skills/quantum-guide-algorithms-state-preparation/SKILL.md) | algorithms/state-preparation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-mottonen`](.agents/skills/quantum-mottonen/SKILL.md) | PennyLane Möttönen 均匀受控旋转态制备 | 已有 Harness `bash` / `pwsh`；`mottonen` 开源示例 |
| [`quantum-mps`](.agents/skills/quantum-mps/SKILL.md) | SVD 分解、可选键截断、显式右规范化与 PennyLane MPSPrep | 已有 Harness `bash` / `pwsh`；`mps` 开源示例 |
| [`quantum-multiplexer`](.agents/skills/quantum-multiplexer/SKILL.md) | Qiskit StatePreparation/Isometry 的均匀受控门合成 | 已有 Harness `bash` / `pwsh`；`multiplexer` 开源示例 |
| [`quantum-pauli`](.agents/skills/quantum-pauli/SKILL.md) | PennyLane ArbitraryStatePreparation 的 Pauli 旋转优化 | 已有 Harness `bash` / `pwsh`；`pauli` 开源示例 |
| [`quantum-superposition`](.agents/skills/quantum-superposition/SKILL.md) | PennyLane Superposition 的计算基叠加与辅助位清零 | 已有 Harness `bash` / `pwsh`；`superposition` 开源示例 |
| [`quantum-algorithms`](.agents/skills/quantum-algorithms/SKILL.md) | root 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators`](.agents/skills/quantum-guide-simulators/SKILL.md) | simulators 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-simulators-pennylane`](.agents/skills/quantum-guide-simulators-pennylane/SKILL.md) | simulators/pennylane 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-qiskit`](.agents/skills/quantum-guide-simulators-qiskit/SKILL.md) | simulators/qiskit 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-unitarylab`](.agents/skills/quantum-guide-simulators-unitarylab/SKILL.md) | simulators/unitarylab 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
<!-- END OPEN ALGORITHM SKILLS -->

</details>

<details>
<summary><strong>MCP 服务目录：用途、默认开关与准备条件</strong></summary>

#### MCP 服务目录

**OpenQuantum 为 29 项计算与设备发现能力开发了本地 MCP 桥接**，另直接接入 8 个上游 MCP 服务。下表按用途分组：本地桥接链接到仓库源码并保留上游来源，直接接入的服务明确标记为“上游服务”。

默认 Preset 共声明 37 个 MCP 服务连接：**28 个默认开启（其中 Qiskit 两项可通过离线开关关闭），9 个按需启用**。连接名对应配置中的 `serverName`；“默认开启”表示配置策略，使用前仍需准备依赖和必要凭据。

这些 MCP Server 都由本机以 `stdio` 方式启动，不是 OpenQuantum 提供的公共托管端点。其中一部分 Tool 在本地计算，另一部分再访问厂商文档或量子云；“本地启动 MCP Server”不代表所有数据处理都留在本地。

##### 本地电路工作流

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit`](https://github.com/Qiskit/mcp-servers) · Qiskit Circuits（上游服务） | 电路读取、分析、转译与 QASM/QPY 转换 | 默认开启¹ | `uvx`；电路操作无需云凭据，首次启动可能下载依赖 |
| [`flagquantum`](.agents/skills/flagquantum-workbench/mcp/server.mjs) · [FlagQuantum](https://github.com/FlagQuantum/mcp-servers)（上游服务） | 第二家量子 MCP 电路工作台 | 默认关闭 | Python 3.12 + uv；本地计算、无需云凭据；[范围](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`tyxonq_local`](.agents/skills/tyxonq-workbench/mcp/server.mjs) · [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路与噪声仿真 | 默认关闭 | 手动开启；显式准备较大的 Python 环境，无需云凭据 |
| [`pyzx_local`](.agents/skills/pyzx-optimization/mcp/server.mjs) · [PyZX](https://github.com/zxcalc/pyzx) | ZX 重写、Clifford+T 优化与电路提取 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`compact_local`](.agents/skills/compact-optimization/mcp/server.mjs) · [Compact](https://github.com/Q-PROOF/Compact) | 线路优化与独立等价对照 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`hamiltonian_local`](.agents/skills/hamiltonian-simulation/mcp/server.mjs) · [UnitaryLab MIT 算法适配](https://github.com/unitarylab/unitarylab_algorithms) | Trotter/qDrift 哈密顿量演化 | 默认开启 | 显式运行 `npm run capability:hamiltonian:setup`；Qiskit/NumPy/SciPy 开放依赖；[范围](docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md) |
| [`qcut_local`](.agents/skills/qcut-knitting/mcp/server.mjs) · [QCut](https://github.com/FiQCI/QCut) | 门切割与期望值重建 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`graphix_local`](.agents/skills/graphix-mbqc/mcp/server.mjs) · [Graphix](https://github.com/TeamGraphix/graphix) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`qcec_local`](.agents/skills/quantum-circuit-verification/mcp/server.mjs) · [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | unitary 电路等价性检查 | 默认开启 | `uv`；本地运行，无需云凭据；不接受动态电路或任意文件路径 |
| [`clifft_local`](.agents/skills/clifft-sampling/mcp/server.mjs) · [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 最终测量与 Stim 格式纠错记录采样 | 默认开启 | uv；CPU 固定 shots，原始奇偶值需另行解码；[安装与范围](docs/integrations/QUANTUM_INTEROP.md) |
| [`qbraid_local`](.agents/skills/qbraid-conversion/mcp/server.mjs) · [qBraid](https://github.com/qBraid/qBraid) | Qiskit/Cirq 双向本地转换与可选完整酉矩阵对照 | 默认开启 | uv；结构化酉电路，无云任务；[安装与范围](docs/integrations/QUANTUM_INTEROP.md) |

##### 量子态与测量

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`toqito_audit`](.agents/skills/quantum-information-audit/mcp/server.mjs) · [toqito](https://github.com/vprusso/toqito) | 密度矩阵与纠缠指标计算、独立检查；可接物化验收链 | 默认开启 | `uv`；本地运行，无需云凭据；完整调用会保存科研证据 |
| [`random_meas_local`](.agents/skills/randomized-measurements/mcp/server.mjs) · [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 局域随机测量与子区纯度估计 | 默认开启 | Julia 1.12.7；先准备固定依赖；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

##### 基态、化学与优化方法

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`sqd_local`](.agents/skills/sqd-chemistry/mcp/server.mjs) · [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 分子与活性空间 SQD、可选 FCI 参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`tenpy_local`](.agents/skills/tenpy-ground-state/mcp/server.mjs) · [TeNPy](https://github.com/tenpy/tenpy) | 有限 XYZ 链 DMRG 基态与精确参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`flow_vqe_local`](.agents/skills/flow-vqe/mcp/server.mjs) · [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | Pauli Hamiltonian 的 flow 参数学习与随机搜索比较 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`openqarp_local`](.agents/skills/openqarp-excited-states/mcp/server.mjs) · [OpenQARP](https://github.com/OpenQARP/openqarp) | VQD 激发态、残差与正交性 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`cqlib_kernel_local`](.agents/skills/cqlib-kernel/mcp/server.mjs) · [cqlib-qml](https://github.com/cq-lib/cqlib-qml) | 角度编码核与 QSVM | 默认关闭 | Python 3.12 + uv；本地计算、无需云凭据；首次构建需 Rust ≥1.89，固定 beta SDK；[范围](docs/integrations/CANDIDATE_LIBRARIES.md) |
| [`symmer_local`](.agents/skills/symmer-tapering/mcp/server.mjs) · [Symmer](https://github.com/qmatter-labs/symmer) | 指定 Pauli 对称性扇区的降比特与同扇区保谱检查 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`paulie_local`](.agents/skills/paulie-algebra/mcp/server.mjs) · [PauLie](https://github.com/QPauLie/PauLie) | Pauli 生成元的 Lie 代数分类、精确维数与可选闭包 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`qpanda_qubo`](.agents/skills/qpanda-qubo/mcp/server.mjs) · [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | QUBO 编译、枚举复核、经典求解与可选本地 QAOA | 默认开启 | `uv`；本地 CPU 模拟器，无需本源云凭据 |

##### 误差缓解与纠错

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`mitiq_local`](.agents/skills/mitiq-error-mitigation/mcp/server.mjs) · [Mitiq](https://github.com/unitaryfoundation/mitiq) | ZNE、REM、PEC、CDR 噪声实验与有限采样统计 | 默认开启 | uv；隔离 Python 3.12 环境，能力目录 GPL-3.0-only；[接入说明](docs/integrations/MITIQ.md) |
| [`qec_local`](.agents/skills/qec-memory-experiment/mcp/server.mjs) · [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | surface-code memory 实验、MWPM 解码与逻辑错误率统计 | 默认开启 | `uv`；本地运行，无需云凭据；用户选择 shots、seed 与噪声参数 |
| [`deltakit_local`](.agents/skills/deltakit-qec/mcp/server.mjs) · [Deltakit](https://github.com/Deltakit/deltakit) | 纠错存储电路构建与本地噪声实验 | 默认开启 | uv；ToyNoise、Stim、PyMatching；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`ldpc_local`](.agents/skills/ldpc-decoding/mcp/server.mjs) · [BP+LSD](https://github.com/quantumgizmos/ldpc) | 二元校验矩阵的纠错解码与 syndrome 检查 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

##### 开放系统动力学

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`dynamiqs_local`](.agents/skills/dynamiqs-dynamics/mcp/server.mjs) · [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 驱动扫描、耗散动力学与自动微分 | 默认开启 | uv、隔离 Python 3.12；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`oqupy_local`](.agents/skills/oqupy-dynamics/mcp/server.mjs) · [OQuPy](https://github.com/tempoCollaboration/OQuPy) | Ohmic spin-boson TEMPO | 默认开启 | uv；独立 NumPy 1.x 环境；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`tjm_local`](.agents/skills/tjm-dynamics/mcp/server.mjs) · [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 开放 Ising 链张量轨迹与 Lindblad 参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

##### 实验模拟

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`fatqat_local`](.agents/skills/fatqat-workbench/mcp/server.mjs) · [FatQat](https://github.com/spaceqat/fatqat) | 电路与硬件约束、超导和中性原子脉冲动力学 | 默认开启 | 显式准备锁定 Python 环境；数值计算本地运行，无云凭据或 QPU 操作 |

##### 资料与设备发现

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_docs`](https://github.com/Qiskit/mcp-servers) · Qiskit Docs（上游服务） | Qiskit 文档搜索、页面读取和 IBM Quantum 错误码查询 | 默认开启¹ | `uvx`；文档访问需要网络，无需云凭据 |
| [`fieldqkit`](.agents/skills/fieldqkit-hardware/mcp/server.mjs) · [FieldQKit](https://github.com/FieldQuantum/fieldqkit) | 凭据状态检查、国内量子云后端发现和筛选 | 默认开启 | `uv`；发现对应云后端需要相应凭据；不提交或取消任务 |
| [`qdmi_local`](.agents/skills/qdmi-device/mcp/server.mjs) · [QDMI](https://github.com/Munich-Quantum-Software-Stack/QDMI) | 设备、门集与耦合的只读发现 | 默认关闭 | 显式准备固定驱动；官方示例不代表真实硬件；[安装与范围](docs/integrations/QUANTUM_INTEROP.md) |

##### 量子云任务

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_ibm_runtime`](https://github.com/Qiskit/mcp-servers) · IBM Runtime（上游服务） | IBM 后端查询、任务提交、结果读取与取消 | 默认关闭 | 手动开启；`uvx`、IBM Token 与可用账户额度；任务操作可能产生费用 |
| [`quantum_hardware`](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 社区硬件服务（上游服务） | IBM / IonQ 设备查询、任务提交与取消、成本估算 | 默认关闭 | 先安装固定源码并配置 IBM Token；IonQ 操作另需相应 Key；真实任务需授权 |
| [`qpanda_runtime`](https://github.com/OriginQ/qpanda3-runtime-mcp-server) · 本源运行时（上游服务） | 悟空 QPU 设备查询，采样、期望值、批量任务与任务管理 | 默认关闭 | 先安装固定源码并配置本源凭据；真实任务需要权限、额度与授权 |

##### 专用转译与训练服务

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_ibm_transpiler`](https://github.com/Qiskit/mcp-servers) · IBM Transpiler（上游服务） | AI 电路路由、综合与混合转译 | 默认关闭 | 手动开启；`uvx`、IBM Token 与服务权限；调用 IBM 服务 |
| [`qiskit_gym`](https://github.com/Qiskit/mcp-servers) · Qiskit Gym（上游服务） | 强化学习电路综合、训练环境与模型管理 | 默认关闭 | 手动开启；`uvx`；训练、进程和模型文件操作有副作用 |

¹ 两项 Qiskit 服务在未设置 `OPENQUANTUM_DISABLE_QISKIT_MCP=1` 时默认开启。设置中心可以覆盖连接策略；修改 MCP 连接配置后需要重启 Harness。

本地桥接中的数值算法和 SDK 来自相应上游项目；OpenQuantum 负责桥接接口、输入范围、调用流程及适用的结果检查。本地计算环境在显式准备时安装；上游服务启动仍可能物化自身依赖，SDK 计算也可能创建缓存。完整调用副作用见[能力合同](.agents/capability-packages.yml)。

启用与验证入口：设置中心 → MCP Server 连接 → 配置必要凭据 → 重启 Harness → 查看运行证据。`quantum_hardware` 和 `qpanda_runtime` 还需分别先运行 `npm run mcp:quantum-hardware:setup`、`npm run mcp:qpanda-runtime:setup`。完整 Tool 名称与副作用声明见[能力合同](.agents/capability-packages.yml)；连接与凭据引用见 [Agent Preset](runtime/openquantum/agent-presets/openquantum/agent.cordis.yml)。

</details>

<details>
<summary><strong>原生量子 Tools：动作与副作用</strong></summary>

#### 原生量子 Tools

OpenQuantum 提供以下 5 个原生量子动作，用于基态求解、调校实验模拟和研究资料查询。它们由本仓库的[原生计算 Tool Provider](runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs)、[算法参考 Tool Provider](runtime/openquantum/agent-presets/openquantum/quantum-practices-tools.mjs)和 [Metriq 数据 Tool Provider](runtime/openquantum/agent-presets/openquantum/metriq-data-tools.mjs)在进程内注册，默认 Preset 已包含它们。这里单独统计量子领域动作；Harness 自带的文件、终端等通用 Tools 不计入。

| 原生 Tool | 做什么 | 完整调用的边界 |
| --- | --- | --- |
| `solve_and_validate_ground_state` | 计算限定二量子位基态并执行独立检查；完整流程保存结果和会话证据后生成科学验收报告 | 本地科研证据写入，`workspace-write`；不是通用分子求解或真机任务 |
| `list_qmclaw_experiments` | 列出 [QMClaw](https://github.com/QMC-AI/QMClaw) 的 13 类实验及支持范围 | 只读目录查询，`read-only`；不连接仪器 |
| `simulate_qmclaw_experiment` | 运行带 seed 的 QMClaw 合成数据实验 | 只读计算，`read-only`；不连接 LabRAD/lqms，不写回真实校准参数 |
| `quantum_practices` | 搜索和读取 66 份固定版本的算法参考指南，支持中文算法名；用于方法比较、假设核对与实验设计 | 本地资料检索，`read-only`；不安装或执行 UnitaryLab 模拟器；[使用与验证](docs/integrations/QUANTUM_PRACTICES.md) |
| `metriq_benchmarks` | 按厂商、设备、基准类型或文字检索 410 条去重后的公开记录，读取原始参数与指标 | 固定本地快照，`read-only`；逐次返回来源与 CC-BY-4.0 署名；[范围与验证](docs/integrations/UNITARY_ECOSYSTEM.md) |

</details>

### 开发与验证

<details>
<summary><strong>配置检查、数值回归与端到端验证</strong></summary>

```bash
# 检查 Harness 组合配置
npm run harness:config

# 运行完整离线质量检查
npm run check

# macOS/Linux：用固定依赖运行本地数值回归与 Harness 接线验证
npm run capability:mitiq:live
npm run capability:unitary:live
npm run capability:candidates:live
npm run capability:hamiltonian:live
npm run capability:interop:live
npm run capability:algorithms:live
npm run benchmark:candidate-regressions

# 配置模型后运行真实 Agent 端到端测试
npm run e2e:quantum-harness -- --provider openquantum-public
```

```text
.agents/skills/          量子 Skill 与科学资源
examples/quantum-algorithms/  可修改的开源算法示例、输入说明与覆盖映射
runtime/openquantum/     Agent Preset、原生 Tool Provider、Harness MCP Client 声明和 Harness 界面扩展
src/settings/server/     设置中心的服务端配置边界
src/readiness/server/    当前 Harness Registry 的只读运行状态边界
scripts/                 启动、诊断和端到端测试
tests/                   平台集成测试
docs/                    架构、路线与生态文档
```

更完整的文档入口见 [docs/README.md](docs/README.md)。

[固定量子能力 Benchmark](benchmarks/quantum-capabilities/README.md)使用 [MQT Bench](https://github.com/munich-quantum-toolkit/bench) 的 3 个固定电路案例与 manifest 做开发回归，属于开发与 CI 证据，不是 Skill 或 MCP 服务。

源码升级的固定版本、兼容性和验证记录见 [2026-09-22 量子库更新](docs/releases/2026-09-22-quantum-upstream-update.md)及 [2026-09-10 平台升级](docs/releases/2026-09-10-upstream-update.md)。应用安装包的变化另见[发布说明](docs/releases/v0.5.1.md)。

2026-09-24 的[算法适配](docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md)、[本地互操作](docs/integrations/QUANTUM_INTEROP.md)和[治理证据](docs/integrations/evidence/extension-governance-2026-09-24.json)分别记录源码接入、实际 SDK 计算与 Harness 会话验证；这些记录不代表新安装包发布、外部模型或真实硬件验收。

</details>

<a id="可选上游-skill-与开发证据"></a>

### 可选上游 Skill

[OriginQ 官方 `pyqpanda3` Skill](https://github.com/OriginQ/pyqpanda3-skill) 提供电路编程、算法模板、迁移与 QCloud 使用指导。它**不计入上面的 101 个内置 Skill，也不会在首次启动时自动安装**；运行 `npm run skill:qpanda:setup` 后，固定审阅版本才会进入项目 Skill 目录。安装这个 Skill 不会自动启用 `qpanda_runtime`，也不会赋予云任务权限。

## 长期发展规划

**从使用已有能力，走向共同创造新能力。** 我们将持续建设开放的量子 Agent 与应用平台，让专业方法、计算资源、完整应用、实验仪器和学习资源各有入口，并在适用范围内协作。下面是长期建设方向，不是当前交付清单；能力将通过逐项接入与验证交付。

### 平台基础

| 长期主线 | 我们将持续建设什么 |
| --- | --- |
| **0 · 更好用的量子 Agent** | 持续完善任务理解、方法选择、工具调用、结果解释与失败恢复，让用户从提出需求走向实际计算。以真实任务的完成质量、时间与成本衡量进步。 |
| **1 · Agent-ready 量子软件生态** | 持续接入专业软件，完善执行接口、领域 Skill 与依赖准备，让工具能够被调用、方法能够被复用。保留适用条件与验证记录，让生态能力更容易进入实际任务。 |
| **2 · 量超智融合工作流** | 持续接入本地 CPU、远程 GPU、HPC、量子模拟器与 QPU，探索由 Agent 组织的量子—经典混合计算。按任务的规模、精度、时间与预算选择资源，逐项验证后端接入、工作流编排与协同执行。 |
| **3 · 面向智能实验仪器的接口** | 预留标准化设备接口，逐步连接支持程序控制的实验仪器，探索设备发现、实验控制、测量分析与反馈，让计算与真实实验相互衔接。 |

### 应用与教学

| 长期主线 | 我们将持续建设什么 |
| --- | --- |
| **4 · 更多高质量课程** | 建立从基础到前沿的知识地图，持续打造初、中、高阶段的课程，允许按基础和兴趣跨级学习，把概念讲解、动手实验与能力评估连起来。 |
| **5 · 面向实际问题的量子应用** | 接入或共建围绕明确问题的完整应用，提供问题输入、计算流程和结果展示，不要求使用者自行编排底层工具。逐项说明所用后端、运行成本、适用范围与验证结果。 |

### 个性化与持续改进

| 长期主线 | 我们将持续建设什么 |
| --- | --- |
| **6 · 个性化主动智能** | 从学习与研究过程中理解每个人的基础、兴趣和目标，主动给出下一步该学什么、用哪个方法，并补齐缺失的前置知识，让课程与工具按人而变，而不是所有人读同一条路径。个性化依据哪些记录、存在哪里、如何关闭都由用户掌握。 |
| **7 · 可持续改进的科研能力** | 探索从任务经验到方法与工具改进，再到改进研究过程本身的路径。以新任务对照、独立检查、完整成本和可回退版本检验改进，见下文的 RSI 愿景。 |

仪器接口方向将参考 Anthropic 的 [Model Hardware Standard（MHS）](https://www.anthropic.com/news/model-hardware-standard-research-preview) 等探索，从模拟设备与合作实验逐步验证；实时控制与设备约束由相应驱动和控制系统落实。

<a id="rsi"></a>

### 面向 RSI：让研究改善研究自身

**当前状态：平台已有方法、执行与部分科学检查基础，尚未实现 RSI 闭环。** 改进提议、独立评估、版本接纳和跨轮收益仍需逐项建立与验证；[架构与证据边界](docs/README.md)继续作为当前实现依据。

**让研究不止产生答案，也能留下改善下一次研究的方法与工具。** 我们希望探索面向量子科学的递归自我改进（Recursive Self-Improvement，RSI）：系统发现自身局限，提出候选改进，经检验后用于后续任务；改进后的系统，又能更有效地产生和验证下一轮改进。

我们把这条探索路径区分为三个层次：

| 层次 | 希望积累的变化 |
| --- | --- |
| 跨任务积累 | 将经授权的任务经验整理为可复用方法、案例和失败边界，而不只保存聊天记录。 |
| 能力改进 | 提出方法选择、工具实现或任务流程的候选变化，在新任务上验证是否改善质量、可靠性或成本。 |
| 递归自我改进 | 改善实验设计、候选搜索和独立验证等“产生改进的方法”，并检验它是否提升下一轮改进的效率。 |

设想中的循环是：**真实任务 → 候选改进 → 独立检查与新任务对照 → 授权纳入版本 → 下一轮研究。**

例如，电路任务不仅可以产出一个优化后的电路，还可以产出更好的优化策略选择方法。候选策略需要经过独立等价性检查，并在未参与开发的电路上与旧版本比较；进一步改进寻找这些策略的实验过程，才触及递归性的核心。我们关心的是后续任务是否真的受益，而不是增加了多少 Skill、修改了多少代码，或是否换了一个更强的模型。

改进必须与未继承该改进的版本对照，在可比条件下报告基础模型、人工介入、改进与使用的总成本，并检查旧能力是否退化。候选系统不能自行放宽验收规则、删除失败证据或扩大权限；独立评估、用户授权、数据边界与版本回退应作为接纳改进的条件。社区贡献和人类指导可以参与其中，不应全部归为 AI 自主进步。

OpenQuantum 希望为这个方向提供量子专业工作环境：可执行的工具、可复用的方法、可检查的结果，以及其他科研 Agent 也能接入的开放接口。它不需要另造通用 Agent Runtime，也不要求首先训练新的基础模型。长期还希望探索与 CyberEinstein、PRAgent、RunThePaper 的协作，将研究问题、方法重建、证据资产与可执行量子能力连接起来；这是协作设想，不代表已有跨项目自动闭环。

更远的方向，是检验 AI 与量子能力能否相互促进：AI 改进算法、编译和实验方法，改进后的计算与实验能力再支持下一轮研究。是否带来净收益，需要在具体任务上计入制备、测量、纠错和数据传输等成本，不预设量子计算会加速大模型训练或带来无限自我提升。

我们最终希望看到的是：**一次研究产生新结果，也留下帮助下一次研究成功的能力。** 当前已交付能力及验证范围见[核心能力目录](#openquantum-的核心能力)。

## 一起建设 OpenQuantum

**把你擅长的一件事，变成更多人可以使用的能力。** 一个可复算的研究案例、一份经过检查的负结果、一项减少重复配置的修复，或一个让学习者动手的实验，都可以成为下一项工作的起点。

| 你想参与什么 | 从这里开始 |
| --- | --- |
| 使用平台、理解现有能力 | [文档总入口](docs/README.md)、[部署与启动](docs/DEPLOYMENT.md)、[故障排查](docs/TROUBLESHOOTING.md) |
| 贡献 Skill、工具与科学检查 | [开发与扩展](#把你的量子能力接进来)、[贡献指南](CONTRIBUTING.md) |
| 接入完整应用、建设课程与实验 | [应用集成](#接入面向实际问题的量子应用)、[量子学习通](#量子学习通) |
| 报告问题、了解项目背景 | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues)、[项目故事](docs/communications/openquantum-wechat-launch.md) |

贡献时注明来源、作者、许可证、适用条件和验证范围，仅分享已获授权的材料。私人会话与未发表数据不默认公开，凭据和密钥不得进入贡献内容。安全问题请按[安全政策](SECURITY.md)私密报告。

**[开始一次量子探索](#快速开始)**　·　[接入你的方法与应用](#把你的量子能力接进来)

**OpenQuantum · 量子计算，就在指尖。**

<a id="集成生态与自由选择"></a>

## 开源生态与致谢

OpenQuantum 的量子能力建立在开放科学与开源软件之上。我们维护领域 Skill、MCP 桥接、原生 Tool 和适用的科学检查；底层算法库、外部服务及应用基础保留各自的作者、项目名称与许可证。下面说明具体使用与适配关系。

### 平台与教学应用

| 使用或适配的项目 | 在 OpenQuantum 中承担的职责 |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 科研工作台的 Agent 运行时与原生 Web UI，负责会话、模型调用、工具调度和执行记录 |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | 桌面客户端基础；OpenQuantum 适配品牌和启动配置，复用科研工作台 |
| [CC Connect](docs/integrations/CC_CONNECT.md) | 消息渠道桥接，将微信、飞书等渠道的请求送入科研工作台 |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | 量子学习通的教学应用基础；保留完整界面、服务端与教学流程，适配 OpenQuantum 名称、主题和模型连接；[教学范围与进度](#量子学习通) |

<details>
<summary><strong>计算工具、设备与资料：上游项目及适配关系</strong></summary>

### 计算与分析工具

下表列出计算能力所用的上游项目。除直接接入的 Qiskit MCP Servers 与 FlagQuantum MCP 外，所列能力由 OpenQuantum 编写桥接或进行计算适配；具体工作流与调用入口见[能力接口目录](#能力接口目录)。

#### 电路构建、变换与仿真

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 电路构建与转译 | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 创建、分析和转译电路，读写 QASM / QPY |
| 门电路仿真 | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路的无噪声精确结果与含噪采样 |
| ZX 电路优化 | [PyZX](https://github.com/zxcalc/pyzx) | Clifford+T 电路的 ZX 重写与提取，返回前后 QASM、门数及可选等价性对照 |
| 线路优化 | [Compact](https://github.com/Q-PROOF/Compact) | 固定优化搜索、独立完整酉矩阵与导出电路对照；分列原生门和公共门集成本 |
| 电路切割 | [QCut](https://github.com/FiQCI/QCut) | 门切割、有限采样期望值重建与实际执行成本；自动切割使用对称 CZ 规范化 |
| 第二家电路工作台 | [FlagQuantum MCP](https://github.com/FlagQuantum/mcp-servers) | 按需启用固定上游服务，提供电路分析、转换、仿真及参数操作 |
| 测量式量子计算 | [Graphix](https://github.com/TeamGraphix/graphix) | 电路转 MBQC 资源图及测量模式，模拟自适应测量和输出纠正，可选独立态矢比较 |
| 电路等价性验证 | [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | 比较两份无测量的 OpenQASM 2 电路，区分严格等价、相位等价、不等价与不确定 |
| Clifford+T 电路采样 | [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 最终位串采样与可选密度矩阵参考；另支持 Stim 格式的中间测量、detector/observable 原始记录 |
| Qiskit/Cirq 电路互转 | [qBraid](https://github.com/qBraid/qBraid) | 固定 QASM2 转换路径，保持空闲量子位与编号，可选完整酉矩阵对照 |

#### 开源算法与工作流

| 使用或适配的项目 | 在 OpenQuantum 中承担的职责 |
| --- | --- |
| [quantum-skills](https://github.com/unitarylab/quantum-skills) | 66 份指南的原生 Skill 适配，保留来源；方法可自动选择，纯分类索引供手动导航 |
| [unitarylab_algorithms](https://github.com/unitarylab/unitarylab_algorithms) | 39 个算法模块的开源工作流覆盖与 Trotter / qDrift 计算适配；保留 MIT 来源，逐项披露实现差异 |
| [Qiskit](https://github.com/Qiskit/qiskit)、[PennyLane](https://github.com/PennyLaneAI/pennylane)、[quimb](https://github.com/jcmgray/quimb)、[PySCF](https://github.com/pyscf/pyscf)、NumPy / SciPy | 49 个可执行示例使用的开放计算后端，按方法准备锁定依赖 |

适配说明与署名见[覆盖表](docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)和[算法示例 NOTICE](examples/quantum-algorithms/NOTICE)。

#### 量子态与测量

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 量子态与纠缠审计 | [toqito](https://github.com/vprusso/toqito) | 检查输入密度矩阵，计算纯度、部分转置与指定二分割的 negativity |
| 随机测量与纯度估计 | [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 对已知 product / GHZ 态模拟局域 Haar 测量，估计子区纯度与有限样本误差 |

#### 基态、化学与优化方法

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 量子化学基态 | [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 对分子与活性空间做采样子空间对角化，可选同一活性空间 Hamiltonian 的 FCI 参照 |
| 自旋链基态 | [TeNPy](https://github.com/tenpy/tenpy) | 对 XYZ 自旋链运行 DMRG，计算能量、磁化、纠缠熵与收敛信息 |
| 变分参数学习 | [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | 对 Pauli Hamiltonian 训练 flow 模型，以无矩阵计算学习低能量电路参数 |
| 变分激发态 | [OpenQARP](https://github.com/OpenQARP/openqarp) | 复数态 VQD、独立能量残差与正交性检查、可选精确能谱 |
| 量子核分类 | [cqlib-qml](https://github.com/cq-lib/cqlib-qml) | 五文件角度编码与 QSVM 适配，固定 Rust SDK，保留训练核 jitter、测试集与经典基线 |
| 对称性降比特 | [Symmer](https://github.com/qmatter-labs/symmer) | 在指定 Pauli 对称性扇区投影 Hamiltonian，返回降维 Pauli Hamiltonian，可选同扇区能谱对照 |
| 电路生成元代数 | [PauLie](https://github.com/QPauLie/PauLie) | Pauli 生成元的 Lie 分类、精确维数与可选闭包和矩阵检查，区分理想控制条件和硬件结论 |
| 组合优化 | [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | 将二值目标与线性等式约束编译为 QUBO，进行经典求解、枚举复核或可选本地 QAOA |

#### 误差缓解与量子纠错

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 误差缓解 | [Mitiq](https://github.com/unitaryfoundation/mitiq) | 运行 ZNE、REM、PEC、CDR 本地噪声实验，比较相同采样预算下的误差与成本 |
| 表面码存储与解码 | [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | Stim 生成并采样旋转表面码存储电路，PyMatching 做 MWPM 解码，统计逻辑错误率 |
| 矩形表面码实验建模 | [Deltakit](https://github.com/Deltakit/deltakit) | 构建矩形码片与 ToyNoise 含噪电路，运行 X / Z 存储实验并报告逻辑错误区间 |
| 二元校验矩阵解码 | [ldpc / BP+LSD](https://github.com/quantumgizmos/ldpc) | 对给定校验矩阵和 syndrome 做 BP+LSD 解码，独立复核 syndrome 一致性 |

#### 开放系统动力学

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 马尔可夫动力学与灵敏度 | [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 求解受驱动耗散单量子位的 Lindblad 动力学，批量扫描驱动并计算末态人口梯度 |
| 非马尔可夫动力学 | [OQuPy](https://github.com/tempoCollaboration/OQuPy) | 用 TEMPO 求解 Ohmic spin-boson 模型，检查时间步长与环境记忆截断的影响 |
| 多体开放系统轨迹 | [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 模拟开放 Ising 链的张量跳跃轨迹，可选与密度矩阵 Lindblad 演化比较 |

#### 实验模拟

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 超导测控流程模拟 | [QMClaw](https://github.com/QMC-AI/QMClaw) | 适配其调校流程，本地生成 S21、Rabi、Ramsey、T₁ 等实验的合成数据 |
| 硬件约束与脉冲仿真 | [FatQat](https://github.com/spaceqat/fatqat) | 本地电路、超导原生门与原子阵列约束检查，以及三能级 transmon 和里德堡链的参考模型动力学 |

### 设备发现与量子云

[FieldQKit](https://github.com/FieldQuantum/fieldqkit) 提供国内量子云的凭据检查、只读设备发现、量子位筛选与拓扑查询。

[QDMI](https://github.com/Munich-Quantum-Software-Stack/QDMI) 提供本地 C 驱动设备查询接口；OpenQuantum 适配只读元数据查询，官方示例驱动用于本地接口验证。

IBM Quantum、IonQ 和本源量子是可连接的云服务。任务提交分别由 IBM Runtime、社区 Quantum Hardware 服务和 QPanda3 Runtime 等[任务接口](#可以连接哪些量子后端)提供，配置凭据并启用后可使用；FieldQKit 的当前接入范围是设备发现。

### 算法资料与公开基准

| 查询目的 | 来源项目 | OpenQuantum 当前提供 |
| --- | --- | --- |
| 查找算法说明与参考实现 | [Quantum-Practices](https://github.com/unitarylab/quantum-practices) | 本地检索 66 份固定版本算法指南，保留来源链接 |
| 查看设备历史基准 | [Metriq data](https://github.com/unitaryfoundation/metriq-data) | 查询 410 条去重历史记录，返回测试条件、原始指标、日期和来源，并保留模拟器标签 |

</details>

### License

除明确单独许可的目录外，OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

[Mitiq 误差缓解能力目录](.agents/skills/mitiq-error-mitigation/)采用 GPL-3.0-only；该目录的 [LICENSE](.agents/skills/mitiq-error-mitigation/LICENSE) 和 [NOTICE](.agents/skills/mitiq-error-mitigation/NOTICE) 优先适用，详见[发行边界](docs/integrations/MITIQ.md#许可证与发行边界)。

[Metriq 公开数据快照](src/metriq-data/upstream/)采用 CC-BY-4.0，保留原版 [LICENSE](src/metriq-data/upstream/LICENSE)、[署名与转换说明](src/metriq-data/upstream/NOTICE)，每次查询同时返回来源与署名。

DeepSeek Harness、DSH Desktop、OpenMAIC、FatQat、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件沿用各自的许可证，详细来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

界面截图与示意图的版本、来源和适用范围见[图片说明](docs/images/README.md)。
