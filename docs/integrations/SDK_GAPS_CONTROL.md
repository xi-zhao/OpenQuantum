# 补充接入：测控与混合程序

本组提供四个独立 Skill 和四个 Python MCP Server，每个 Server 暴露一个动作。
Harness MCP Client 独立注册 Tool；没有新的 Runtime，也没有设备、云账户或凭据配置。
所有能力为 L1，固定返回 `scientificValidation=not_evaluated`。

| 能力 | 固定包 / Python | Tool 与范围 | 不包含 |
| --- | --- | --- | --- |
| Qblox Scheduler | `qblox-scheduler==1.0.0b8` / 3.12 | `schedule_qblox_pulses`：基带方波排程、SDK 时序解析与波形采样 | HardwareAgent、Q1ASM 硬件编译、设备连接 |
| Qililab | `qililab==0.33.3` / 3.12 | `compile_qililab_pulses`：I/Q 方波 → Qblox Q1ASM 与波形表 | Platform/runcard、校准、实验执行 |
| Guppy / Selene | `guppylang==1.1.1`, `selene-sim==0.3.2` / 3.12 | `simulate_guppy_feedback`：结构化程序 → HUGR → 理想 QuEST 采样；支持中途测量/复位和反馈 | 用户代码、QIR、噪声、反馈延迟、云运行 |
| OQC QAT | `qat-compiler==3.5.0` / 3.12 | `compile_oqc_qat_pulses`：低层方波/高斯指令 → 时序与复基带缓冲区 | engine execute、QPU、QCaaS、量子态动力学 |

Qblox Scheduler 的已核实测试版采用 BSD-3-Clause；PyPI 默认显示的占位版本 0.0.0 不能作为实际依赖。
Qililab、Guppy、Selene 为 Apache-2.0，QAT 为 BSD-3-Clause。Qblox 官方安装文档要求使用 prerelease；
本仓库直接固定 `1.0.0b8`。版本、传递依赖与哈希记录在各能力的 `uv.lock`。

## 执行与副作用

先显式运行：

```sh
node scripts/setup-paper-tools.mjs qblox-scheduling qililab-control guppy-programs oqc-qat
```

计算调用只使用已准备并匹配锁哈希的环境，不隐式下载或安装。SDK import、Matplotlib、QAT logger 及
Guppy 原生编译可能写缓存，因此四个 Tool 均保守声明 `workspace-write`。
QAT 的日志目录与 Zig 缓存位于 `.openquantum/cache`；Guppy 每次构建的临时文件会清理。
调用参数不接受凭据、URL、路径、Python 代码或驱动设置。`execution` 单独拥有部署资源选项，
没有按开发机测试案例设定量子位数、shots、波形数量等人工上限；保留 SDK 数据表示与物理输入约束。

## 重要语义

- Qblox 的高层 `HardwareAgent.compile` 会尝试发现设备。本适配只使用固定版本时序 pass 与波形生成器，
  明确称为排程，不宣称完成硬件编译。末尾等待计入总时长；返回样本只覆盖一个周期的各脉冲。
- Qililab 是真实离线 Q1ASM 编译；I/Q 波形表与增益等指令必须一起解释。归一化幅度没有电压或旋转角含义。
- Guppy 从枚举门、整数目标和有限数值生成固定语法；没有任意代码输入。测量复位是破坏性 Z 测量后重新分配零态，
  经典条件只能指向已经产生的测量。结果 bitstrings 以 q0 开头。
- QAT 使用 EchoEngine 的时序/波形阶段，不执行其后端测量接口。Gaussian 在样本箱中点采样，按标准差计算并截断；
  输出是复基带信号，不是量子态或实验观测值。

## 验证入口

```sh
node --test tests/sdk-gaps-control-contracts.test.mjs
OPENQUANTUM_REAL_SDK_GAPS_CONTROL=1 node --test tests/sdk-gaps-control-live.test.mjs
```

合同覆盖 policy → `tools/list` 一致性、严格 schema、来源哈希、环境隔离、失败路径、取消与并发槽恢复。
真实 SDK 检查包括 Qblox 排程/重复/采样率、Qililab 有符号 I/Q 波形与最小指令间隔、
Guppy 的 Bell 相关、反馈、复位、弧度与空程序，以及 QAT 复相位、等待、高斯解析对照和单样本边界。
MCP 检查实际返回 envelope、默认输入和拒绝非法代码参数。执行记录保存在 `.openquantum/sdk-gaps-evidence/control`，
不将开发回归解释为科学 Acceptance、真实仪器验收或产品发布。

上游来源：[Qblox 文档](https://docs.qblox.com/en/main/products/qblox_scheduler/index.html)、
[Qililab](https://github.com/qilimanjaro-tech/qililab)、[Guppy](https://github.com/Quantinuum/guppylang)、
[Selene](https://github.com/Quantinuum/selene)、[QAT](https://github.com/oqc-community/qat)。
