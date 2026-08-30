---
name: qmclaw-workbench
description: 使用 OpenQuantum 的 QMClaw Local Tool 对超导量子比特 S21、能谱、Rabi、Ramsey、T1、SingleShot、DRAG、π 脉冲、功率偏移、Delta 和 RB 等 13 类测控实验做有界、确定性的本地模拟，并组织单比特调校工作流。用于实验规划、接口联调、教学和无硬件预检；不连接 LabRAD/lqms、真实仪器或量子云，不修改校准参数，也不替代 Scientific Validator。
---

# QMClaw Workbench

## 当前能力

这个 Skill 把 QMClaw 的超导量子比特调校方法组织成 OpenQuantum Capability。真正的确定性执行由
`qmclaw_local` MCP Server 暴露并经 Harness MCP Client 注册的 Tool 完成。

当前版本完整覆盖 QMClaw 上游的 13 类实验，但执行后端固定为本地模拟：

- 不读取凭据，不访问网络，不启动 LabRAD/lqms，不连接真实仪器；
- 不提供任意 Python、文件路径、命令、`update_param` 或自动参数写回；
- 所有频率使用 Hz、时间使用 s、功率使用 W；输入规模和取值范围由 Tool 强制限制；
- 所有结果明确标记 `sourceKind=simulation` 和 `scientificValidation=not_evaluated`。

13 类实验的上游名称、用途和调校顺序见
[references/experiment-catalog.md](references/experiment-catalog.md)。

## 工作流

1. 先调用 `inspect_qmclaw_runtime`，确认当前后端是 simulation、真实硬件执行关闭，并读取输入上限。
2. 不确定实验名称或参数时调用 `list_qmclaw_experiments`；不要根据 Prompt 猜测 Tool 未声明的范围。
3. 把用户目标整理为一个实验、一个量子比特、采样点数、shots、seed 和该实验允许的 SI 参数；多比特任务拆成独立调用。
4. 调用 `simulate_qmclaw_experiment`。需要比较两次结果时保持 seed 和无关参数一致，只改变待研究变量。
5. 解释返回的 axes、series、matrices 和 summary，同时明确这是合成数据和工程预检，不是真实芯片测量。

推荐的单比特调校顺序是：

```text
S21 → 能谱 → Rabi / π 脉冲 → Ramsey → T1 → SingleShot
    → DRAG → Delta / Power Shift → RB
```

二维能谱与 S21-vs-flux 用于扫描工作流和数据合同联调，不应根据模拟最优点更新真实设备参数。

## Tool 选择

- `inspect_qmclaw_runtime`：查看版本、来源、13 类实验清单、安全边界和硬件状态。
- `list_qmclaw_experiments`：查看每类实验允许的参数、默认值、单位和输出形态。
- `simulate_qmclaw_experiment`：运行一个有界、带 seed 的本地合成实验。

Tool 不存在时，说明 `qmclaw_local` 尚未进入当前 Tool Registry，建议重启 OpenQuantum 并检查设置中心的
QMClaw Local 连接；不要改用 Bash 直接运行上游 `mcp_tools_new.py`。

## 解释边界

- Tool 成功只代表 OpenQuantum 的本地 QMClaw 模拟合同执行完成。
- summary 中的共振频率、T1、T2*、π 脉冲幅度或 RB 衰减参数都是模拟真值/工程摘要，不是实验拟合结论。
- Tool 内部只检查返回数据的有限值、形状和资源边界，不产生独立 Scientific Validator observations。
- 不把上游 Skill 中的统一 T1、XEB、SNR 或 fidelity 阈值当成跨设备科学标准。
- 没有真实 Dataset、设备版本、来源链、Validator observations 和 Acceptance Profile 时，不得宣称调校或科学验收通过。
- 用户要求真实硬件、自动参数写回或实验室部署时，明确说明当前 `hardwareExecutionEnabled=false`；这些动作需要单独的 LabRAD Adapter、设备白名单、参数 envelope、Harness 审批和回滚证据。

## 输出格式

回答至少包含：

1. 实验类型、量子比特、points/shots 和 seed；
2. 使用的 SI 参数与主要模拟摘要；
3. `sourceKind=simulation`；
4. `scientificValidation=not_evaluated`；
5. 如果用户目标是真实调校，列出仍缺少的硬件 Dataset、设备配置和审批步骤。
