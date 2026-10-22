# QuTiP Rust Wigner 独立审阅

审阅日期：2026-10-20。审阅者：独立科学审阅 Agent `pauli_review`。实现者整理本记录，保留审阅实际检查范围；不属于 central Acceptance Builder 的正式 Acceptance Report。

## 结论

冻结源码与正式证据范围内，无未解决实质问题。单模 Fock 空间 N=64、201×201 网格代表任务为 **171.772125 → 30.18325 ms，5.690975×**，包括输入转换、合同检查、递推准备、FFI 和完整可写二维结果。最快满足同一容差的 QuTiP 对照同样为默认 Clenshaw。

## 实际审阅与复算

- 独立读取安装 QuTiP 5.3.1 的源码，核对 A2=g(x+iy)、B=|A2|²、g²/(2π) 包络、上三角复系数、非对角因子2、Clenshaw 同时更新与 W[iy,ix] 方向。
- 直接检查 Rust 源码、32点分块、末尾不足一块的循环及 Python 适配器。另做270条完整 Hermitian 矩阵基核验，覆盖N=2..6、三种g、乱序/重复坐标、非方形网格和35点尾块。均与独立Laguerre公式通过；未运行性能计时。
- 四个正式完整网格 Rust/QuTiP 默认最大差为 **6.522560269672795e-16**；Rust/独立 Laguerre 最大差为 **1.4710455076283324e-15**。
- 源码验证程序的272项独立/解析/失败路径检查均通过，最大独立及解析误差 **6.328271240363392e-15**。覆盖真空、最高40光子Fock态、正负虚相干、ket/bra/CSR、多g及拒绝输入。
- 逐条复算全部144条CSV，9轮样本、调用数、执行顺序、中位数和IQR与benchmark.json一致；逐样本误差、精度状态与输出SHA256均与4份完整NPZ对应方法一致。
- 使用冻结扩展重放四个正式输入，Rust输出与NPZ逐位一致；扩展摘要在重放前后不变。
- QuTiP iterative在medium与representative的18个正式样本未满足相同容差，差异分别约8.57e-12与4.00e-4。原样保留，不放宽Rust容差，不作为同精度的快速对照。
- 报告从实测cpu/platform派生硬件；在临时目录仅用保存数据重建，README和HTML与正式文件逐字节一致，图像可生成。没有重跑性能或修改正式文件。

## 审阅发现与修复

审阅发现：Python 的 float(np.complex128(1+2j)) 可能仅警告并丢弃虚部。已在float转换前检查g必须为0维实数数值，显式拒绝NumPy/Python复数和数组。新增拒绝用例通过，审阅者独立重放确认。当前无遗留项。

## 固定摘要

| 工件 | SHA-256 |
| --- | --- |
| `case.py` | `be983d1354623a32c98d65244318abfdb4dc8612bd9539da1722c896996574a7` |
| `workloads.py` | `7de104cb6a75b9d864deac8da385dfc5d6e75a5f8c6078ef800000b10ca0248e` |
| `common.py` | `6cef5808a973120110591a7f913b9f57b337fd8bb08da7ab5853478b56c892a3` |
| `validate.py` | `8602592f0188f2d3f60108dae0e1c9a2334a395d94b8e346a28105d1a3d04a77` |
| `benchmark.py` | `5f6e7334cfda8862cc75a79d7ee60449394e9347f478e1a9ce1ca96a5c5af522` |
| `plan.json` | `a1427ddf38d2e224ab7d77e6ec2fdcfec22548de22a77243ee0b4db6341688d5` |
| `Cargo.toml` | `d0e59514e14d452b4c5ccedd1268ae6f895cae15351756c1f7af9ab696405ee2` |
| `Cargo.lock` | `1f087481ea7a6c3fc11489b744b93ee7b9774959694d90bf429a2890bd249c3d` |
| `build.rs` | `c609c2f1a8594abf959388e559d76241e51b0216faa7b37f529255eb1fc2c5eb` |
| `rust/lib.rs` | `f6da483144d796d475bfcec24e89e7feaedd457598a5d273fe63b334fdec5e66` |
| `make_report.py` | `d7e1fa081fee7e33383fe91c6d70f30b66c949dcad2dba3daf9eb481f102b8a4` |
| `results/benchmark.json` | `ac6873253e9c7e60e2f57a4c22b52afeb8339d267bc4d8639cbe3bdc9207baaa` |
| `results/raw-timings.csv` | `b951712547f4bdddb96e94653f0d48f9ecf6e1c1f3c1c908ff8632286df9880a` |
| `results/validation.json` | `fb2f1468b56a0ee525cdbb4a40d3a1015da956fdf4501b0627501710244880af` |
| 本机编译扩展（不入库） | `ba06ad316a024dbfb70bbf740f8f17b92fed419989f63a9f0ce7e5f01b507f5c` |

## 边界

该结果只覆盖报告列出的单模Wigner计算，不代表动力学求解或整个QuTiP提速。Rust仍持有GIL，未使用多线程、GPU或fast-math。接口检查Hermitian性，不宣称对任意输入完成PSD/归一化科学验收。保留BSD-3-Clause来源和归属。
