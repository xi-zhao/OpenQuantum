# IBM Runtime 的 RZZ 编译补丁

状态：升级验证中；主线和用户已安装环境尚未变更。

## 问题与范围

IBM 在 2026-10-29 发布了 [0.50.1](https://github.com/Qiskit/qiskit-ibm-runtime/releases/tag/0.50.1)
和 [0.49.1](https://github.com/Qiskit/qiskit-ibm-runtime/releases/tag/0.49.1)：
RZZ 角度折叠曾在输出电路中插入硬件目标未声明的 `GlobalPhaseGate`。
补丁把相位保存在电路的全局相位字段，保留完整酉矩阵。
依据为上游 [0.50 回补](https://github.com/Qiskit/qiskit-ibm-runtime/pull/3513)
及 [0.49 回补](https://github.com/Qiskit/qiskit-ibm-runtime/pull/3512)。

本次只更新已锁定 0.50.0 / 0.49.0 的七个环境中的 Runtime patch，
保持各自 Qiskit、Aer、MCP Server 及其他依赖版本；0.45.1 旧兼容环境另行评估。
环境为 OQC QAT、QCut、QDK Chemistry、sQUlearn，以及 Qiskit Gym、IBM Runtime、
Quantum Hardware 三个外部 MCP 环境。现有公开接口和宿主注册不变，不新增 Adapter 或 Tool。

## 验证约定

- 使用 SDK 公开 `FoldRzzAngle` / 预设 pass manager 接口，先在旧版复现非法门，再测试新版。
- 以解析的二量子位 RZZ 对角矩阵验证完整酉矩阵，包括全局相位；覆盖正负角、象限及绕圈边界。
- 使用离线 fake backend 检查目标指令集和角度约束；不连接云账户或真实硬件。
- 比较新旧 MCP Tool 清单，检查相关共享 SDK、DSH/Codex 注册与锁文件一致性。
- 保存固定 base/head 的 Standards、Spec 自审与实际检查证据；自审不等于独立领域审阅。

这些检查是有界的编译兼容证据，不是完整生态、真实设备或中央科学验收。
回退时还原本 PR 的七份锁文件；已准备的环境需按旧锁重新显式准备，不在执行时隐式升级。
