---
name: netqasm-network
description: 用 QuTech NetQASM 编译双节点 EPR 创建、接收和 X/Z 测量程序；在用户已准备有许可的 NetSquid 环境时，通过 SquidASM 运行双节点有噪声采样。
---

# NetQASM 与 SquidASM 网络实验

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
