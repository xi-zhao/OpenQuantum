# 保留的实验与基准数据

这里保存可复跑的实验源码和支撑产品说明的冻结证据。2026-11-25 逐文件盘点后，现有 NPZ / PNG 均有
provenance、文档、主页或实验脚本引用，没有确认可删除的零引用一次性大文件。

- `qutip-rust-wigner`：保留计时/验证 JSON、原始 CSV、四种输入规模的 NPZ、报告图片与 provenance。
  主页图表和 `make_report.py` 直接读取 `representative-inputs-outputs.npz`；tiny/small/medium 三份数组
  也被 `validation.json` 和 `provenance.json` 的摘要绑定，不能仅凭没有 JS 直接引用而移除。
- `pennylane-rust-commutator`：保留完整参考/Rust 输出、固定输入、计时、重放核验及 first-run 记录。
  `export_outputs.py` 默认读取 `results/reference-outputs.npz`；两份输出即使字节相同，仍分别对应参考
  和 Rust 路径，并有 README / provenance 引用。
- `schrodingerization-heat1d`：保留完整独立实验及日期化证据；文档和视频材料引用其报告/图像。

主页相关摘要、`site/assets/benchmark-charts.json` 绑定的输入，以及各实验 provenance 记录的文件均属于
保留范围。原生扩展、Cargo target 等可重建缓存沿用各目录 `.gitignore`；后续新增一次性大生成物放外部
工件目录。清理前应同时核对文档、构建/测试、来源摘要和 Python 动态路径，不改变复现脚本的默认输入。
