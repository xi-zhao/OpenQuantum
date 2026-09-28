---
name: qblox-scheduling
description: 用 Qblox Scheduler 构造基带方波序列、解析相对时序并采样包络；适合检查脉冲时序，区分离线排程、硬件编译与量子动力学。
---

# Qblox 脉冲排程

调用 `qblox_local` 的 `schedule_qblox_pulses`。固定 `qblox-scheduler==1.0.0b8`（公开测试版，BSD-3-Clause），
先显式执行 `node scripts/setup-paper-tools.mjs qblox-scheduling`；计算调用不安装依赖。

1. 确认问题是顺序方波的时序与包络。需要仪器指令时可选 Qililab；需要量子态演化时选择动力学能力。
2. `pulses` 每项给出无量纲 `amplitude`、秒单位的 `durationSeconds` 与 `gapAfterSeconds`；
   脉冲时长必须为正、间隔非负。`repetitions` 是整段重复次数，`sampleRateHz` 控制返回的数学波形采样密度。
3. 调用后用 `pulses[].startSeconds` 检查相邻间隔，用 `samples` 检查包络。最后一个间隔计入总时长；
   `durationSeconds` 包含重复次数，而返回波形只对应一个周期。
4. SDK 环境未准备或锁不一致时先显式 setup；无效时长、非有限参数必须修正，不用截断或替换数值掩盖错误。
   大数组使用独立的 `execution` 超时、输出预算与线程设置；能力合同不按开发机样例限制规模。

此适配使用真实 `TimeableSchedule`、固定版本的离线时序 pass 与 SDK 波形生成器。
上游高层 `HardwareAgent.compile` 会尝试发现设备，因此这里不构造它。
返回 SDK schedule JSON 与波形样本；没有 Q1ASM 编译、仪器写入、采集或账户连接。

幅度没有电压、仪器增益、削顶或校准含义；该数学排程不验证硬件采样栅格。
波形不能当作 Rabi 旋转、量子态或测量数据。该 L1 工具始终返回 `scientificValidation=not_evaluated`。

来源：[官方文档](https://docs.qblox.com/en/main/products/qblox_scheduler/index.html)、
[排程与脉冲](https://docs.qblox.com/en/main/products/qblox_scheduler/tutorials/any/schedules_and_pulses.html)、
[官方源码](https://gitlab.com/qblox/packages/software/qblox-scheduler)。
