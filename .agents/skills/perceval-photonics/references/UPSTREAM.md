# Perceval 上游核验

2026-09-27 核验；固定版本：perceval-quandela 1.3.0。Python 3.12，完整依赖由同目录 `uv.lock` 锁定。

- [官方仓库](https://github.com/Quandela/Perceval)
- [上游许可证](https://raw.githubusercontent.com/Quandela/Perceval/main/LICENSE)：MIT，附 Exqalibur Python bindings 与标准 Perceval 组合分发的特别例外。例外不覆盖 Exqalibur 的任意独立用途。
- 已检查安装 wheel 的实际源码/API：perceval.components.linear_circuit.Circuit.add / BS.H / PS / PERM；perceval.backends.SLOSBackend.prob_amplitude；perceval.utils.allstate_iterator。
- 真实数值回归位于 `../test/science_test.py`，禁用 socket 连接后运行；测试属于本地实现证据，`scientificValidation=not_evaluated`。
- 本适配器不复制上游实现代码，不构造远程客户端，不提交硬件作业。依赖安装是独立显式 setup。
