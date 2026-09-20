# 候选库开发回归

此目录是开发期证据，不是用户运行时 Validator。工具调用和数值检查均不推导 central Acceptance。

- `cleitonforge/`：固定 Apache-2.0 原始 bug-zoo 三个样本；`compiler_regressions.py` 验证 Qiskit 2.5.1 的两组已修复取消错误和一组合理数值容差案例。加上 global-phase/hidden-CZ 对照、两个 Compact 已知验证假阳性和实际适配拒绝错误候选，共 10 个固定检查。
- `qec-burst-scaling/`：固定 MIT 原始 circuit builder 与 Wilson 统计；`qec_burst_regression.py` 用 Stim 1.16.0 / PyMatching 2.4.0，在 d=3、3 rounds、4096 shots 下比较 X/Z memory 与宽度1/5、相同 excess exposure 0.19 的局域瞬态去极化。

每组 baseline 与 informed decoder 复用同一 syndrome/observable 样本，保留 paired discordances。
这是独立单比特噪声概率增加；不是相关多比特 Pauli burst。informed 预先知道位置、时间和强度，
不是在线检测。有限算例不验证 scaling law，也不要求任何译码器一定更好。本次四组两译码器失败数完全相同。

第五个 QEC 检查覆盖 tagged/comment DEM 解析与 PyMatching 消费。未闭合 tag EOF 在固定 Stim 版本可能
不返回，因此在已加载 Stim 的独立子进程中仅等待 50ms 后终止，记录 `bounded_child_timeout_known_upstream_defect`；
这个记录不是正常拒绝或上游缺陷已修复的证明。不得将该负例直接移回进程内。

运行命令见[接入说明](../../docs/integrations/CANDIDATE_LIBRARIES.md)。测试只把有限检查的预期结果计入固定分母，
上游已知缺陷单列；不把测试通过写成完整编译器正确性或通用 QEC 性能认证。
