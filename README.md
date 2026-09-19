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

OpenQuantum 把专业量子软件、研究方法与完整应用接到你的问题上。你可以用自然语言发起计算、检查工具返回的结果，也可以进入量子学习通准备课程，或把自己的算法与应用接进来。

**提出问题，运行计算，共创能力。** 从学习者的第一次实验，到研究者的方法比较，再到开发者的应用集成，都可以从已支持的任务开始。

<p align="center">
  <a href="#可以用它做什么">浏览能力</a> ·
  <a href="#为什么选择-openquantum">为什么选择</a> ·
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

<a id="openquantum-的核心能力"></a>
<a id="已集成的量子工具与能力"></a>

## 可以用它做什么

选择一个方向，告诉工作台你的问题、输入和希望检查的结果。OpenQuantum 的 Agent 按任务使用 Skill 中的方法，并调用相应 Tool 执行计算；量子学习通提供独立的教学界面。

| 你想做什么 | 可以从哪里开始 |
| --- | --- |
| **构建电路、研究量子态** | 电路仿真与转译、ZX 优化、MBQC、等价性检查、密度矩阵与随机测量 |
| **求解基态、探索化学与优化** | VQE、SQD、DMRG、对称性降比特、控制代数和 QUBO |
| **理解噪声、比较纠错方法** | 误差缓解、表面码存储实验、采样与解码 |
| **研究开放系统动力学** | 耗散驱动、环境记忆与多体量子轨迹 |
| **模拟实验、连接计算设备** | 超导与原子模型实验、后端发现，以及按需启用的量子云任务 |
| **查资料、选方法** | 算法指南、量子 SDK 选型与固定历史设备基准 |
| **学习与教学** | [量子学习通](#量子学习通)中的材料、课件、课堂和项目式学习 |

本地计算可以从无需量子云账户的任务开始。真实硬件和付费服务按需配置；各方法的输入范围、准备条件与验证状态分别保留在详细目录中。

<details>
<summary><strong>按领域查看具体任务与结果</strong></summary>

### 电路与量子信息

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 量子电路 | 分析或转换 OpenQASM / QPY 电路，比较转译，检查等价性，运行电路仿真 | 电路结构、转译结果、等价性检查、态矢或采样分布 |
| 电路优化与测量式计算 | 用 PyZX 做 ZX 重写与电路提取，用 Graphix 转换和模拟 MBQC 模式 | 优化前后电路与门数、资源图和测量模式；可选独立对照 |
| Clifford+T 噪声采样 | 用 Clifft 研究 T 门干涉、近 Clifford 电路与门后去极化噪声 | 最终位串频数、有限采样误差；小系统可附完整分布与密度矩阵参考 |
| 量子态与测量 | 审计密度矩阵与纠缠指标；模拟已知 product / GHZ 态的局域随机测量 | 状态指标与独立检查，子区纯度估计及有限样本误差 |

### 基态、化学与优化

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 基态求解与验证 | 提供二量子位实 Pauli Hamiltonian，在固定粒子扇区运行 VQE，并检查精确参考 | 能量、收敛轨迹、独立检查，以及完整流程中的科学验收报告 |
| 量子化学与多体基态 | 用 SQD 研究分子与活性空间，或用 TeNPy 计算 XYZ 自旋链基态 | SQD 能量与轨道占据，DMRG 能量、磁化、纠缠熵及收敛信息；可选精确参考 |
| 变分参数学习 | 对 Pauli Hamiltonian 训练 Flow-VQE，学习低能量电路参数 | Flow 参数学习与等评估预算随机搜索比较 |
| 对称性与控制代数 | 用 Symmer 在指定对称性扇区降比特，用 PauLie 分析 Pauli 生成元 | 降维 Hamiltonian、Lie 代数分类与维数；可选能谱对照或闭包 |
| 组合优化 | 构建 QUBO，检查约束 penalty，运行经典求解或可选本地 QAOA | 优化解、约束检查与经典枚举复核 |

### 误差缓解与量子纠错

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 误差缓解 | 用 Mitiq 运行 ZNE、REM、PEC 或 CDR，比较相同采样预算下的原始与缓解结果 | 理想参考、经验偏差、方差和 RMSE，以及校准、训练与采样成本 |
| 量子纠错 | 用 Stim / PyMatching 运行 surface-code memory，用 Deltakit 构建矩形码片实验，或进行 BP+LSD 解码 | 实际含噪电路、固定 shots 的逻辑错误率与区间；LSD 的 syndrome 一致性检查 |

### 开放系统动力学

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 开放系统动力学 | 用 TJM 计算开放 Ising 链，用 Dynamiqs 扫描单量子位驱动与梯度，或用 OQuPy 研究环境记忆 | 观测量轨迹、独立参考、梯度以及时间步长与记忆截断信息 |

### 实验模拟与硬件

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 超导与原子实验 | 模拟调校流程、原生门约束、三能级 transmon 泄漏或小型里德堡原子链动力学 | 合成实验数据、动力学轨迹与图表 |
| 量子硬件接入 | 发现后端、检查拓扑与凭据；按需启用云任务查询、提交与取消 | 设备候选、使用条件；已启用任务接口的结果与状态 |

### 参考资料与选型

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 算法参考与工具选型 | 检索 Quantum-Practices 的 60 份算法指南、比较量子 SDK、复用研究步骤 | 固定版本的参考材料、适用假设与选型建议 |
| 公开设备基准 | 从 Metriq 的 410 条固定历史记录中按厂商、设备或基准类型查询 | 原始参数、指标、时间、来源与许可；保留模拟器标签 |

### 学习应用

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 学习与教学 | 准备材料、制作课件、组织互动课堂与 PBL 项目式学习 | 已集成课程与课堂界面、本机学习记录；[课程建设与 AI 验收进度](#量子学习通) |

</details>

<a id="openquantum-全景"></a>
<a id="产品体验"></a>

<a id="教学桌面与消息入口"></a>

<a id="学习与教学"></a>

### 量子学习通

把材料、课件与课堂放在一起，让学习者动手，也让教师组织自己的教学内容。

完整课程体系尚未发布，真实在线 AI 教学流程仍待完整验收。

<details>
<summary><strong>教学功能、课堂界面与当前进度</strong></summary>

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

</details>

[准备学习通并打开课堂](#量子学习通安装)。

<a id="为什么做-openquantum"></a>

## 为什么选择 OpenQuantum

**让人、AI 与开放生态共同创造量子能力。** OpenQuantum 的价值，从你能开展的一次具体探索开始，也延伸到他人能够接续的方法与应用。

### 从问题出发，调用专业能力

你可以先提出一个已支持的任务，再由 Agent 调用工具推进计算。Skill 提供方法与步骤，工作台保留工具输入和返回结果，让你把精力放在假设、对照和判断上。你仍然掌握问题与物理条件，专业软件承担相应计算。

工具组合还带来新的研究问题：用 PyZX 优化电路、用 QCEC 检查等价性，再比较含噪表现，可以继续追问“电路更简洁，实际误差是否也更小”。这类组合需要对齐模型、位序和预算；每项工具的范围见[计算与资源配置](docs/integrations/SCALABLE_BRIDGES.md)。

### 让一次研究，成为下一次的起点

工作台保存请求、工具调用与结果，支持继续追问和调整参数；常用方法可以整理为 Skill。支持独立检查的能力还会返回参考结果、统计误差或验收报告，帮助你复核已有工作。

我们希望进一步积累带条件的方法比较与失败证据，让经验能够被理解和接续。程序报错不等于科学反驳，保存经验也不等于系统已自动学习；当前检查范围见[执行记录与科学验收](#执行记录与科学验收)。

### 把你的方法，变成别人能用的能力

研究者可以贡献方法，开发者可以接入计算工具，教师可以建设课程，软硬件伙伴可以连接服务与完整应用。应用保留自己的界面和业务流程，量子学习通就是已有入口之一。

开源实现与扩展接口让使用者能够检查、修改和维护自己的组合。模型服务与计算后端分别配置，上游作者与许可证保持可见，研究数据是否共享由使用者决定。学习、研究、开发与应用，都是参与这个开放平台的起点。

**[先运行一个任务](#快速开始)**　·　[把你的能力接进来](#把你的量子能力接进来)

## 快速开始

当前以源码分发，适合本机单用户试用及二次开发。先准备 Git、Node.js 24；Python 量子工具还需要 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。其他依赖按所选能力安装，例如 RandomMeas 需要 Julia 1.12.7。

### 安装源码

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

没有模型密钥也可以先运行[固定本地示例](#不需要模型密钥复算一个固定案例)。要通过 Agent 发起任务，继续选择工作台入口并配置模型。

<a id="在桌面和消息中使用"></a>
<a id="桌面与消息入口"></a>

### 选择工作台入口

Web 与 Desktop 使用同一套模型配置、量子能力和执行记录，共用 `.openquantum/dsh` 中的本机状态。切换前先退出正在运行的入口。

#### 网页工作台

```bash
npm run dev
```

打开启动日志中带登录令牌的地址；认证后进入 <http://127.0.0.1:3000>。

<details>
<summary><strong>桌面客户端：原生窗口、系统托盘、终端与通知</strong></summary>

#### 桌面客户端

完成源码依赖安装，并准备 Corepack 和系统 C++ 构建工具后：

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
```

`desktop:setup` 构建固定的上游源码、下载 Electron、编译原生模块并准备 OpenQuantum 品牌资源。请使用仓库启动命令，加载模型和量子能力配置。

macOS 与 Windows 的源码构建和安装检查已通过 [CI](https://github.com/xi-zhao/OpenQuantum/actions/runs/35449185860)，本机交互验证覆盖 macOS；当前未提供 OpenQuantum 品牌的 `.dmg` / `.exe` 安装包。

</details>

<a id="模型由你选择"></a>

### 配置模型

在「设置 → 模型」填写支持 OpenAI-compatible Chat Completions 协议的服务地址、模型名称和 API Key，保持 OpenQuantum 为默认 Agent Preset。**模型需要支持 Tool Calling，才能调用量子计算工具。** 这里配置的是模型服务，量子云凭据在对应后端中另行配置。

内置 `openquantum-public` / `openquantum-private` 的默认地址均为 `.invalid` 占位地址，请替换为自己的服务。界面路由覆盖保存在 Git 忽略的 `$DSH_HOME/settings.yaml`；密钥由本地环境或 Harness 凭据库保存，项目配置仅保留凭据引用。

<details>
<summary><strong>高级模型配置与命令行诊断</strong></summary>

界面保存的模型路由覆盖写入 Git 忽略的 `$DSH_HOME/settings.yaml`；密钥保存在本地环境或 Harness 凭据库中，项目配置只保存凭据引用。若希望使用 `.env` 提供服务地址和密钥，macOS 终端执行 `cp .env.example .env`，Windows PowerShell 执行 `Copy-Item .env.example .env`，再按文件内注释填写。`.env` 不覆盖模型名称；服务使用其他模型名时，仍需在「设置 → 模型」中配置。

以下命令检查 `.env` 或环境变量中的 public 路由，以及脚本固定的 `kimi-k2.7-code`、`glm5.2` 两个模型名，分别验证文本生成和 Tool Calling。它不会读取界面保存的路由覆盖；服务提供这些模型时可使用，其他模型请通过上面的工作台任务验证。

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

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

此处展示可复制请求与理论预期。FatQat 连接默认开启，需安装 `uv`，首次使用可能下载依赖；接口和本地验证记录见 [FatQat 使用说明](docs/integrations/FATQAT.md)。这条路径需要先按[配置模型](#配置模型)接入一个支持 Tool Calling 的模型，否则 Agent 不会调用计算 Tool。

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
<summary><strong>微信、飞书与其他消息入口</strong></summary>

#### 微信、飞书与其他消息入口

通过 CC Connect，可从微信、飞书、钉钉、Slack、Telegram、Discord 等渠道发起任务，复用工作台已有的 Skill、Tool 和执行记录。

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

第一项平台需先按上游方式配置；可另开终端运行 `npm run cc-connect:web` 管理其他平台及凭据。Token 保存在 Git 忽略的本地配置中，完整步骤见[消息接入说明](docs/integrations/CC_CONNECT.md)。

<p align="center">
  <img src="./docs/images/openquantum-wechat-chat.jpg" width="380" alt="通过微信 ClawBot 与 OpenQuantum 对话的已有演示截图" /><br />
  <sub>微信渠道示例；配置完成后，消息由 CC Connect 转交 Harness。</sub>
</p>

</details>

<details>
<summary><strong>界面语言：首批支持 10 种语言</strong></summary>

#### 界面语言

在「设置 → 通用设置 → 语言」选择简体中文、英语、日语、韩语、西班牙语、法语、德语、葡萄牙语、俄语或阿拉伯语。选择会保存，学习通跟随工作台；阿拉伯语使用从右到左的阅读方向。

![OpenQuantum Desktop 实际界面的语言选择](docs/images/openquantum-languages-20260919.jpg)

界面语言不会改写已有对话、课程材料、用户 Skill 或工具输出。部分原生系统对话框在中英文之外使用英语回退。

</details>

部署方式与启动问题见[部署与启动](docs/DEPLOYMENT.md)和[故障排查](docs/TROUBLESHOOTING.md)。

<a id="按自己的需要使用"></a>

## 使用与结果

一次任务跑通以后，你可以选择其他后端、调整计算规模，再带着结果继续研究。

### 本地计算与量子云

本地数值计算无需量子云账户。启用其他工具时，在「设置 → 量子组件 → MCP Server 连接」配置相应连接，重启工作台，再在任务中指定所需后端；默认开关见[服务目录](#mcp-服务目录)。

需要真实硬件时，按服务准备凭据、权限与额度。**设备发现、真实任务提交和本地模拟的接入范围分别说明**，不能用配置存在代替服务在线或任务成功。

<details>
<summary><strong>可以连接哪些量子后端</strong></summary>

#### 可以连接哪些量子后端

OpenQuantum 为本地模拟、IBM Quantum、IonQ 和多家国内量子云保留明确的接入边界：先发现后端，再由使用者决定是否配置并启用任务接口。下表是集成范围，不是这些服务当前在线可用的证明。

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地计算 | 电路与噪声仿真、基态参考计算、量子态审计、纠错采样、优化与实验模拟；各有输入范围 | 数值计算无需云凭据；部分依赖首次使用时下载 |
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

这里的“只读”仅指不改变云端/QPU 状态。部分固定 Python 能力会在首次调用时由 `uv` 下载依赖并在
`.openquantum/python-envs/` 创建环境，因此 Tool 合同按完整调用如实声明为 `workspace-write`；环境准备完成后，
科学计算本身仍不写外部系统。

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
| Mitiq 误差缓解 | `npm run capability:mitiq:setup` |
| Dynamiqs、Clifft、OQuPy、Deltakit | `npm run capability:unitary:setup` |
| Metriq 公开基准查询 | 已随源码提供，完成 `npm ci` 即可，无需 Python 或额外下载 |

| 想探索什么 | 示例请求 | 重点查看 |
| --- | --- | --- |
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

</details>

<a id="开始前的几个问题"></a>

### 常见问题

**需要量子计算机账户或模型密钥吗？** 本地计算无需量子云凭据，固定基态示例也无需模型密钥。由 Agent 执行任务需要模型服务；使用量子云则另配对应凭据。

**需要先学会每套 SDK 吗？** 可以先用自然语言发起已支持的任务，但仍需说明输入、物理假设和希望检查的结果。

**只有文字回复，算完成计算了吗？** 请查看会话中是否出现实际工具输入与计算返回。模型解释、工具执行和科学验收分别判断；故障定位见[故障排查](docs/TROUBLESHOOTING.md)。

**量子学习通已有完整课程吗？** 教学应用已集成，公开资源仍在整理。完整课程体系尚未发布，真实在线 AI 建课、问答和编辑仍待完整验收。

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

现有 Skill、桥接实现和原生 Tool 可作为扩展参考。先读[文档与架构入口](docs/README.md)，再按需要查阅[贡献指南](CONTRIBUTING.md)和[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)。

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

开发前先读[文档与架构入口](docs/README.md)，按需要查阅[贡献指南](CONTRIBUTING.md)、[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)和[模块地图](docs/architecture/MODULES.md)。

</details>

### 能力接口目录

<p>
  <a href="#内置-skills">Skill 目录</a> ·
  <a href="#mcp-服务目录">MCP 服务目录</a> ·
  <a href="#原生量子-tools">原生量子 Tools</a>
</p>

当前源码分发 **27 个内置 Skill、29 个 MCP 服务连接、5 个原生量子 Tool**。其中 22 个 MCP 服务使用 OpenQuantum 的本地桥接实现。Skill 指导工作方法，Tool 执行动作，MCP Server 通过协议提供 Tool；三者分别统计。

<details>
<summary><strong>内置 Skills：按研究方法查找工作流</strong></summary>

#### 内置 Skills

这 27 个 Skill 是 OpenQuantum 随源码维护的量子工作流，覆盖方法选择、计算实验、结果解释和平台诊断，由 Harness 按任务需要发现和加载。点击名称即可查看完整的 `SKILL.md`，也可作为编写自己 Skill 的起点；所需工具与连接分别配置。

下表按**研究方法与用途**介绍能力。各 Tool 提供的模型、参数和输入格式见[计算参数与运行方式](#计算参数与运行方式)。

##### 电路构建、变换与仿真

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qiskit-circuit-workbench`](.agents/skills/qiskit-circuit-workbench/SKILL.md) | 量子电路分析、格式转换、转译比较与 Qiskit 文档查证 | `qiskit`、`qiskit_docs` |
| [`tyxonq-workbench`](.agents/skills/tyxonq-workbench/SKILL.md) | 门电路仿真、态矢演化、量子噪声与采样分布分析 | `tyxonq_local` |
| [`pyzx-optimization`](.agents/skills/pyzx-optimization/SKILL.md) | ZX 重写、Clifford+T 优化与电路提取 | `pyzx_local` |
| [`graphix-mbqc`](.agents/skills/graphix-mbqc/SKILL.md) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | `graphix_local` |
| [`quantum-circuit-verification`](.agents/skills/quantum-circuit-verification/SKILL.md) | 量子电路等价性验证、优化前后对照与全局相位差异判定 | `qcec_local` |
| [`clifft-sampling`](.agents/skills/clifft-sampling/SKILL.md) | Clifford+T 电路模拟、非 Clifford 门干涉与噪声采样分析 | `clifft_local` |

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

##### 方法选型与平台支持

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-sdk-advisor`](.agents/skills/quantum-sdk-advisor/SKILL.md) | 量子 SDK 选型、迁移比较与 PoC 技术路线规划 | 知识型 Skill，按任务使用已有通用 Tool |
| [`platform-diagnostics`](.agents/skills/platform-diagnostics/SKILL.md) | 工作台、工具与模型联调排障，形成可追溯的诊断报告 | Harness 通用 Tool 与本地诊断脚本 |

</details>

<details>
<summary><strong>MCP 服务目录：用途、默认开关与准备条件</strong></summary>

#### MCP 服务目录

**OpenQuantum 为 22 项计算与设备发现能力开发了本地 MCP 桥接**，另直接接入 7 个上游 MCP 服务。下表按用途分组：本地桥接链接到仓库源码并保留上游来源，直接接入的服务明确标记为“上游服务”。

默认 Preset 共声明 29 个 MCP 服务连接：**23 个默认开启（其中 Qiskit 两项可通过离线开关关闭），6 个按需启用**。连接名对应配置中的 `serverName`；“默认开启”表示配置策略，使用前仍需准备依赖和必要凭据。

这些 MCP Server 都由本机以 `stdio` 方式启动，不是 OpenQuantum 提供的公共托管端点。其中一部分 Tool 在本地计算，另一部分再访问厂商文档或量子云；“本地启动 MCP Server”不代表所有数据处理都留在本地。

##### 本地电路工作流

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit`](https://github.com/Qiskit/mcp-servers) · Qiskit Circuits（上游服务） | 电路读取、分析、转译与 QASM/QPY 转换 | 默认开启¹ | `uvx`；电路操作无需云凭据，首次启动可能下载依赖 |
| [`tyxonq_local`](.agents/skills/tyxonq-workbench/mcp/server.mjs) · [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路与噪声仿真 | 默认关闭 | 手动开启；`uv` 首次准备较大的 Python 环境，无需云凭据 |
| [`pyzx_local`](.agents/skills/pyzx-optimization/mcp/server.mjs) · [PyZX](https://github.com/zxcalc/pyzx) | ZX 重写、Clifford+T 优化与电路提取 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`graphix_local`](.agents/skills/graphix-mbqc/mcp/server.mjs) · [Graphix](https://github.com/TeamGraphix/graphix) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](docs/integrations/UNITARY_NEXT_TOOLS.md) |
| [`qcec_local`](.agents/skills/quantum-circuit-verification/mcp/server.mjs) · [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | unitary 电路等价性检查 | 默认开启 | `uv`；本地运行，无需云凭据；不接受动态电路或任意文件路径 |
| [`clifft_local`](.agents/skills/clifft-sampling/mcp/server.mjs) · [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 噪声采样 | 默认开启 | uv；仅结构化门与最终测量；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |

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
| [`fatqat_local`](.agents/skills/fatqat-workbench/mcp/server.mjs) · [FatQat](https://github.com/spaceqat/fatqat) | 电路与硬件约束、超导和中性原子脉冲动力学 | 默认开启 | `uv`；首次准备锁定的 Python 环境，后续数值计算在本地运行，无云凭据或 QPU 操作 |

##### 资料与设备发现

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_docs`](https://github.com/Qiskit/mcp-servers) · Qiskit Docs（上游服务） | Qiskit 文档搜索、页面读取和 IBM Quantum 错误码查询 | 默认开启¹ | `uvx`；文档访问需要网络，无需云凭据 |
| [`fieldqkit`](.agents/skills/fieldqkit-hardware/mcp/server.mjs) · [FieldQKit](https://github.com/FieldQuantum/fieldqkit) | 凭据状态检查、国内量子云后端发现和筛选 | 默认开启 | `uv`；发现对应云后端需要相应凭据；不提交或取消任务 |

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

本地桥接中的数值算法和 SDK 来自相应上游项目；OpenQuantum 负责桥接接口、输入范围、调用流程及适用的结果检查。首次调用或准备可能下载固定依赖并创建环境或编译缓存，完整调用的副作用见[能力合同](.agents/capability-packages.yml)。

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
| `quantum_practices` | 搜索和读取 60 份固定版本的算法参考指南，支持中文算法名；用于方法比较、假设核对与实验设计 | 本地资料检索，`read-only`；不安装或执行 UnitaryLab 模拟器；[使用与验证](docs/integrations/QUANTUM_PRACTICES.md) |
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

# 配置模型后运行真实 Agent 端到端测试
npm run e2e:quantum-harness -- --provider openquantum-public
```

```text
.agents/skills/          量子 Skill 与科学资源
runtime/openquantum/     Agent Preset、原生 Tool Provider、Harness MCP Client 声明和 Harness 界面扩展
src/settings/server/     设置中心的服务端配置边界
src/readiness/server/    当前 Harness Registry 的只读运行状态边界
scripts/                 启动、诊断和端到端测试
tests/                   平台集成测试
docs/                    架构、路线与生态文档
```

更完整的文档入口见 [docs/README.md](docs/README.md)。

[固定量子能力 Benchmark](benchmarks/quantum-capabilities/README.md)使用 [MQT Bench](https://github.com/munich-quantum-toolkit/bench) 的 3 个固定电路案例与 manifest 做开发回归，属于开发与 CI 证据，不是 Skill 或 MCP 服务。

源码升级的固定版本、兼容性和验证记录见[上游升级记录](docs/releases/2026-09-10-upstream-update.md)。

</details>

<a id="可选上游-skill-与开发证据"></a>

### 可选上游 Skill

[OriginQ 官方 `pyqpanda3` Skill](https://github.com/OriginQ/pyqpanda3-skill) 提供电路编程、算法模板、迁移与 QCloud 使用指导。它**不计入上面的 27 个内置 Skill，也不会在首次启动时自动安装**；运行 `npm run skill:qpanda:setup` 后，固定审阅版本才会进入项目 Skill 目录。安装这个 Skill 不会自动启用 `qpanda_runtime`，也不会赋予云任务权限。

## 长期发展规划

**从使用已有能力，走向共同创造新能力。** OpenQuantum 持续建设面向量子计算、高性能计算（HPC）与 AI 协作的开放平台。以下是建设方向，按主题分组，具体能力仍需逐项接入和验证。

| 主题 | 建设方向 |
| --- | --- |
| **平台基础** | 提升量子 Agent 的任务理解、工具调用和失败恢复；扩大 Agent-ready 软件生态；探索 CPU、GPU、HPC、模拟器与 QPU 协作，以及设备发现、实验控制和测量反馈的仪器接口 |
| **应用与教学** | 接入围绕实际问题的完整应用；建设从基础到前沿、按初中高阶段组织的课程，把概念、实验与能力评估连接起来 |
| **个性化与持续改进** | 在用户掌握记录、存储与关闭方式的前提下，探索主动学习与研究支持；以独立检查、新任务对照、完整成本和可回退版本检验科研能力的改进 |

仪器方向参考 [Model Hardware Standard（MHS）](https://www.anthropic.com/news/model-hardware-standard-research-preview) 等探索，从模拟设备与合作实验逐步验证；实时控制与设备约束由相应驱动和控制系统落实。

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
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | 量子学习通的教学应用基础；保留完整界面、服务端与教学流程，适配 OpenQuantum 名称、主题和模型连接；课程体系和在线 AI 流程验收仍在推进 |

<details>
<summary><strong>计算工具、设备与资料：上游项目及适配关系</strong></summary>

### 计算与分析工具

下表列出计算能力所用的上游项目。除直接接入的 Qiskit MCP Servers 外，所列能力由 OpenQuantum 编写桥接或进行计算适配；具体工作流与调用入口见[能力接口目录](#能力接口目录)。

#### 电路构建、变换与仿真

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 电路构建与转译 | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 创建、分析和转译电路，读写 QASM / QPY |
| 门电路仿真 | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路的无噪声精确结果与含噪采样 |
| ZX 电路优化 | [PyZX](https://github.com/zxcalc/pyzx) | Clifford+T 电路的 ZX 重写与提取，返回前后 QASM、门数及可选等价性对照 |
| 测量式量子计算 | [Graphix](https://github.com/TeamGraphix/graphix) | 电路转 MBQC 资源图及测量模式，模拟自适应测量和输出纠正，可选独立态矢比较 |
| 电路等价性验证 | [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | 比较两份无测量的 OpenQASM 2 电路，区分严格等价、相位等价、不等价与不确定 |
| Clifford+T 电路采样 | [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 电路的门后去极化噪声与最终位串采样，可选独立密度矩阵参考 |

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

IBM Quantum、IonQ 和本源量子是可连接的云服务。任务提交分别由 IBM Runtime、社区 Quantum Hardware 服务和 QPanda3 Runtime 等[任务接口](#可以连接哪些量子后端)提供，配置凭据并启用后可使用；FieldQKit 的当前接入范围是设备发现。

### 算法资料与公开基准

| 查询目的 | 来源项目 | OpenQuantum 当前提供 |
| --- | --- | --- |
| 查找算法说明与参考实现 | [Quantum-Practices](https://github.com/unitarylab/quantum-practices) | 本地检索 60 份固定版本算法指南，保留来源链接 |
| 查看设备历史基准 | [Metriq data](https://github.com/unitaryfoundation/metriq-data) | 查询 410 条去重历史记录，返回测试条件、原始指标、日期和来源，并保留模拟器标签 |

</details>

### License

除明确单独许可的目录外，OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

[Mitiq 误差缓解能力目录](.agents/skills/mitiq-error-mitigation/)采用 GPL-3.0-only；该目录的 [LICENSE](.agents/skills/mitiq-error-mitigation/LICENSE) 和 [NOTICE](.agents/skills/mitiq-error-mitigation/NOTICE) 优先适用，详见[发行边界](docs/integrations/MITIQ.md#许可证与发行边界)。

[Metriq 公开数据快照](src/metriq-data/upstream/)采用 CC-BY-4.0，保留原版 [LICENSE](src/metriq-data/upstream/LICENSE)、[署名与转换说明](src/metriq-data/upstream/NOTICE)，每次查询同时返回来源与署名。

DeepSeek Harness、DSH Desktop、OpenMAIC、FatQat、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件沿用各自的许可证，详细来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

界面截图与示意图的版本、来源和适用范围见[图片说明](docs/images/README.md)。
