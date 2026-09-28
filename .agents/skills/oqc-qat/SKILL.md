---
name: oqc-qat
description: 用 OQC QAT 的离线 EchoEngine 建立方波或高斯脉冲的样本时序和复基带缓冲区；检查幅度、相位、等待与采样约定。
---

# OQC QAT 离线脉冲缓冲区

调用 `qat_local` 的 `compile_oqc_qat_pulses`。固定 `qat-compiler==3.5.0`，BSD-3-Clause。
先显式执行 `node scripts/setup-paper-tools.mjs oqc-qat`。

1. 输入一组 `square` 或 `gaussian` 脉冲，给出 `amplitude`、`phaseRadians`、整数 `durationNs` 与 `waitAfterNs`。
   Gaussian 的 `sigmaNs` 为正，表示标准差；Square 不使用这个参数。
2. 固定虚拟单量子位 drive 通道，采样率 1 GHz；每项脉冲至少 1 ns，等待可以为零。
   此数学包络不施加硬件幅度削顶，没有增益、上变频或校准参数。
3. 工具用真实 QAT 指令构造器、EchoEngine 时序与缓冲区方法返回 `instructions`、`timeline` 及 `real/imag`。
   `timeline` 使用半开样本区间 `[startSample,endSample)`；每个样本间隔为 1 ns。
4. Square 期望为 `amplitude * exp(i * phaseRadians)`。Gaussian 以脉冲中心为零、在采样箱中点计算
   `A exp(-t²/(2σ²)) exp(iφ)`，按请求时长截断，不把边缘强制归零。等待区间为零。

错误时长、非有限参数、SDK 初始化或构造失败会显式报错；缺少环境时显式 setup，不生成替代缓冲区。
使用独立 `execution` 设置控制超时、输出量和线程，不以测试样本规模作为能力上限。

QAT logger 的缓存限制在本工作区。适配不调用 engine execute、硬件驱动或 QCaaS 客户端；
EchoEngine 是离线工具，不是量子态模拟器。波形缓冲区与理想数学包络的对照不证明真实测量或校准。
该能力为 L1，返回 `scientificValidation=not_evaluated`。

来源：[官方仓库](https://github.com/oqc-community/qat)、
[Echo 后端](https://github.com/oqc-community/qat/blob/develop/src/qat/purr/backends/echo.py)。
