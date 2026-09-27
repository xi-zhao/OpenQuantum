# IQM Client 上游核验

2026-09-27 核验；固定版本：iqm-client[qiskit] 35.0.3。Python 3.12，完整依赖由同目录 `uv.lock` 锁定。

- [官方仓库](https://github.com/iqm-finland/iqm-client)
- [上游许可证](https://raw.githubusercontent.com/iqm-finland/iqm-client/main/LICENSE.txt)：Apache-2.0。
- 已检查安装 wheel 的实际源码/API：iqm.qiskit_iqm.fake_backends；iqm.qiskit_iqm.iqm_circuit_validation.validate_circuit。fake backend.run 的源代码只转发 shots，适配层显式使用 AerSimulator 和 SDK noise_model 传种子。
- 真实数值回归位于 `../test/science_test.py`，禁用 socket 连接后运行；测试属于本地实现证据，`scientificValidation=not_evaluated`。
- 本适配器不复制上游实现代码，不构造远程客户端，不提交硬件作业。依赖安装是独立显式 setup。
