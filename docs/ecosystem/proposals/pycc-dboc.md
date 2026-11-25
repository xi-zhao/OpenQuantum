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

11 月 24 日完成候选来源与参考数据核对。以下为同一 PR 的接入阶段实测。

## 2026-11-25 接入核验

**保留观察。** 固定版 PyCC 可以在单点上给出经独立程序核对的 CCSD 核质量修正。已有 PySCF 工作台能用行列式重叠复核 RHF 项。本轮核对的现有化学入口仍缺少相关修正的直接计算路径。交付的断点是 Psi4 的二进制环境。主分支的 Python 准备入口使用冻结的 uv 项目，公开 Python 包索引没有 `psi4==1.11`，在干净环境中解析该要求返回无解。正式接入等到已有准备入口能复现受支持的 Psi4 构建再续办。[Python 准备入口](../../../scripts/setup-paper-tools.mjs) · [原生 SDK 分派](../../../scripts/setup-sdk.mjs) · [Psi4 官方分发说明](https://psicode.org/psi4manual/master/build_obtaining.html)

### 同一几何的科学输出

修正量均为 Hartree。每个分子使用中性单重态、球谐基组、常规 PK 积分和单线程。RHF 能量与密度收敛设置为 10⁻¹²，CCSD 能量与残差设置为 10⁻¹¹。水冻结氧 1s，其余两例关联全部电子。

| 分子与基组 | 钳核 RHF 能量 | DBOC 的 RHF 项 | DBOC 的相关项 | DBOC 总量 |
| --- | ---: | ---: | ---: | ---: |
| H₂，cc-pVDZ | −1.128719204627 | 0.000452791760623 | 0.000057092430754 | 0.000509884191377 |
| D₂，cc-pVDZ | −1.128719204627 | 0.000226508283310 | 0.000028560388251 | 0.000255068671561 |
| H₂O，cc-pVTZ | −76.057112716300 | 0.002718053284468 | 0.000079548808902 | 0.002797602093370 |

**水的绝对值。** CFOUR 算例 382 在 O–H 为 0.958 Å、夹角 104.5° 的几何上给出 0.0027976021 Hartree。复用其输出中印至八位小数的笛卡尔坐标（bohr）、打印的同位素原子质量、58 个球谐基函数及一个冻结轨道，PyCC 总量与该印刷值相差 6.63 × 10⁻¹² Hartree。CFOUR 的 Hartree 栏只印十位小数。另列的波数为 614.002687 cm⁻¹，本次 qcelemental 0.51.4 采用 CODATA 2014 换算得到 614.002688 cm⁻¹。两端输入坐标的印刷精度、输出舍入与换算常数均限制末位比较，现有数据无法区分各自贡献。[CFOUR 输入](https://cfour.uni-mainz.de/cfour/download/examples/input.382) · [CFOUR 输出](https://cfour.uni-mainz.de/cfour/download/examples/output.382)

**同位素与基线。** H₂、D₂ 的键长均为 0.74186 Å。按固定源码的质量约定换算，单个氢核与氘核的质量分别为 1836.152647365 和 3670.482941388 个电子质量。D₂/H₂ 的总修正比与 H/D 的裸核质量比均为 0.500248244355。另用主分支锁定的 PySCF 2.14.0 重算 RHF，钳核能量与 Psi4 相差 3.11 × 10⁻¹² Hartree。对六个核笛卡尔坐标分别位移 ±h，利用两套 AO 基之间的重叠构造闭壳层行列式重叠 S，以 (1−S)/(2h²) 求波函数导数范数平方。h 依次取 0.004、0.002、0.001 bohr。H₂ 的 RHF 修正由 0.000452784153 收敛至 0.000452791285 Hartree，最后两步按二阶误差外推后与 PyCC 的 RHF 项相差 7.59 × 10⁻¹³ Hartree。这个独立对照检验 RHF 项，相关总量的独立对照来自水的 CFOUR 算例。[PySCF 环境](../../../examples/quantum-algorithms/pyproject.toml) · [上游裸核质量约定](https://github.com/CrawfordGroup/pycc/blob/b3aed91adeb71dea552dd85b5d86bd55eda2ad7d/pycc/hfwfn.py#L654-L666)

### 环境、成本与复现

在 Apple Silicon 上从 conda-forge 安装 Python 3.11.18 与 Psi4 1.11（`py311he87b951_4`），再从已核对的 BSD-3-Clause 源码提交本地构建 PyCC。隔离前缀占约 1.1 GiB，首次创建耗时 225 秒，求解器报告下载量 229 MB。用 SHA-256 锁离线重建第二个前缀，96 个 conda 包与首次安装逐项相符。在重建前缀运行下方示例，三个分子的能量和各修正项均复现。水算例耗时 34.7 秒，进程最大驻留内存约 1.87 GiB，每 50 ms 采样观测到的 PyCC 导数文件峰值为 1.52 GiB。这些数字仅描述本机单点算例。当前实验覆盖上述三个基态几何；其他平台、振动光谱与产品宿主执行仍待验证。[本轮 macOS ARM64 实验锁](pycc-dboc/conda-osx-arm64.lock)

<details>
<summary>复现 PyCC 单点计算</summary>

在独立工作目录准备前缀与源码。使用上方实验锁的实际路径替换 `LOCK`，将临时目录置于有足够空间的磁盘。

```sh
micromamba create -y -p "$PWD/env" --file "$LOCK"
git init -q pycc-src
git -C pycc-src fetch --depth=1 https://github.com/CrawfordGroup/pycc.git b3aed91adeb71dea552dd85b5d86bd55eda2ad7d
git -C pycc-src checkout --detach FETCH_HEAD
"$PWD/env/bin/python" -m pip install --no-index --no-deps --no-build-isolation ./pycc-src
mkdir -p scratch
export TMPDIR="$PWD/scratch" PSI_SCRATCH="$PWD/scratch" PYCC_DERIV_STORE_DIR="$PWD/scratch"
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1
```

将下段保存为 `verify.py`，用 `"$PWD/env/bin/python" verify.py water` 运行。参数 `h2` 与 `d2` 给出表中另外两行。

```python
import os
import sys
import psi4
import pycc

case = sys.argv[1]
geometries = {
    "water": ("O 0 0 .12403889\nH 0 -1.43143120 -.98429357\nH 0 1.43143120 -.98429357\nunits bohr",
              [15.994914630, 1.007825035, 1.007825035]),
    "h2": ("H 0 0 0\nH 0 0 .74186\nunits angstrom", [1.00782503223] * 2),
    "d2": ("H 0 0 0\nH 0 0 .74186\nunits angstrom", [2.01410177812] * 2),
}
geometry, masses = geometries[case]
psi4.set_num_threads(1)
psi4.set_memory("2 GB")
psi4.core.IOManager.shared_object().set_default_path(os.environ["PSI_SCRATCH"])
mol = psi4.geometry("0 1\n" + geometry + "\nsymmetry c1\nno_com\nno_reorient")
for i, mass in enumerate(masses):
    mol.set_mass(i, mass)
mol.update_geometry()
psi4.set_options({"basis": "cc-pvtz" if case == "water" else "cc-pvdz",
                  "puream": True, "reference": "rhf", "scf_type": "pk",
                  "freeze_core": case == "water", "e_convergence": 1e-12, "d_convergence": 1e-12})
energy, scf = psi4.energy("scf", molecule=mol, return_wfn=True)
cc = pycc.ccwfn(scf, model="CCSD")
result = pycc.dboc(pycc.CCderiv(cc, e_conv=1e-11, r_conv=1e-11, maxiter=200))
print(case, energy, float(result.reference), float(result.correlation), float(result.total))
```

</details>
