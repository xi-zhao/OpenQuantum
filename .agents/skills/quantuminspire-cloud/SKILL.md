---
name: quantuminspire-cloud
description: 通过官方 SDK 分页查询设备与既有任务状态。
---

用户通过设置保存 `QUANTUMINSPIRE_API_TOKEN` 后，用 `quantuminspire_cloud.query_quantum_inspire` 分页查询后端，或以 jobId 查询已有任务状态。后端列表返回 page/pageSize/total，读取后续页需显式指定页码；服务的单页上限为 100。

仅访问固定 Quantum Inspire HTTPS 服务；不打开登录网页，不读取或写入 ~/.quantuminspire，不自动刷新 Token。过期 Token 由用户更新。结果仅含所需状态和设备字段，不返回服务原始异常、日志或鉴权资料。本能力不提交、取消或轮询任务，网络编程仿真用既有 NetQASM 或 SimQN 能力。

环境需预先显式准备：`node scripts/setup-paper-tools.mjs quantuminspire-cloud`。Tool 调用不安装依赖。所有结果为 L1 / `scientificValidation=not_evaluated`；SDK 本地或传输夹具检查不等于真实账户连通、硬件运行或科学验收。

来源：[quantuminspire 4.1.0](https://github.com/QuTech-Delft/quantuminspire)。
