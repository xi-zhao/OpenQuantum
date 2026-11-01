# IBM Runtime 的 RZZ 编译补丁

本次采用同版本线补丁；是否已合入主线以 [PR #75](https://github.com/xi-zhao/OpenQuantum/pull/75) 为准。
已安装环境只有在显式准备时才按新锁更新。

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

## 验证结果与复跑

- 旧版 0.50.0 与 0.49.0 在 `RZZ(3π/4)` 上均复现目标不支持的 `global_phase` 指令；
  此时矩阵误差仍只有约 `2.5e-16`，说明仅比较矩阵不足以发现问题。
- 两个补丁版本各通过 48 项检查：24 个角度分别经过公开 `FoldRzzAngle` 和 fake backend
  预设 pass manager。解析的二量子位 RZZ 对角矩阵提供独立参考，保留全局相位，覆盖正负角、
  象限及绕圈边界；最大完整矩阵误差约 `7.4e-16`。同时检查目标指令和 RZZ 角度范围。
- 本机真实 MCP 握手及 `tools/list` 与固定合同一致：IBM Runtime 20 个、Quantum Hardware
  53 个 Tool；核对名称、描述、输入/输出 schema 及 annotations，没有执行 Tool 或调用云账户。
- 七份锁均通过离线一致性检查，仅 Runtime 的版本和发行包摘要改变。共享模块边界、宿主目录
  对齐、外部 MCP 合同等定向检查通过 43 项，7 个显式 live 检查在默认模式跳过；另通过能力声明、
  SDK 指南/清单、产品版本及改动文件 lint 检查。

[版本化本机证据](../integrations/evidence/runtime-rzz-2026-11-01.json)保留失败输入、两个补丁的
完整回归结果、锁摘要与 MCP 清单核对结果。复跑入口见[上游回归说明](../../benchmarks/upstream-updates/README.md)。
专用 `IBM Runtime compatibility` CI 在 Linux 按当前锁重新准备 QCut 和三个 MCP 环境，
各运行 48 项回归，并对三个 MCP 完整核对 Tool 合同；其实际结论以 PR 检查和上传的工件为准。
本机未完整准备 Qiskit Gym，原因是缺少固定 Torch 的缓存且外置盘接近空间保留线。

本机证据不覆盖七个环境的所有科学工作流，也未重新执行 DSH/Codex 的真实模型任务或实际安装验收。
固定 base/head 的 Standards、Spec 结论记录在 PR 正文；这是同一维护任务的顺序自审，不是独立领域审阅。

这些检查是有界的编译兼容证据，不是完整生态、真实设备或中央科学验收。
回退时还原本 PR 的七份锁文件；已准备的环境需按旧锁重新显式准备，不在执行时隐式升级。
