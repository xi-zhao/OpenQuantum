# PyCC 分子势能面的对角 Born–Oppenheimer 修正

调研于 2026-11-24（北京时间）。上游为 CrawfordGroup/pycc，固定源码 `b3aed91adeb71dea552dd85b5d86bd55eda2ad7d`。本窗口合并了 CCSD、冻结核处理和公开的 `pycc.dboc` 入口。查询时上游没有 GitHub Release，PyPI 的同名项目是另一位作者的 Python 优化器。[上游源码](https://github.com/CrawfordGroup/pycc/tree/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d) · [公开入口 PR](https://github.com/CrawfordGroup/pycc/pull/270) · [同名发行包](https://pypi.org/project/pycc/)

## 科研任务与现有路径

在相同几何和基组下，用核质量修正钳核电子势能面，可以研究同位素替换对绝热势能的影响。对角 Born–Oppenheimer 修正（DBOC）取决于电子波函数对核坐标的响应和各裸核的质量。电子相关也会影响修正量，Gauss 等给出了反应能与势垒的例子。臭氧同位素振动带中心研究展示了这一修正在独立课题中的用途。本提案只涉及指定几何上的修正能。[方法论文](https://pubmed.ncbi.nlm.nih.gov/17042583/) · [臭氧同位素应用](https://doi.org/10.1039/D0CP02457K)

OpenQuantum 基线为 `4b06e3ce0f1fa62f6a294c7c538c9e9e2c0f8c92`。PySCF 原生工作台可给出同一几何的电子能，QDK Chemistry 对接哈密顿量与活性空间，SlowQuant 提供电子激发和线性响应。现有清单和这些入口均未给出可复核的 DBOC 工作流。候选推进科研软件接入主线，新增的输出是以 Hartree 表示的修正量及其 HF 参考项、相关贡献。已有电子能可以和定义一致的修正量在同一几何配对记录。[产品定位](../../../README.md#科研能力) · [长期方向](../../roadmap/VISION.md) · [SDK 清单](../../../.agents/sdk-libraries.json) · [SlowQuant](../../../.agents/skills/slowquant-response/SKILL.md) · [QDK Chemistry](../../../.agents/skills/qdk-chemistry/SKILL.md)

## 固定来源与维护成本

最小范围是闭壳层基态的 RHF 和基于 RHF 的 CCSD。Psi4 提供波函数，PyCC 的导数驱动传入 `pycc.dboc`，读取 `reference`、`correlation`、`total`。复用原生 SDK 工作台、固定源码校验和宿主代码执行，两种宿主共用一份说明和可编辑示例。包装上述函数的额外 Tool 不会减少输入中必须说明的几何、基组、电子相关或质量约定。[公开实现](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/properties.py#L234-L285) · [质量权重](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/hfwfn.py#L640-L666) · [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md)

PyCC 采用 BSD-3-Clause，源码分发须保留版权与许可。它声明 Python 3.11 及以上、NumPy、SciPy、opt_einsum、qcelemental 和 h5py。Psi4 是额外的二进制依赖，上游 CI 通过 conda-forge 安装，仓库的常规 Python 准备入口使用冻结的 uv 锁。接入时先用隔离前缀固定 Psi4 的构建、Python ABI、PyCC 源和依赖，记录安装体积、计算时长和导数临时文件峰值。若现有准备机制无法复现这套环境，保留观察，单独记录缺少的构建条件。评测可以直接使用 CFOUR 的公开输出。[许可](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/LICENSE) · [依赖](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pyproject.toml) · [上游 CI](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/.github/workflows/CI.yaml) · [Psi4 官方分发](https://psicode.org/psi4manual/master/build_obtaining.html) · [现有准备入口](../../../scripts/setup-paper-tools.mjs)

## 接入阶段的有界核验

1. **独立数值参考。** CFOUR 公开算例 382 是中性单重态水，O–H 为 0.958 Å、键角 104.5°、球谐 cc-pVTZ、冻结氧 1s 核、RHF-CCSD。原始输出给出的 DBOC 为 **0.0027976021 Hartree（614.002687 cm⁻¹）**。在固定几何、核质量、球谐基、冻结核及收敛条件后，通过公开入口比较总修正，并报告绝对偏差、参考输出精度与常数版本差异。这份输出由 CFOUR 发布，独立于 PyCC 仓库内的回归常数。[原始输入](https://cfour.uni-mainz.de/cfour/download/examples/input.382) · [原始输出](https://cfour.uni-mainz.de/cfour/download/examples/output.382)
2. **同位素与基线。** 对 H₂ 和 D₂ 固定 0.74186 Å、cc-pVDZ、闭壳层与收敛条件。记录钳核 RHF 电子能、实际使用的裸核质量和两次 DBOC。在相同电子波函数下，两核等比例换质量，预期修正比为实际的 `M_H/M_D`（D₂ 除以 H₂）。对照输入与结果，可区分质量修正、基组变化和几何重新优化的贡献。[CFOUR 质量约定](https://cfour.uni-mainz.de/cfour/index.php?n=Main.CalculationOfDiagonalBorn-OppenheimerCorrections) · [上游小分子用例](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/tests/test_102_hf_dboc.py)
3. **否定条件。** 若合理收敛后仍无法解释与独立参考的差值、质量变化不满足上述关系，或现有固定环境可直接产生同样的相关 DBOC，则重新评估接入。首轮限于单点、单参考和上述方法。冻结核 MP2 的两种处理在上游数据中已给出不同结果，留在范围外。[冻结核 MP2 差异](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/tests/test_106_mp2oc_dboc.py) · [CCSD 回归来源](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/tests/test_107_ccsd_dboc.py)

本轮完成源码、发行来源与参考数据的只读核对。安装兼容性、数值复现和实际成本交由“候选接入”任务在同一 PR 验证。用户可随时暂停或关闭提案。
