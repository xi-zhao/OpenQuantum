<p align="center">
  <img src="./public/openquantum/mark.svg" width="72" alt="OpenQuantum logo" />
</p>

<h1 align="center">OpenQuantum</h1>

<p align="center">
  <strong>让量子工具更好用，也更开放。</strong>
</p>

<p align="center">
  一个开源的量子工具与智能助手平台，给用户直接用，也给企业和研究机构拿去二次开发。
</p>

这几天，我们做了一个挺狠的决定。

把 OpenQuantum 里自己写的那套 Web UI、浏览器网关和 Agent 适配层，整个删掉了。前前后后，接近 3 万行
代码。

不是因为它完全不能用。

而是做着做着，我们越来越确定一件事。OpenQuantum 真正应该做的，不是再造一套 Agent 系统，也不是把
一堆量子功能包在一个只有我们自己能维护的壳里。

我们想做的，是一个开源、开放、能把各种量子工具接进来的平台。

普通用户打开就能用。研究人员可以看清任务是怎么完成的。量子公司和高校实验室拿到代码以后，可以很方便
地接上自己的算法、设备、数据和模型，然后做成真正属于自己的东西。

所以，我们回到了 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

Harness 已经把会话、工具调用、权限、模型、任务记录和 Web 界面这些麻烦事做了。更打动我们的是它的轨迹
视图。一次 Agent 任务用了什么工具，在哪一步调用，哪里失败，结果怎么回来，开发者都能看见。

这种感觉太重要了。

因为开发 Agent 最难受的，从来不是它不会回答，而是它答错了，你还不知道它到底在哪一步开始跑偏。

OpenQuantum 就从这里出发。

## 一个入口，连接更多量子能力

量子计算的工具不少，但它们往往散落在不同的 SDK、云平台、文档网站和开发环境里。

你想分析一个 Qiskit 电路，得找一套工具。想查 IBM Quantum 文档，换一个地方。想看看国内有哪些量子云
后端，又是另一套账号和接口。真的做研究时，还要自己判断模型给出的结论到底靠不靠谱。

这些东西单独看都合理，放到一起就挺折腾。

OpenQuantum 想做的事情，就是把这些能力放进同一个工作环境。用户用自然语言描述问题，Agent 负责理解
任务并选择工具，DeepSeek Harness 记录完整过程，量子程序负责计算，科学检查负责告诉我们结果能不能信。

目前，Qiskit 电路分析、转换与优化，Qiskit 官方文档查询，IBM Quantum Runtime 与 Transpiler 的可选
连接，FieldQKit 多量子云后端发现，以及社区 Quantum Hardware MCP，都已经接进来了。

仓库里还有量子软件栈选型助手，和一个经过严格科学验收的量子基态求解示例。

其中不需要凭据、不会产生真实云费用的能力可以默认使用。涉及 IBM Quantum、真实硬件、外部网络和费用的
能力，默认关闭，由用户自己保存凭据并主动开启。

不是所有东西都应该默认帮用户做决定。

尤其是可能花钱的东西。

## 好用，不应该以封闭为代价

很多平台也能把工具接进来，但接着接着，所有东西都会变成平台自己的格式。

开发者要先学一套私有插件系统。工具作者要按平台的方式重新包装。哪天平台不维护了，之前做的东西也很难
带走。

我们不太想走这条路。

OpenQuantum 使用 DeepSeek Harness 原生 Skill 和公开的 MCP 协议。量子公司可以独立开发自己的组件，
也可以直接把已有服务接进来。你不需要先发布到 OpenQuantum 的私有市场，也不需要申请一个只有我们承认的
组件身份。

代码采用 MIT License。

你可以 Fork，可以修改，可以商用，也可以把它变成一个面向化学、制药、金融、量子硬件或教育的专用版本。

开源这件事，在这里不是页面底部的一行字。

它是整个项目的设计前提。

## 普通用户看到的是一个助手

打开 OpenQuantum，你看到的仍然是一个熟悉的对话界面。

可以新建任务，可以选择模型，可以调整权限，可以查看历史，也可以在设置中心管理量子组件和安全凭据。
默认模式就是 `OpenQuantum`，不用先从一堆开发概念里猜应该选哪个。

真正的区别藏在任务背后。

当用户提出一个量子问题时，系统不是只让模型凭印象回答。它可以加载合适的领域方法，调用 Qiskit、
FieldQKit 或专用量子程序，并把工具过程和结果一起保留下来。

对于普通用户，这是一种更省事的使用方式。

对于专业用户，这些过程又没有被藏起来。

## 开发者看到的是一条轨迹

DeepSeek Harness 的 Trajectory 视图会展示一次任务里的模型请求、步骤、工具调用、嵌套调用和结果。

它不是模型的隐藏思维链，而是一条可以观察、调试和复盘的执行轨迹。

开发者可以很直观地看到 Agent 有没有加载正确的量子 Skill，实际调用了哪个 MCP 工具，输入输出有没有
符合约定，失败发生在模型、工具、权限还是外部服务。

更重要的是，最终答案到底有没有真实工具结果支撑，也能顺着轨迹查回去。

我一直觉得，Agent 要真正进入科研和企业，光是看起来聪明还不够。

它得让人知道自己做了什么。

## 科学结果，不能只听模型自己说

OpenQuantum 现在有一个参考能力，叫 `quantum-ground-state`。

它会对用户提供的一个小型量子 Hamiltonian 运行 VQE，再用独立计算重新检查结果。这个能力的范围被限制得
很窄，只回答给定问题的基态能量，不会顺手把自己包装成完整分子模拟、真实硬件实验或者通用量子优势。

这个范围看起来不大，但我们是故意的。

科研工具最怕的不是暂时做得少，而是做了一点点，就开始声称自己什么都能做。

在 OpenQuantum 里，任务运行结束和科学验收通过是两回事。模型说完成了，工具返回了，页面也正常显示了，
这些都不能自动变成科学可信。

只有独立检查满足明确规则，系统才会显示验收通过。证据不够，就诚实显示没有检查。

这可能没有一句全都成功那么讨喜。

但做科研，真诚比讨喜重要。

## 谁可以拿它来做什么

如果你是普通用户，可以把 OpenQuantum 当作一个能调用量子工具的智能助手。

如果你是研究人员，可以用它组织量子任务、查看工具过程，并逐步加入自己的科研工作流。

如果你是量子公司，可以接入内部云平台、设备、算法和知识库，做成自己的产品或内部系统。

如果你是工具作者，可以把能力做成 MCP，让 Agent 和其他支持同一协议的平台一起使用。

如果你在开发 Agent，可以直接利用 DeepSeek Harness 的轨迹、会话、权限、审批和持久化，不需要从头写
Runtime。

每一种人看到的 OpenQuantum 都不太一样。

但底下是同一套开放组件。

## 先跑起来看看

需要 Node.js 24，以及用于启动 Qiskit 工具的
[uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
# 克隆 OpenQuantum 或你自己的 Fork 后
cd openQuantum
npm ci
cp .env.example .env
npm run dev
```

然后打开 <http://127.0.0.1:3000>。

模型地址和密钥可以在设置中心配置，也可以写在本地 `.env`。真实密钥只保存在本地环境或 DeepSeek Harness
凭据库中，不会回显，也不会写进项目配置。

还没有模型密钥，也没关系。可以先跑本地量子示例

```bash
npm run demo:quantum-ground-state
```

想检查 Qiskit MCP 是否正常，可以运行

```bash
npm run mcp:qiskit:probe
```

Docker 方式也可以直接启动

```bash
cp .env.example .env
docker compose up --build
```

## 想拿去二次开发

OpenQuantum 里有三个最常用的开放组件。

`Skill` 负责告诉 Agent 什么时候做、按什么方法做、有哪些边界。它更像一份给 Agent 的领域工作手册。

`MCP` 负责真正连接工具。计算、数据库、量子云、实验设备和外部服务，都可以从这里接进来。

`Validator` 负责检查结果。单位、阈值、作用域、来源和科学一致性，不应该只靠 Prompt 提醒，而应该由程序
强制验证。

三者可以一起完成一项能力，但它们不是一个东西，也不会被偷偷绑死在一起。

想增加自己的能力，通常就是这条路

```text
增加一个标准 SKILL.md
→ 接入或开发一个 MCP
→ 有科学结论时增加 Validator 和测试
→ 在 OpenQuantum preset 中组合
→ 通过 Harness 轨迹和端到端测试检查
```

更完整的开发说明放在 [CONTRIBUTING.md](CONTRIBUTING.md)，架构边界放在
[ARCHITECTURE_AUDIT.md](docs/architecture/ARCHITECTURE_AUDIT.md)，接下来准备接入的量子项目放在
[QUANTUM_CAPABILITY_CATALOG.md](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

<details>
<summary><strong>展开开发者命令与项目目录</strong></summary>

```bash
# 检查 Harness 组合配置
npm run harness:config

# 检查 Qiskit MCP
npm run mcp:qiskit:probe

# 运行量子基态示例
npm run demo:quantum-ground-state

# 运行完整离线质量检查
npm run check

# 配置模型后运行真实 Agent 端到端测试
npm run e2e:quantum-harness -- --provider openquantum-public
```

```text
.agents/skills/          量子 Skill 与科学资源
runtime/openquantum/      OpenQuantum 模式、MCP 和 Harness 界面扩展
src/settings/server/      设置中心的服务端配置边界
scripts/                  启动、诊断和端到端测试
tests/                    平台集成测试
docs/                     架构、路线与生态文档
```

</details>

## 现在做到哪了

OpenQuantum 已经有一条能完整跑通的产品链。

有 DeepSeek Harness 原生 Web 界面，有任务轨迹，有第一批量子 Skill 和 MCP，有模型与安全凭据设置，也有
量子基态结果的独立科学验收。仓库还提供自动测试，检查这些东西是不是真的连在一起，而不是只写在页面上。

但说实话，我们还差得远。

DeepSeek Harness 当前还是 Developer Preview。量子工具的数量也只是刚刚起步。不同机构对硬件、数据、
权限和科研验证的要求，后面一定会冒出很多现在想不到的问题。

这反而是开源最有价值的地方。

不是由一个团队关起门来猜大家需要什么，而是让真正做量子算法、量子硬件、科研软件和行业应用的人，一起
把这个平台往前推。

如果你手里有一个量子工具，想让更多人用起来。

如果你的团队正在开发量子 Agent，不想从零再造一套系统。

如果你只是好奇，量子工具和 Agent 放在一起到底能做出什么。

都欢迎来试试。

OpenQuantum 想做的，就是把这个入口打开。

## 社区与安全

贡献代码和量子能力前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

真实硬件、外部网络和可能产生费用的能力默认关闭。第三方本地 MCP 启用前，需要审查来源、权限和数据
去向。安全问题请按照 [SECURITY.md](SECURITY.md) 私密报告，不要在公开 Issue 中粘贴密钥或未脱敏数据。

## License

[MIT License](LICENSE) © 2026 Xi Zhao
