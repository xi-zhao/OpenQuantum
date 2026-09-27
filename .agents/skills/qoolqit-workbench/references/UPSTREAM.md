# QoolQit 上游核验

2026-09-27 核验；固定版本：qoolqit 1.4.0，pulser 1.9.1。Python 3.12，完整依赖由同目录 `uv.lock` 锁定。

- [官方仓库](https://github.com/pasqal-io/qoolqit)
- [上游许可证](https://raw.githubusercontent.com/pasqal-io/qoolqit/v1.4.0/LICENSE.md)：PASQAL MIT-derived，含内部研究或学术用途的专利许可限制；不得标为标准 MIT。默认关闭，明确选择后启用。
- 已检查安装 wheel 的实际源码/API：QuantumProgram.compile_to(default)；UnitConverter.from_energy；WaveformConverter 与 CompositeWaveform 的纳秒转换；调用 qoolqit.waveforms.utils.round_to_sum 核对真实段分配，不复制上游实现。
- 真实数值回归位于 `../test/science_test.py`，禁用 socket 连接后运行；测试属于本地实现证据，`scientificValidation=not_evaluated`。
- 本适配器不复制上游实现代码，不构造远程客户端，不提交硬件作业。依赖安装是独立显式 setup。
