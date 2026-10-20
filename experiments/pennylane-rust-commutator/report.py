"""Render saved measurements; this does not run a benchmark or import PennyLane."""
import html
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results"
LABELS = {
    "one-qubit": ("单比特 X 与 Y", "1 qubit, 1 x 1 term"),
    "small-4q": ("4 位随机算符和，16 × 16 项", "4 qubits, 16 x 16 terms"),
    "dense-16q-64": ("16 位稠密随机，64 × 64 项", "16 qubits, 64 x 64 terms"),
    "dense-16q-128": ("16 位稠密随机，128 × 128 项", "16 qubits, 128 x 128 terms"),
    "dense-16q-256": ("16 位稠密随机，256 × 256 项", "16 qubits, 256 x 256 terms"),
    "dense-32q-256": ("32 位稠密随机，256 × 256 项", "32 qubits, 256 x 256 terms"),
    "local-32q-pool512": ("32 位局域 H 与二体算符和，125 × 512 项", "32q local H, 125 x 512 terms"),
    "sparse-64q-256": ("64 位稀疏随机，256 × 256 项", "64 qubits, 256 x 256 sparse terms"),
    "commuting-32q-256": ("32 位全可交换，输出为零", "32q commuting, zero output"),
}


def machine_label(data):
    return str(data.get("cpu") or data.get("platform") or "Hardware not recorded")


def main():
    data = json.loads((OUT / "benchmark.json").read_text())
    validation = json.loads((OUT / "validation.json").read_text())
    rows = data["cases"]
    machine = machine_label(data)
    local = next(row for row in rows if row["kind"] == "local")
    def ms(row, name):
        return row["timings"][name]["median_seconds"] * 1000
    labels = [LABELS[row["id"]][1] for row in rows]
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                         "axes.spines.top": False, "axes.spines.right": False})
    figure, (left, right) = plt.subplots(1, 2, figsize=(15.5, 6.5), gridspec_kw={"width_ratios": [1.7, 1]})
    y = np.arange(len(rows))
    for offset, name, label, color in [(-0.24, "pennylane", "PennyLane 0.45.1", "#778394"),
                                     (0, "python_end_to_end", "Python bit masks", "#4686cc"),
                                     (0.24, "rust_end_to_end", "Rust + conversions", "#1f9c89")]:
        values = np.array([ms(row, name) for row in rows])
        low = np.array([row["timings"][name]["q25_seconds"] * 1000 for row in rows])
        high = np.array([row["timings"][name]["q75_seconds"] * 1000 for row in rows])
        left.barh(y + offset, values, height=0.21, label=label, color=color,
                  xerr=np.array([values-low, high-values]), error_kw={"elinewidth": 1, "capsize": 2})
    left.set(yticks=y, yticklabels=labels, xscale="log", xlabel="Median end-to-end wall time (ms, log scale)")
    left.invert_yaxis()
    left.grid(axis="x", alpha=0.17)
    left.set_axisbelow(True)
    left.legend(loc="lower right", frameon=False)
    speedups = [row["end_to_end_speedup"] for row in rows]
    colors = ["#c58126" if value < 1 else "#99a2af" if row["output_terms"] == 0 else "#1f9c89"
              for row, value in zip(rows, speedups)]
    right.barh(y, speedups, color=colors, height=0.6)
    right.set(yticks=y, yticklabels=[], xscale="log", xlabel="PennyLane / Rust total time")
    right.invert_yaxis()
    right.axvline(1, color="#555", linestyle="--", linewidth=1)
    right.set_xlim(0.25, 135)
    for index, value in enumerate(speedups):
        right.text(value*1.12, index, f"{value:.2f}x", va="center", fontsize=10)
    right.grid(axis="x", alpha=0.17)
    right.set_axisbelow(True)
    figure.suptitle("OpenQuantum case: a Rust implementation of PennyLane Pauli commutators", x=0.02, ha="left", fontsize=15, fontweight="bold")
    figure.text(0.02, 0.025, f"{machine} | fixed binary64 coefficients | 9 interleaved rounds | bars: medians, whiskers: IQR | grey case has zero output", fontsize=9, color="#586476")
    figure.tight_layout(rect=[0, 0.06, 1, 0.94])
    figure.savefig(OUT / "timings.png", dpi=170)
    figure.savefig(OUT / "timings.svg")
    svg = OUT / "timings.svg"
    svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
    plt.close(figure)
    table_header = "| 场景 | PennyLane / ms | 位编码 Python / ms | Rust 完整调用 / ms | 完整调用加速 | 非零输出项 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n"
    table_rows = [f"| {LABELS[row['id']][0]} | {ms(row,'pennylane'):.6f} | {ms(row,'python_end_to_end'):.6f} | {ms(row,'rust_end_to_end'):.6f} | {row['end_to_end_speedup']:.2f}× | {row['output_terms']} |" for row in rows]
    headline = f"{ms(local,'pennylane'):.2f} ms → {ms(local,'rust_end_to_end'):.2f} ms，{local['end_to_end_speedup']:.2f}×"
    intro = f"实测硬件 {machine} 上，PennyLane 0.45.1 的代表案例为 **{headline}**。该任务计算一个 32 量子位、125 项局域 Hamiltonian 与一个含 512 项的二体算符和的**单个对易子**。时间包含从 PennyLane 对象转入 Rust、计算、返回及重建 PennyLane 对象。"
    readme_intro = intro.replace(machine, html.escape(machine), 1)
    explanation = f"位编码 Python 的完整调用为 {ms(local,'python_end_to_end'):.2f} ms，Rust 为 {ms(local,'rust_end_to_end'):.2f} ms，后一步的收益为 {ms(local,'python_end_to_end')/ms(local,'rust_end_to_end'):.2f}×。同为预编码输入时，Python 内核 {ms(local,'python_mask_kernel'):.3f} ms，Rust 内核 {ms(local,'rust_kernel'):.3f} ms，约 {local['matched_mask_kernel_speedup']:.2f}×。整体加速同时包含数据表示与执行实现的变化，不能全部归因于 Rust 语言。"
    scope = "本原型只处理固定、有限的 binary64 实数/复数系数，最多 64 个可映射 wire，返回 PauliSentence；不做近似截断，只移除精确零项。拒绝自动微分量、广播数组、非有限系数、超出支持精度的系数和结果溢出。它是一个算符代数子任务，不是 PennyLane 整体、完整 VQE/ADAPT 或量子模拟器的性能测试。"
    correctness = f"独立 Kronecker 矩阵穷举覆盖 1–3 位全部 {validation['exhaustive_word_pairs']:,} 对 Pauli 单项，结果精确一致。40 组随机复系数算符和同时比较全部 Pauli 系数与独立矩阵，最大矩阵绝对误差 {validation['worst_independent_matrix_error']:.3g}。另外覆盖相消、极小非零系数、混合 wire 标签、实际 64-wire 往返、65-wire 拒绝和非有限结果拒绝；共 {len(validation['checks'])} 条验证记录。9 个计时场景中的四种对照实现也逐项核对，全部通过。"
    method = "固定 plan.json 中的输入类型、规模与 seed；同进程、每方法预热 2 次，9 轮打乱方法次序，报告中位数、四分位区间及全部 405 条原始样本。小任务自动批量重复，最多 16,384 次/样本；较大任务通常每样本 1 次。计时使用 perf_counter_ns，计时期间关闭循环 GC。Rust 单线程，释放 GIL 不启动线程；BLAS/OpenMP 等环境上限设为 1。生成输入、核验、环境安装和编译不计入热运行耗时。未专门测量峰值内存，未做跨机器或跨平台性能验收。"
    warning = "单比特小任务的完整 Rust 调用更慢；全可交换场景返回零，因而可以很快跳过构造输出。两者均保留在全表中。全可交换场景的大倍数不能概括一般任务。代表案例是对算符和的一次对易子计算，文件 ID 中的 pool512 不表示做了 512 次独立梯度计算。"
    build_first = json.loads((OUT / "first-run/build.json").read_text())
    build_final = json.loads((OUT / "build.json").read_text())
    reproduction = """```bash
# 先由 OpenQuantum 为本任务准备 pennylane-differentiable 的原生 SDK。
# LOCATOR 是已安装 Skill 的 scripts/sdk-access.mjs 的绝对路径。
python3 reproduce.py --locator "$LOCATOR" --node "$NODE" --steps build validate benchmark export_outputs
```

`reproduce.py` 每次运行先通过已安装 Skill 的定位器检查权限与 prepared 状态，使用返回的解释器及 environment；它不会安装依赖或更改能力开关。Rust 依赖由 Cargo.lock 固定，build 步骤显式调用 cargo build --release --locked。图表可用已有 Matplotlib 环境运行 `python report.py` 再生成；绘图环境不参与科学计算。"""
    readme = f"""# OpenQuantum × PennyLane：Rust Pauli 对易子案例

实测日期：2026-10-20。工程与数值检查通过，独立审阅通过；central Acceptance Builder 未参与，本案例不宣称生成正式科学 Acceptance Report。

## 实测结论

{readme_intro}

{explanation}

![所有预定义场景的完整调用耗时与加速比](results/timings.png)

{table_header}{chr(10).join(table_rows)}

{warning}

## 研究问题与范围

计算 [H, A] = HA − AH。代表输入是各向异性 Heisenberg 链加局域 Z 场，以及随机固定实系数的二体可观测量之和。它可用于海森堡方程的算符计算步骤；本次没有积分时间演化或计算完整算法的运行时间。

{scope}

## 为什么同时测 Python 位编码

{explanation}

Pauli word 写成 P(x,z)=i^popcount(x&z) X^x Z^z。对易的项对直接跳过；反对易时使用 [P,Q]=2PQ，保留复相位与系数合并。Python 控制与 Rust 使用同样的位掩码、预计算 Y 计数、相位、筛选和累加顺序。相位指数可为负数，Rust 使用有符号余数规范化。

PennyLane 基线直接调用其优化的 `PauliSentence.commutator()`，不使用更慢的两次乘法作为基线。原型未使用 GPU、并行 Rust 或有损系数截断。输入、双向转换及输出对象构造均计入主要完整调用指标；预编码内核时间仅作分解。

## 核验与测量方法

{correctness}

{method}

首次本地 release 构建 {build_first['build_seconds']:.2f} s（Rust crates 已缓存），复核后增量构建 {build_final['build_seconds']:.2f} s。它们与 SDK 准备均不包含在热运行时间中。

## OpenQuantum 实际路径与复跑

本案例读取已安装 OpenQuantum 0.8.4 的 `pennylane-differentiable` Skill。已安装 MCP 服务的实际 tools/list 返回发现与准备入口；通过 MCP 协议依次执行 find_openquantum_skills、prepare_openquantum_skill，并查询至 ready。随后由 Skill 的 SDK 定位器返回固定 PennyLane 0.45.1 环境，宿主代码工具执行本目录的 Rust 构建、Python 验证和计时。未修改插件代码、能力开关、共享 SDK 的包版本或模型路由。

本聊天的可见工具清单没有发现/准备入口，因此准备回执来自对同一已安装 MCP 服务的直接协议调用；本次不把它称为原生侧边页点击、原生 Tool 菜单或新用户安装体验验收。该案例展示了完成研究软件实验的一条路径，没有做“有/无 OpenQuantum”的科研生产率对照。

{reproduction}

## 文件与证据

- [完整网页报告](results/report.html)、[SVG 图表](results/timings.svg)。
- [逐场景计时及样本](results/benchmark.json)、[全部原始计时](results/raw-timings.csv)。
- [固定输入](results/inputs.json)、[完整参考输出](results/reference-outputs.npz)、[完整 Rust 输出](results/rust-outputs.npz)、[输出重读核验](results/output-replay.json)、[核验记录](results/validation.json)。
- [OpenQuantum 准备回执](results/openquantum-preparation.json)、[SDK 定位结果](results/openquantum-sdk.json)、[源码与扩展摘要](results/provenance.json)。
- [独立审阅记录](results/review.md)、[首轮保留数据及修订原因](results/first-run/NOTE.md)。

原始随机生成器、Rust 与 Python 源码、Cargo.lock、预定义输入计划均在本目录。计时只针对已列出的本机输入，未比较全部第三方高性能 Pauli 库，不宣称最快实现。

## 来源与许可

- [PennyLane PauliSentence](https://docs.pennylane.ai/en/stable/code/api/pennylane.pauli.PauliSentence.html)：接口、基线与算符表示。
- [PennyLane 官方实现](https://docs.pennylane.ai/en/stable/_modules/pennylane/pauli/pauli_arithmetic.html)：优化对易子路径，实际测量使用 OpenQuantum 固定发行版。
- [PyO3 构建文档](https://pyo3.rs/v0.29.0/building-and-distribution.html)：复用 Rust/Python 扩展接口。Cargo.lock 固定 PyO3 0.29.0（MIT/Apache-2.0）。
- 自有案例代码沿用仓库 MIT 许可；PennyLane 沿用其 Apache-2.0 许可。本实验不是 PennyLane 官方项目或官方性能声明。
"""
    (ROOT / "README.md").write_text(readme)
    header_cells = ["场景", "PennyLane / ms", "位编码 Python / ms", "Rust 完整调用 / ms", "加速", "非零项"]
    html_rows = []
    for row in rows:
        cls = "special" if row["output_terms"] == 0 else "slower" if row["end_to_end_speedup"] < 1 else ""
        cells = [LABELS[row["id"]][0], f"{ms(row,'pennylane'):.6f}", f"{ms(row,'python_end_to_end'):.6f}", f"{ms(row,'rust_end_to_end'):.6f}", f"{row['end_to_end_speedup']:.2f}×", str(row["output_terms"])]
        html_rows.append('<tr class="'+cls+'">'+''.join('<td>'+html.escape(cell)+'</td>' for cell in cells)+'</tr>')
    def paragraph(text):
        return '<p>'+html.escape(text).replace('**','')+'</p>'
    page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenQuantum × PennyLane 实测</title><style>
body{margin:0;background:#f4f7fa;color:#182638;font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:1160px;margin:auto;padding:48px 28px}header{padding:30px 0}small{color:#627186}h1{font-size:36px;line-height:1.25;letter-spacing:-1px}h2{margin-top:42px;font-size:23px}.hero{font-size:42px;font-weight:700;color:#087b6c;margin:12px 0}.card{background:white;padding:26px 30px;border-radius:16px;border:1px solid #e0e7ee;margin:22px 0}img{display:block;width:100%;height:auto}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:12px 9px;text-align:right;border-bottom:1px solid #e3e9ef;font-size:14px}th:first-child,td:first-child{text-align:left}th{color:#53667b}.special{background:#f0f2f5}.slower{background:#fff4e2}.table{overflow-x:auto}a{color:#176fa5}code{background:#edf2f7;padding:2px 5px;border-radius:4px}footer{font-size:13px;color:#64748b;margin-top:45px}@media(max-width:650px){main{padding:24px 16px}h1{font-size:28px}.hero{font-size:30px}.card{padding:16px}table{min-width:900px}}
</style><main><header><small>OPENQUANTUM · 可复核计算案例 · 2026-10-20 · '''
    page += html.escape(machine)+'</small><h1>用 Rust 改进 PennyLane 的 Pauli 对易子计算</h1>'
    page += '<div class="hero">'+html.escape(headline)+'</div>'+paragraph(intro)+paragraph(explanation)+'</header>'
    page += '<section class="card"><h2>全部预定义场景</h2><img src="timings.svg" alt="PennyLane、位编码Python与Rust完整调用耗时"><div class="table"><table><thead><tr>'+''.join('<th>'+cell+'</th>' for cell in header_cells)+'</tr></thead><tbody>'+''.join(html_rows)+'</tbody></table></div>'+paragraph(warning)+'</section>'
    page += '<section class="card"><h2>结果核对</h2>'+paragraph(correctness)+'<h2>测量方法</h2>'+paragraph(method)+'</section>'
    page += '<section class="card"><h2>适用范围</h2>'+paragraph(scope)+'<h2>输入与复跑</h2><p>源码、输入计划和复跑说明见 <a href="../README.md">案例 README</a>。本次保留全部随机输入、完整非零输出数组和原始计时。</p><p><a href="benchmark.json">计时 JSON</a> · <a href="raw-timings.csv">原始 CSV</a> · <a href="validation.json">核验</a> · <a href="inputs.json">输入</a> · <a href="reference-outputs.npz">输出数组</a> · <a href="openquantum-preparation.json">OpenQuantum 回执</a> · <a href="review.md">独立审阅</a></p></section>'
    page += '<footer>工程与数值核验通过，独立审阅通过。central Acceptance Builder 未参与；本案例未发布、未部署，不代表 PennyLane 整体或完整量子算法加速。首次与最终增量构建耗时分别为 '+f'{build_first["build_seconds"]:.2f} s 和 {build_final["build_seconds"]:.2f} s。'+'</footer></main></html>'
    (OUT / "report.html").write_text(page)
    (OUT / "plotting.json").write_text(json.dumps({"matplotlib": matplotlib.__version__, "numpy": np.__version__}, indent=2)+'\n')
    print('Rendered README.md, report.html, timings.png and timings.svg from saved results.')

if __name__ == "__main__":
    main()
