---
name: simqn-network
description: 用中国科大 QNLab SimQN 模拟单条量子链路的随机丢失、固定延迟及 Werner 纠缠态保真度衰减。
---

# SimQN 量子链路

Agent 经 Harness 调用 `simqn_local` 的 `simulate_simqn_link`，比较不同链路参数下的到达次数、到达时间和保真度。这里的 network 是仿真的量子网络，不会访问互联网。

输入 `attempts` 次独立发送，时间间隔 `intervalSeconds`、固定传播延迟 `delaySeconds`，长度 `lengthMeters`，随机丢失概率 `dropProbability`，以及 Werner 态初始 `initialFidelity`。`decoherencePerMeter` 是每米衰减率；SDK 用 `w=(4F-1)/3`、`w'=w exp(-rate*length)` 计算保真度。延迟没有额外加入存储退相干。`timeSlotsPerSecond` 控制离散时间精度，SDK 向下量化时间；`seed` 使用 NumPy RandomState 可表示的 32 位无符号整数。

Tool 返回 `received`、`dropped` 和逐到达记录；全丢失时 `arrivals=[]`。这是无限带宽、无排队的独立单链路模型，不包含中继交换、量子存储、路由、BB84 协商或密钥生成。分析丢失时使用多次试验，不能把单次采样比率当成保证值。

固定 [SimQN/qns 0.2.3](https://github.com/QNLab-USTC/SimQN)，GPL-3.0，连接默认关闭、由用户自行确认许可并启用。先显式准备 `node scripts/setup-paper-tools.mjs simqn-network`；Python 3.12 的独立环境及依赖由锁文件确定。SDK 可能写本地缓存，最大副作用为 workspace-write；计算不安装依赖、不使用凭据、不连接服务。

调用方选择试验规模，部署限制用独立的 `execution` 控制。当前 L1，`scientificValidation=not_evaluated`；数值与集成测试是开发证据，不等于科学验收。
