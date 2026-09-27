---
name: spinqit-simulation
description: 用量旋 SpinQit 原生编译器与 basic simulator 执行用户电路，返回末态振幅和概率。
---

# SpinQit 本地电路仿真

Agent 经 Harness 调用 `spinqit_local` 提供的 `simulate_spinqit_circuit`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `numQubits` 和 `gates`。每项包括 `gate`、`targets`；支持 H/S/T/X/Y/Z/CX/CZ 和 RX/RY/RZ。旋转门必须提供 `angle`（rad），其他门不得提供。CX 的首个 target 是控制位。只接收结构化门，不执行用户代码或文件路径。

从全零态开始进行理想酉演化。`outcomes` 的位串左端是量子位 0，`amplitude=[real,imag]`。概率由 SDK 末态振幅计算，无裁剪或归一化。先检查 `normError`；概率不是有限 shots 测量频数。完整态向量的计算和存储随 2^N 增长。

使用 SpinQit 原生 compiler 的 optimization_level=0 和 basic simulator。返回真实原生 Instruction 序列。此路径不会执行 NMR 或 cloud 后端。

固定 Python 3.10；SciPy 固定 1.14.1 以避开本机检测到的 1.15.3 macOS wheel 装载错误。macOS 上显式预加载 SDK wheel 随附的 interface dylib，以解决上游 `$ORIGIN` rpath 问题；不改动二进制。

输出来自 `states` 的数值振幅，不把 SDK 由概率舍入的 counts 当成真实有限 shots 测量。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs spinqit-simulation` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：0.2.4；来源与许可见[上游仓库](https://github.com/SpinQTech/SpinQit)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
