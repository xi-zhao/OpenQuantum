---
name: qcarchive-query
description: 使用 MolSSI QCPortal 查询 QCArchive 单点计算记录，按 ID 或方法、程序、基组筛选并返回分子、原子单位能量、状态和来源。仅查询既有数据，不提交计算。
---

# QCArchive 数据查询

适用于检索已有量子化学结果、核对计算条件和收集可追溯参考。实时小分子计算仍使用现有 PySCF/SQD 能力。

1. 显式准备 `node scripts/setup-paper-tools.mjs qcarchive-query`，在量子组件设置启用 `qcarchive_data`。
2. 用户设置 `QCPORTAL_ADDRESS`；私有服务同时设置 `QCPORTAL_USERNAME` 与 `QCPORTAL_PASSWORD`。公开服务可匿名查询。配置通过 Harness 凭据引用注入，不能写进 Tool 参数或报告。
3. 调用 `query_qcarchive_singlepoints`：选 `recordIds` 或 `program` / `method` / `basis` 筛选；`limit` 只限制返回记录数，不代表命中总数。
4. 解释结果时保留 server、recordId、status、program、method、basis、分子电荷、多重度和 provenance。几何为 bohr，energyHartree 为 hartree；缺失结果保持 null。
5. 与 SQD/PySCF 对照前核对几何、基组、方法、电荷、多重度、活性空间和单位。记录查询成功不等于数值正确或科学验收通过。

连接默认关闭；缺少服务器地址或凭据只填一半时在发请求前失败。仅允许配置服务器的 HTTPS（本地回环可 HTTP），不提供任意 URL、文件下载、提交、修改或删除接口。账户、读权限与服务器兼容性由用户配置；本地协议测试不代表真实服务已联通。

来源：[QCArchive](https://qcarchive.molssi.org/)、[QCPortal 查询文档](https://docs.qcarchive.molssi.org/user_guide/record_retrieval.html)。QCPortal 0.70，BSD-3-Clause。
