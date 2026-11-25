# qpanda-qubo 固定 observations 验证

运行 `node .agents/skills/qpanda-qubo/evals/run-evals.mjs`。每个案例同时绑定 fixture SHA-256、
修改内容与预期失败 observation；案例及其预期由版本化 suite 固定。原始正例来自本机锁定环境，
反例改变一个科学条件或证据字段。Validator 不导入 Tool bridge 或 QUBO 编译器。

`acceptanceProfiles: []`、`reproductionProfiles: []`。开发证据为 L2；执行只产生 observations，
`provenance.complete=not_checked`，不派生科学 Acceptance。

准备已有固定环境后运行 `OPENQUANTUM_REAL_L2=1 node --test .agents/skills/qpanda-qubo/test/live.test.mjs`，
实时重算与独立参考相互核对；不调用真实模型、量子云或硬件。
