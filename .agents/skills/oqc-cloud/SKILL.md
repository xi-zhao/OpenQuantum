---
name: oqc-cloud
description: 本地准备任务、查询设备与状态，以及显式提交一次云任务。
---

先用 `oqc_cloud.prepare_oqc_task` 对结构化电路生成 OpenQASM2 和官方任务载荷。qpuId 必须明确；本地序列化不证明目标存在或编译成功。

用户在设置中配置 `OQC_API_TOKEN`；可选 `OQC_API_ENDPOINT` 为官方 oqc.app HTTPS 服务，默认 https://cloud.oqc.app。用 `oqc_cloud.query_oqc_service` 查询设备或指定 qpuId/taskId 的状态。

仅在用户要求提交并允许相应费用和电路外发时调用 `oqc_cloud.submit_oqc_task`，走 Harness 的 external-write 审批。它提交一次后返回 taskId，不等待执行完成。提交错误可能意味着服务已接受但响应丢失，先查看账户，禁止自动重试。状态查询不会再次提交。SDK 为专有软件，用户按上游许可单独安装。

环境需预先显式准备：`node scripts/setup-paper-tools.mjs oqc-cloud`。Tool 调用不安装依赖。所有结果为 L1 / `scientificValidation=not_evaluated`；SDK 本地或传输夹具检查不等于真实账户连通、硬件运行或科学验收。

来源：[oqc-qcaas-client 3.23.0](https://docs.oqc.app/)。
