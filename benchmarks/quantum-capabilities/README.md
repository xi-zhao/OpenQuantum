# OpenQuantum 固定量子能力语料基线

这个目录保存一个小而可审计的 MQT Bench 电路语料集。它解决的是“后续能力比较使用哪个固定分母”的问题，不代表任何模型、SDK 或量子硬件已经取得 benchmark 分数。

## v1 固定分母

分母固定为 3 个案例：`ghz-3`、`qft-3`、`bv-4`。三者都来自 `mqt.bench==2.2.3` 的算法级（`ALG`）电路，调用时固定 `random_parameters=False`，并序列化为 OpenQASM 2。

选择原则：

- GHZ：覆盖多量子位纠缠制备、屏障和测量。
- QFT：覆盖自定义复合门、受控相位和交换门。
- Bernstein-Vazirani：覆盖 oracle 结构、辅助量子位和经典寄存器映射。

这个小分母适合做集成冒烟测试和格式兼容性基线，不足以支持“量子优势”“综合器全面更优”或“真实硬件性能”结论。

## 事实边界

- `manifest.json` 锁定生成器版本、案例 ID、输入规模、结构指标和 fixture SHA-256。
- `fixtures/*.qasm` 是实际比较输入；验证命令不访问网络、不重新生成输入。
- 分母变化必须创建新的 corpus 版本，不能静默替换 v1 案例。
- delivery、语义正确性、Validator 稳定性和 benchmark 版本必须分列报告。
- provider/runtime 未交付不能算成算法语义失败；没有独立 Validator 的输出只能记为非最终观察。

## 命令

```bash
npm run benchmark:quantum-capabilities:test
```

上游刷新预览需要 `uv`，只把重新生成的候选内容打印到 stdout，不会覆盖已锁定 fixture：

```bash
UV_PROJECT_ENVIRONMENT=.openquantum/python-envs/mqt-bench \
  uv run --project benchmarks/quantum-capabilities --python 3.12 \
  python benchmarks/quantum-capabilities/scripts/generate.py
```
