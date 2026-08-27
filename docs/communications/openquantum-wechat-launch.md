<!-- WeChat cover openquantum-wechat-cover.png -->

# 量子计算机接入个人微信｜基于 DSH 的开源量子 Agent 工作台 OpenQuantum 更新

预计阅读 3 分钟

> 在微信里发一句话，背后的 OpenQuantum Agent 就可以调用量子电路、算法 Skill、MCP 工具和云端后端。

今天，我把量子计算接进了个人微信。

准确一点讲，是把能够调用量子计算工具、算法和云端后端的 OpenQuantum Agent，接进了个人微信。

我在微信里发了一句「你好」，收到的不是一段普通的聊天回复。它告诉我，可以检查量子电路，可以运行 VQE 基态求解，可以查询量子云后端，也可以调用已经接入的量子 SDK 和本地工具。

这张图，就是刚刚真实跑出来的结果。

![OpenQuantum 在微信中的真实回复](../images/openquantum-wechat-chat.jpg){.wechat-chat-shot}

*个人微信已经成为 OpenQuantum 的一个真实入口。*

这次更新的重点，其实不只是多了一个微信机器人。

真正重要的是，OpenQuantum 这套开源量子 Agent 工作台，现在可以从网页走进大家每天都在用的聊天窗口。

OpenQuantum 基于 DeepSeek Harness，也就是 DSH 来运行。DSH 负责会话、工具调用、权限、审批和执行轨迹，OpenQuantum 在上面组合量子领域的 Skill、MCP 和 Validator。

Skill 告诉 Agent 应该怎么完成一个量子任务。

MCP 负责真正调用 Qiskit、TyxonQ、FieldQKit 或量子云后端。

Validator 再去检查结果是否真的满足科学规则。

所以，微信只是入口。DSH 负责把任务跑起来，OpenQuantum 负责把量子能力组织起来。

![OpenQuantum 首页](../images/openquantum-home.jpg)

*同一套 OpenQuantum 能力，可以从网页使用，也可以从个人微信调用。*

现在已经接入的能力，大致可以分成三组。

一组是量子电路和文档，包括 OpenQASM 3、QPY、电路深度、Qiskit 转译和 Qiskit 官方文档查询。

一组是本地算法和科学检查，包括二量子位 VQE 基态求解、TyxonQ statevector 与噪声电路验证，以及由独立
Validator observations、Acceptance Profile 和 central Acceptance Builder 支撑的科学验收。

还有一组是量子云与开发工具，包括 IBM Quantum、IonQ 和多家国内量子云后端的发现与选择，以及 Qiskit、Cirq、PennyLane、Q#、Braket、CUDA-Q 等 SDK 的技术选型。

不需要凭据的电路分析、文档查询和本地算法，安装后就能用。真实硬件和付费云服务仍然默认关闭，只有用户填入自己的凭据并主动开启，OpenQuantum 才会连接。

这一点很重要。

在微信里调用起来可以很轻，但真实设备、费用和科研结论的边界不能糊。

微信里看到的是结果，网页里保留的是过程。

![OpenQuantum 中的 Harness 执行轨迹](../images/openquantum-trajectory.jpg)

*Skill 加载、MCP-exposed Tool 调用、工具结果和运行状态，都会保留在 DSH 的执行轨迹里。*

以 OpenQuantum 自带的量子基态能力为例，一次真实运行中，VQE 和独立精确参考都得到 -1.85727503 Ha，能量差约为 4.44 × 10^-16 Ha，所有科学检查通过。

![OpenQuantum 量子基态任务的科学验收结果](../images/openquantum-quantum-result.jpg)

*工具运行完成只是第一步；Validator 产生 observations，Acceptance Profile 定义规则，central Acceptance Builder 再推导科学结论。*

这次个人微信接入，复用了 [CC Connect](https://github.com/chenhg5/cc-connect) 作为消息桥，再通过标准 ACP 连接到 DSH。OpenQuantum 没有重新做一套聊天 Runtime，也没有复制 DSH 的会话和工具系统。

整个路径其实很清楚。

> 个人微信 → CC Connect → DeepSeek Harness → OpenQuantum Skill 与 Tool → 量子结果返回微信

OpenQuantum 目前提供个人微信和飞书的快捷配置。钉钉、企业微信、Slack、Telegram、Discord、QQ 等消息平台，也可以继续通过 CC Connect 的本地管理界面接入。

想自己跑起来，配置过程只有三步。

**1. 安装 OpenQuantum**

准备 Node.js 24 和 uv，然后安装项目依赖。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
cp .env.example .env
```

**2. 配置模型并启动 OpenQuantum**

在 `.env` 中填入自己的 OpenAI 兼容模型地址和 API Key，然后启动服务。

```bash
OPENQUANTUM_PUBLIC_BASE_URL=https://your-model-endpoint.example/v1
OPENQUANTUM_PUBLIC_API_KEY=your-api-key
npm run dev
```

浏览器打开 `http://127.0.0.1:3000`，就能进入 OpenQuantum。

**3. 连接个人微信**

```bash
npm run cc-connect:setup
npm run cc-connect:weixin
npm run cc-connect:start
```

用微信扫描终端生成的二维码，确认登录，再发送第一条消息，连接就完成了。

消息平台 Token 保存在本地忽略目录，不会写入项目仓库。需要重新绑定微信时，可以按照 CC Connect 官方流程执行 `weixin new` 再次扫码。

我想做的 OpenQuantum，是一个真正开放的量子 AI 工作台。

量子公司可以接入自己的设备和云服务，高校与研究机构可以沉淀自己的科研流程，算法开发者也可以继续加入新的 Skill、MCP 和 Validator。

网页可以是入口。

个人微信也可以是入口。

后面那套开放、可追踪、还能继续开发的量子能力，始终是同一套。

量子计算，就在指尖。

项目地址

[OpenQuantum GitHub](https://github.com/xi-zhao/openQuantum)

CC Connect 项目与微信接入说明

[CC Connect](https://github.com/chenhg5/cc-connect)

[个人微信接入文档](https://github.com/chenhg5/cc-connect/blob/main/docs/weixin.md)
