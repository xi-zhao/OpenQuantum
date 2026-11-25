# qpanda-qubo 固定 observations 验证

运行 `node .agents/skills/qpanda-qubo/evals/run-evals.mjs`。每个案例同时绑定 fixture SHA-256、
修改内容与预期失败 observation；案例及其预期由版本化 suite 固定。原始正例来自本机锁定环境，
反例改变一个科学条件或证据字段。Validator 不导入 Tool bridge 或 QUBO 编译器。

请求绑定检查区分枚举主算法与 QAOA 的经典参考，核对 QAOA 层数以及 `referenceMode` 的
`required` / `skip` 语义。固定反例与协议单元测试拒绝方法替换、层数错配和遗漏指定参考；
其中合成概率分布只验证绑定行为，不充当 QAOA 科学证据。实时测试另用锁定 SDK 覆盖两类输入、
两种层数和有/无经典参考；概率最大的 bitstring 不等于已证明的全局最优解。

已接入版本化 Acceptance Profile，`reproductionProfiles: []`。开发证据为 L3；执行期只产生 observations，
`provenance.complete=not_checked`；DSH 物化并重读字节后，中央 Builder 才派生 Acceptance。

准备已有固定环境后运行 `OPENQUANTUM_REAL_L2=1 node --test .agents/skills/qpanda-qubo/test/live.test.mjs`，
实时重算与独立参考相互核对；不调用真实模型、量子云或硬件。
