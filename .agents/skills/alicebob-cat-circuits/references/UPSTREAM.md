# Alice & Bob Qiskit Provider 上游核验

2026-09-27 核验；固定版本：qiskit-alice-bob-provider 1.3.0。Python 3.12，完整依赖由同目录 `uv.lock` 锁定。

- [官方仓库](https://github.com/Alice-Bob-SW/qiskit-alice-bob-provider)
- [上游许可证](https://raw.githubusercontent.com/Alice-Bob-SW/qiskit-alice-bob-provider/main/LICENSE)：Apache-2.0。
- 已检查安装 wheel 的实际源码/API：AliceBobLocalProvider.build_physical_backend / build_logical_backend / build_logical_noiseless_backend；ProcessorSimulator.run；physical_cat.py 与 logical_cat.py 的参数验证。
- 真实数值回归位于 `../test/science_test.py`，禁用 socket 连接后运行；测试属于本地实现证据，`scientificValidation=not_evaluated`。
- 本适配器不复制上游实现代码，不构造远程客户端，不提交硬件作业。依赖安装是独立显式 setup。
