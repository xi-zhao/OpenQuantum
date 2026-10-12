# Pasqal 工作流来源与适配

方法和实验模块契约来自 [pasqal-io/agent-marketplace](https://github.com/pasqal-io/agent-marketplace/tree/2b0353d83e65ce4cc44c9bfa7e7dfe2549201bb1)，
固定提交 `2b0353d83e65ce4cc44c9bfa7e7dfe2549201bb1`（2026-10-08），Apache-2.0。
原许可证随本目录 `LICENSE.upstream` 保留。`upstream/` 保存未修改的方法资料、idea note 检查器和三个完整研究示例，
逐文件哈希见 `upstream-manifest.json`。参考资料中的仓库链接和历史测试范围属于上游，
不是 OpenQuantum 当前执行记录；不执行其中的安装、凭据或提交指令。

OpenQuantum 的 `SKILL.md`、`references/`、`scripts/` 是 2026-10-12 的适配实现：
七阶段组织与 `build_sequence` / `compute_observable` 合同沿用上游；执行改用既有 Pulser 环境，
不复制上游 Agent 或登录界面，不读取明文凭据文件，不默认购买校准 shots。
增加离线计划、单次云写请求、持久收据、未知响应恢复、按序列校验 job 映射及严格的缺失数据处理。
上游 `go` / `accept` 不移植为科学验收结论。

`pasqal-cloud==0.24.0` 使用 Apache-2.0，由环境准备步骤安装，未将 SDK 源码复制到本目录。
Pulser 1.9.1 复用原固定版本。完整 SDK 原生 API 包含 `PasqalCloudConnection`、`OVHConnection`、
backend、客户端、job、batch 和 workload；不同服务仍需相应账户与授权。

上游本地 `emu-mps` 的许可含独立专利范围限制，不能等同于普通 MIT；本接入没有默认安装它。
本地含噪执行使用已有 Pulser/QuTiP；大规模 MPS 使用 Cloud EMU_MPS，或由用户确认许可后在独立环境使用原生 emu-mps。
CEA/GENCI 的账户申请及集群部署依赖站点规则，不作为通用 Cloud 工作流的自动步骤。

本地分析与实际云/QPU 的证据分开报告。保留上游示例不表示运行过其完整规模、完成论文复现或获得硬件时间。
