# 量子 SDK 补充：网络、控制、光学与云接口（2026-09-28）

在[厂商 SDK](VENDOR_SDKS.md)和[公司与机构补充](SDK_EXPANSION.md)之外，本批新增 **15 个 L1 能力包、15 个 Skill、15 个独立 MCP 连接和 18 个 Tool**。
Skill 指导选择和解释；Python Tool 实现 SDK 动作；Harness MCP Client 负责注册。跨语言、原生依赖和不兼容 Python 版本采用独立环境。
鉴权仍由用户在设置中配置，代码、Skill 和参数不保存凭据。

## 已实现范围

| 公司 / 机构与 SDK | 固定版本 | 已开放动作 | 策略 |
| --- | --- | --- | --- |
| 中科大 QNLab · SimQN | qns 0.2.3 | 单量子链路离散事件、损失、Werner 衰减 | 按需；GPL-3.0 |
| 北京量子院 · Qcover | 2.6.0 | Ising 图的给定 QAOA 参数能量与相关量 | 默认 |
| 本源量子 · VQNet | pyvqnet 2.18.1 | 结构化电路的 Pauli 期望和自动微分 | 按需；二进制许可元数据需核对 |
| 本源量子 · pyChemiQ | 1.1.4 | 有序费米算符到 Jordan–Wigner Pauli 项 | 默认 |
| Qblox · Scheduler | 1.0.0b8 | 基带方波排程和波形采样 | 默认；固定测试版 |
| Qilimanjaro · Qililab | 0.33.3 | I/Q 脉冲离线编译到 Qblox Q1ASM | 默认 |
| Quantinuum · Guppy / Selene | 1.1.1 / 0.3.2 | 结构化量子程序编译与中途测量、复位、反馈仿真 | 默认 |
| OQC · QAT | qat-compiler 3.5.0 | 方波/高斯指令的时序与复基带波形 | 默认 |
| Xanadu · MrMustard | 0.7.3 | 高斯光学矩与显式截断 Fock 概率 | 按需；上游已归档 |
| Quandela · MerLin | 0.4.1 | 完整 Fock 概率、批量推断与相移梯度 | 默认 |
| QPerfect · MIMIQ Exaqt | 0.3.0 | 本地态矢量与种子采样 | 按需；二进制许可元数据需核对 |
| Bull · myQLM | 1.13.7 | PyLinalg 本地理想电路仿真 | 按需；供应方 EULA |
| AQT · Qiskit AQT Provider | 1.15.0 | 原生门编译、离线采样；可选设备查询 | 按需 |
| OQC · QCaaS client | 3.23.0 | 本地任务准备、设备/任务查询、显式单次云任务提交 | 按需；专有 SDK |
| QuTech · Quantum Inspire | 4.1.0 | 分页查询设备类型、查询既有任务状态 | 按需 |

具体输入、单位、位序、上游来源、许可和数值检查见[国内组](SDK_GAPS_DOMESTIC.md)、
[控制组](SDK_GAPS_CONTROL.md)、[光学与模拟组](SDK_GAPS_SIMULATION.md)、[云接口组](SDK_GAPS_CLOUD.md)。
“接入”仅指表中实际动作，不代表开放上游 SDK 的全部功能，也不代表全产品发布或所有平台可运行。

## 环境与鉴权

`npm run capability:sdk-gaps:setup` 显式准备 7 个默认连接的环境；按需能力可单独运行：

```sh
node scripts/setup-paper-tools.mjs <capability-id>
```

所有依赖固定在各能力的 `uv.lock`。Qcover、pyChemiQ 使用 Python 3.10，MrMustard 使用 3.11，其余使用 3.12。
调用 Tool 不会隐式安装。Qcover 和 MrMustard 保留兼容依赖；MerLin 固定 Perceval 1.2.1。
Exaqt 0.3.0 分发仅覆盖 Apple Silicon macOS、Linux x64 glibc 2.34+ 和 Windows x64；setup 会拒绝其他平台。
本批真实执行验证平台为 macOS arm64，其他平台仍需各自测试。

在量子组件设置中启用连接，按需保存凭据引用：

| 连接 | 用户设置 | 无凭据时 |
| --- | --- | --- |
| `aqt_local` | `AQT_API_TOKEN` | 离线计算可用；远程设备查询在请求前失败 |
| `oqc_cloud` | `OQC_API_TOKEN`；可选 `OQC_API_ENDPOINT` | 本地任务准备可用；远程查询/提交在请求前失败 |
| `quantuminspire_cloud` | `QUANTUMINSPIRE_API_TOKEN` | 查询在请求前失败；用户自行更新失效令牌 |

远程查询只连接官方 HTTPS 端点，不自动登录、刷新或持久化令牌，不跟随重定向。OQC endpoint 仅允许官方 `oqc.app` 域；
提交是 `external-write`，可能消耗服务额度，只尝试一次，不轮询、不自动重试。其余动作考虑 SDK 缓存保守登记为 `workspace-write`。
连接已启用、依赖已安装或凭据已配置，都不替代用户对具体外部写任务的授权。

## 验证与使用边界

- 合同：`npm run capability:sdk-gaps:test`。真实 MCP 握手、清单与 policy、严格 schema、输入与依赖来源绑定、失败和取消恢复。
- 实际 SDK：显式准备后运行 `npm run capability:sdk-gaps:live`。四组真实依赖计算、解析/独立矩阵参照、MCP 返回及 Harness Session 日志重读。
- 云接口使用真实供应方 SDK，将 HTTP 传输替换为受控响应；检查鉴权头、请求/响应模型、状态与提交序列、重定向拒绝、错误脱敏及不重试。
  这些测试不使用真实账户、云配额或 QPU。Harness 模型是本地协议夹具，不调用外部模型。
- 所有能力保持 `scientificValidation=not_evaluated`，本批不增加最终科学 Acceptance。控制波形不等于量子态动力学或设备校准。

版本化验证记录见[证据摘要](evidence/sdk-gaps-2026-09-28.json)。运行中的工作台需更新源码、准备所需环境并重启 Harness 后加载；
源码接入不等于新安装包发布。
