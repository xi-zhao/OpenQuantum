---
name: netqasm-network
description: 用 QuTech NetQASM 编译双节点 EPR 创建、接收和 X/Z 测量程序；在用户已准备有许可的 NetSquid 环境时，通过 SquidASM 运行双节点有噪声采样。
---

# NetQASM 与 SquidASM 网络实验

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **NetQASM 的原生公开 API**。用户需要 任意程序、EPR/经典通信、编译、连接与运行时 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect netqasm-network` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`netqasm`；导航不是 API 白名单。

本锁不含受许可限制的 NetSquid/SquidASM，端到端网络运行须准备相应运行时。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


`netqasm_local` 默认关闭。先显式运行 `node scripts/setup-paper-tools.mjs netqasm-network`，准备固定
NetQASM 2.0.0 / Python 3.10 编译环境，再在设置启用连接。

- `prepare_netqasm_bell_program`：选择 Alice/Bob 的 X 或 Z 测量基，真实 SDK 返回两端的 NetQASM 指令与二进制。
  编译使用 `DebugConnection`，它不连接网络、不生成纠缠，不是仿真成功。
- `simulate_squidasm_bell_pairs`：在用户安装可选依赖后运行 SquidASM 0.13.6，输入 shots、seed、linkNoise、
  linkDelayNs 与双方测量基。linkNoise 为去极化概率，delay 单位 ns。返回的位串左边是 Alice、右边是 Bob。

NetSquid 私有包仓库的账户与授权由用户提供。用户依据[上游安装说明](https://github.com/QuTech-Delft/squidasm)
在上述同一个 Python 环境安装 `squidasm==0.13.6` 及其 NetSquid 依赖，并保留上游依赖要求。
凭据应通过包管理器的安全认证入口使用，不写在命令历史、仓库或 Tool 参数中。不要由 Agent 代登录或接受服务协议。
再次运行基础环境准备会恢复公开锁；可选依赖需要随后重新准备。公开 `uv.lock` 不覆盖私有仿真栈，结果单独报告实际版本。

本次可公开复跑的验证覆盖编译、二进制回读和缺失仿真依赖的失败路径；没有 NetSquid 账户时，不能宣称真实
SquidASM 数值路径已验证。有限 shots 的一致率不能替代纠缠判据或 QKD 安全性证明。

来源：[NetQASM](https://github.com/QuTech-Delft/netqasm)、[SquidASM](https://github.com/QuTech-Delft/squidasm)。
两者公开源码为 MIT；NetQASM 另有专利/商业使用说明，NetSquid 适用独立授权。发行版只提供适配代码和公开依赖锁。
