<!-- WeChat cover openquantum-wechat-cover.png -->

# OpenQuantum 重磅更新｜微信通道正式接入

预计阅读 3 分钟

> 从网页到微信，用一句话连接量子电路、算法 Skill、MCP 工具和云端后端。

## 本次更新

OpenQuantum 现在可以通过微信接收量子任务。

用户在手机上提出问题，OpenQuantum 调用对应的 Skill、MCP 和量子工具完成任务，再把结果发回聊天窗口。网页端仍然保留完整的 Harness 执行轨迹。

下面是本次更新的真实运行截图。

![OpenQuantum 在微信中的真实回复](../images/openquantum-wechat-chat.jpg){.wechat-chat-shot}

*OpenQuantum 微信通道真实运行截图。*

## 现在可以做什么

- **量子电路分析与转换**，检查 OpenQASM 3、QPY、电路深度和 Qiskit 转译结果
- **VQE 基态求解与验收**，独立检查能量、态矢、收敛轨迹和数值残差
- **量子云后端查询与选择**，通过 FieldQKit 发现 IBM Quantum、IonQ 及多家国内量子云后端
- **量子 SDK 技术选型**，比较 Qiskit、Cirq、PennyLane、Q#、Braket 和 CUDA-Q 等工具
- **TyxonQ 本地电路验证**，运行受控的 statevector、shots 和噪声模型测试
- **平台连通性诊断**，检查 UI、Harness、Skill、MCP 和模型是否真实连通

不需要凭据的电路分析、文档查询和本地算法，安装后即可使用。真实硬件和付费云服务默认关闭，只有用户配置自己的凭据并主动开启后才会连接。

## 消息如何进入 OpenQuantum

OpenQuantum 没有重新开发一套消息 Runtime。本次更新复用 [CC Connect](https://github.com/chenhg5/cc-connect) 作为消息桥，通过标准 ACP 接入 DeepSeek Harness。

| 消息入口 | 连接层 | Agent Runtime | 量子能力 |
| --- | --- | --- | --- |
| 微信、飞书及其他聊天平台 | CC Connect | DeepSeek Harness | Skill、MCP、Validator |

CC Connect 的定位很清楚，它把运行在本机的 Agent 连接到日常使用的即时通讯工具。个人微信使用 [ilink HTTP 长轮询](https://github.com/chenhg5/cc-connect/blob/main/docs/weixin.md)，不需要公网 IP。首次扫码登录后，启动服务并发送一条消息即可完成上下文关联。

OpenQuantum 当前提供个人微信和飞书的快捷配置入口。钉钉、企业微信、Slack、Telegram、Discord、QQ 等平台由 CC Connect 支持，可以继续通过它的本地管理界面配置。

![OpenQuantum 首页](../images/openquantum-home.jpg)

*同一套 OpenQuantum 能力也可以在网页端使用。*

微信里看到的是结果，网页里保留的是过程。

![OpenQuantum 中的 Harness 执行轨迹](../images/openquantum-trajectory.jpg)

*Skill 加载、工具调用、返回结果和运行状态都保留在 Harness 轨迹中。*

## 科学验收仍然独立

对于科研算法，任务运行完成和科学验收通过是两个状态。

以 OpenQuantum 自带的量子基态能力为例，一次真实运行中，VQE 与独立精确参考都得到 -1.85727503 Ha，能量差约为 4.44 × 10^-16 Ha，所有科学检查通过。

![OpenQuantum 量子基态任务的科学验收结果](../images/openquantum-quantum-result.jpg)

*量子基态结果经过独立 Validator 验收。*

## 三步完成配置

**第一步，安装 OpenQuantum**

准备 Node.js 24 和 uv，然后拉取项目并安装依赖。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
cp .env.example .env
```

**第二步，配置模型并启动网页端**

在 `.env` 中填写自己的 OpenAI 兼容模型地址和 API Key。

```bash
OPENQUANTUM_PUBLIC_BASE_URL=https://your-model-endpoint.example/v1
OPENQUANTUM_PUBLIC_API_KEY=your-api-key
npm run dev
```

浏览器访问 `http://127.0.0.1:3000`，即可先体验无需量子云凭据的本地能力。

**第三步，连接个人微信**

```bash
npm run cc-connect:setup
npm run cc-connect:weixin
npm run cc-connect:start
```

用微信扫描终端生成的二维码，确认登录后发送第一条消息，即可完成连接。

消息平台 Token 保存在本地忽略目录，不会写入项目仓库。需要重新绑定微信时，可以按照 CC Connect 官方流程执行 `weixin new` 再次扫码。

## 开源与扩展

OpenQuantum 是一个开源、开放的量子 Agent 工作台。

量子公司可以接入自己的设备和服务，高校与研究机构可以沉淀科研流程，算法与工具开发者也可以继续添加新的 Skill、MCP 和 Validator。

项目地址

[https://github.com/xi-zhao/openQuantum](https://github.com/xi-zhao/openQuantum)

CC Connect 项目与微信接入说明

[https://github.com/chenhg5/cc-connect](https://github.com/chenhg5/cc-connect)

[https://github.com/chenhg5/cc-connect/blob/main/docs/weixin.md](https://github.com/chenhg5/cc-connect/blob/main/docs/weixin.md)
