---
name: aqt-workbench
description: 官方离子阱后端本地编译与仿真，以及用户鉴权后的设备查询。
---

使用 `aqt_local.simulate_aqt_circuit` 将结构化电路编译到官方 AQT 原生门后，在 SDK 离线后端采样。角度为弧度，输出位串从 q[n-1] 到 q[0]；可选择 SDK 示例去极化噪声。先核对 shots 总数与门集，再解释概率的采样误差。SDK 本身限制每个作业不超过 20 比特、2000 shots，超出会明确失败。

需要云设备时调用 `aqt_local.list_aqt_devices`，用户在设置中保存 `AQT_API_TOKEN`。缺凭据立即失败，设备发现不表示 QPU 执行已验证。离线动作从不读取该令牌，不登录、不读取 .env；此能力不提交 AQT 云任务。

环境需预先显式准备：`node scripts/setup-paper-tools.mjs aqt-workbench`。Tool 调用不安装依赖。所有结果为 L1 / `scientificValidation=not_evaluated`；SDK 本地或传输夹具检查不等于真实账户连通、硬件运行或科学验收。

来源：[qiskit-aqt-provider 1.15.0](https://github.com/qiskit-community/qiskit-aqt-provider)。
