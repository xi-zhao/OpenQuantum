"""Render saved measurements and full Wigner grids, without rerunning computation."""
import html
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results"
LABELS = {"qutip_clenshaw": "QuTiP default Clenshaw", "qutip_iterative": "QuTiP iterative",
          "qutip_laguerre": "QuTiP Laguerre", "rust_clenshaw": "Rust Clenshaw port"}


def main():
    benchmark = json.loads((OUT / "benchmark.json").read_text())
    validation = json.loads((OUT / "validation.json").read_text())
    machine = benchmark.get("cpu") or benchmark.get("platform") or "Hardware not recorded"
    cases = benchmark["cases"]
    representative = next(row for row in cases if row["id"] == "representative")
    nchecks = len(validation["checks"])
    max_default = max(row.get("rust_vs_qutip_max_error", 0) for row in validation["checks"])
    max_independent = max(max(row.get(key, 0) for key in ["rust_vs_independent_max_error", "independent_max_error", "analytic_max_error"]) for row in validation["checks"])
    baseline = representative["timings"]["qutip_clenshaw"]["median_seconds"]*1000
    rust = representative["timings"]["rust_clenshaw"]["median_seconds"]*1000
    speedup = baseline/rust
    positions = np.arange(len(cases))
    figure, ax = plt.subplots(figsize=(10, 5.3))
    for offset, method, color in [(-0.18, "qutip_clenshaw", "#7f8b9c"), (0.18, "rust_clenshaw", "#168d79")]:
        medians = np.array([row["timings"][method]["median_seconds"]*1000 for row in cases])
        lows = np.array([row["timings"][method]["q25_seconds"]*1000 for row in cases])
        highs = np.array([row["timings"][method]["q75_seconds"]*1000 for row in cases])
        ax.barh(positions+offset, medians, height=0.32, color=color, label=LABELS[method],
                xerr=np.array([medians-lows, highs-medians]), error_kw={"capsize": 3, "elinewidth": 1})
    ax.set(yticks=positions, yticklabels=[f'N={r["dimension"]}, {r["nx"]} x {r["ny"]} grid' for r in cases],
           xlabel="Median complete call (ms), logarithmic scale", xscale="log")
    ax.invert_yaxis()
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="x", alpha=0.15)
    ax.set_axisbelow(True)
    ax.legend(frameon=False)
    ax.set_title("OpenQuantum: a Rust port of QuTiP's Wigner calculation", loc="left", pad=18)
    figure.text(0.015, 0.015, f"{machine} | 9 interleaved warm rounds | medians and IQR | complete float64 outputs", fontsize=9)
    figure.tight_layout(rect=[0, 0.06, 1, 1])
    for extension in ["png", "svg"]:
        figure.savefig(OUT / ("timings."+extension), dpi=170)
    plt.close(figure)
    with np.load(OUT / "representative-inputs-outputs.npz") as data:
        first, second = data["qutip_clenshaw"], data["rust_clenshaw"]
        error = np.abs(first-second)
        extent = [data["x"][0], data["x"][-1], data["y"][0], data["y"][-1]]
    figure, axes = plt.subplots(1, 3, figsize=(12, 3.8), layout="constrained")
    limit = max(abs(first).max(), abs(second).max())
    for ax, array, title in zip(axes[:2], [first, second], ["QuTiP default", "Rust port"]):
        im = ax.imshow(array, origin="lower", extent=extent, cmap="RdBu_r", vmin=-limit, vmax=limit)
        ax.set(title=title, xlabel="x", ylabel="y")
    figure.colorbar(im, ax=axes[:2], label="W(x, y)", shrink=0.8)
    im = axes[2].imshow(error, origin="lower", extent=extent, cmap="magma", vmin=0)
    axes[2].set(title=f"Absolute difference (max {error.max():.2e})", xlabel="x", ylabel="y")
    figure.colorbar(im, ax=axes[2], shrink=0.8)
    figure.suptitle(f'N={representative["dimension"]}, complete {representative["nx"]} x {representative["ny"]} phase-space grid')
    figure.savefig(OUT / "wigner-comparison.png", dpi=170)
    plt.close(figure)
    svg = OUT / "timings.svg"
    svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines())+"\n")
    body = f'''# 用 OpenQuantum 将 QuTiP Wigner 计算移植到 Rust

这次新增了实际的 Rust 计算内核：以 QuTiP 5.3.1 默认 Wigner 算法为对照，保留 Clenshaw 递推、相同输入和完整双精度二维输出，交付可运行代码、实测数据与独立结果核对。

## 代表任务结果

在 {html.escape(machine)} 上，对 **{representative["dimension"]} 维单模 Fock 空间密度矩阵、{representative["nx"]}×{representative["ny"]} 相空间网格**计算完整 Wigner 函数：

| 实现 | 完整调用耗时 |
| --- | ---: |
| QuTiP 默认 Clenshaw | {baseline:.3f} ms |
| Rust 移植版 | **{rust:.3f} ms** |

**完整调用提速 {speedup:.2f} 倍。** 数据为单线程设定下 2 次预热、9 轮交错执行的中位数。包含 Qobj 输入读取、检查、编码、递推准备、Rust 调用与完整可写 NumPy 输出；环境准备、编译、输入生成和结果核验不计入热运行耗时。没有预先编码输入、预存递推状态、缩小网格、降精度或裁剪负值。

![完整调用耗时与四分位区间](results/timings.png)

## 全部预定规模

| 输入 | Fock 维数 | 网格 | QuTiP / ms | Rust / ms | 提速 |
| --- | ---: | --- | ---: | ---: | ---: |
'''
    for row in cases:
        a, b = [row["timings"][method]["median_seconds"]*1000 for method in ["qutip_clenshaw", "rust_clenshaw"]]
        body += f'| {row["id"]} | {row["dimension"]} | {row["nx"]}×{row["ny"]} | {a:.4f} | {b:.4f} | {a/b:.2f}× |\n'
    body += f'''
全部 {benchmark["raw_samples"]} 条原始计时、四个规模的完整输入输出和逐轮输出摘要均保留。每轮计时结束后，对该轮返回的完整数组进行核对与哈希；核验在计时区间之外。

## 结果怎样核对

- 主核验共有 **{nchecks} 项通过**，包括完整网格、Hermitian 矩阵基、30 个随机复密度矩阵、真空、Fock 态与带正负虚相干的解析叠加态。Fock 态最高核对到 40 光子。
- Rust 与四个规模 QuTiP 默认完整输出的最大绝对差为 **{max_default:.3g}**；与独立 Laguerre 多项式求和及解析公式的最大绝对差为 **{max_independent:.3g}**。容差固定为 atol=rtol=1e-12。
- 核对非方形网格、不同 g、ket/bra/CSR 输入、可写 float64 输出与负 Wigner 值；明确拒绝不支持的 offset、多模 dims、非 Hermitian、非有限或溢出输入，以及 NumPy 复数缩放参数。
- 三个 Rust 单元测试核对解析态与标量/分块递推。独立审阅直接检查计算源码和保存证据；见[审阅记录](results/review.md)。这不是平台正式科学 Acceptance Report。

![原版与Rust完整相空间输出及逐点误差](results/wigner-comparison.png)

## 其他现有方法的对照

同时测量 QuTiP 的 iterative 与 Laguerre 方法，输入和完整输出相同。代表任务：

| 方法 | 中位数 / ms | 对独立公式的最大差 | 满足固定容差 |
| --- | ---: | ---: | --- |
'''
    for name in LABELS:
        observation = next(r for r in validation["method_observations"] if r["case"] == "representative" and r["method"] == name)
        body += f'| {LABELS[name]} | {representative["timings"][name]["median_seconds"]*1000:.3f} | {observation["independent_max_error"]:.3g} | {"是" if observation["accuracy_passed"] else "否"} |\n'
    body += f'''
代表输入中，满足固定容差的最快 QuTiP 对照是 **{LABELS[representative["fastest_accurate_qutip"]]}**，相对它的 Rust 提速为 **{representative["speedup_vs_fastest_accurate_qutip"]:.2f}×**。iterative 在 medium 与 representative 输入上的数值差异原样保留，不放宽 Rust 容差，也不将其当成同精度的可用对照。FFT 方法返回不同坐标网格，不纳入本次相同网格比较。

## OpenQuantum 如何完成这个案例

1. 在 Codex 中按研究任务选用已安装 OpenQuantum 0.8.4 的 quantum-sdk-workbench Skill，实际调用发现与准备接口，准备 fatqat-workbench 的固定 QuTiP 环境。
2. 使用返回的解释器和环境读取 QuTiP API、编写 Rust 移植与 Python 适配器。在用户工作区用已锁定 PyO3 构建，不修改共享 SDK 或上游 QuTiP。
3. 使用同一个 Qobj 和坐标分别调用原版与 Rust，保存完整计算结果、原始计时、源码摘要与核验记录，安排独立科学审阅。

这条路径使用 Codex 的 AI 编程与代码执行能力，以及 OpenQuantum 的领域 Skill 和固定 SDK；不另配模型 API，不调用云计算或 QPU。

## 复跑

先在 OpenQuantum 中准备 quantum-sdk-workbench 的 fatqat-workbench SDK，再从仓库运行：

```bash
python3 experiments/qutip-rust-wigner/reproduce.py --node "$NODE" --locator "$LOCATOR"
```

LOCATOR 指向已安装 quantum-sdk-workbench/scripts/sdk-access.mjs；NODE 为可用 Node.js。需要本机 Cargo/Rust，构建使用 Cargo.lock 与 release profile。运行器检查准备状态，使用 SDK 返回的解释器与 environment；计算阶段不安装依赖。`--phase validate --output /path/to/checks` 可只做数值核验并写到独立目录；正式复跑默认更新本案例 results。绘图由同一已准备 SDK 的 Python 执行 `make_report.py`，只读取保存数据。

## 方法与适用范围

Rust 移植 QuTiP 的 Clenshaw 递推，按短网格块计算并复用每次调用内的递推常数。使用标准 Rust/PyO3、binary64 和系统数学库，没有 fast-math、多线程或 GPU。Python 适配器保留同一单模 Fock 基、g 约定与 W[iy,ix] 坐标顺序；g=√2 对应 hbar=1。

支持 N≥2 的单模 ket/bra 或有限 Hermitian 算符、有限非空实坐标、正有限实 g、offset=0。实际计时使用正规化正半定密度矩阵。接口检查 Hermitian 性，不为任意输入做正半定性和归一化验收。多模 Wigner、非零 Fock offset、FFT、动力学与整个 QuTiP 的 Rust 重写不在本案例范围内。

编译和热运行分别记录；尚未测量冷安装、峰值内存、跨机器表现或完整动力学工作流。初始标量原型的探索数据与失败日志另存，未混入正式中位数。

## 证据与来源

- [源码和证据摘要](results/provenance.json) · [独立审阅](results/review.md) · [原始计时](results/raw-timings.csv) · [数值核验](results/validation.json)。
- [QuTiP Wigner 官方源码](https://qutip.readthedocs.io/en/stable/_modules/qutip/wigner.html) · [PyO3](https://github.com/PyO3/pyo3)。
- Rust 递推移植遵守 QuTiP BSD-3-Clause，完整许可与来源见 [LICENSE.txt](LICENSE.txt)、[NOTICE.md](NOTICE.md)；不是 QuTiP 官方发行或背书。
'''
    (ROOT / "README.md").write_text(body)
    page = f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuTiP Rust Wigner 实测</title><style>body{{font:17px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f1f6fa;color:#182637;margin:0}}main{{max-width:1080px;margin:auto;padding:36px 24px}}section{{background:white;padding:24px;border-radius:16px;margin:20px 0;border:1px solid #dce6ef}}strong{{color:#087f6c;font-size:42px}}img{{width:100%;height:auto}}a{{color:#12638b}}</style><main><small>OPENQUANTUM · {html.escape(machine)}</small><h1>把 QuTiP Wigner 计算移植到 Rust</h1><section><strong>{speedup:.2f}×</strong><p>完整调用 {baseline:.3f} → {rust:.3f} ms，{representative["dimension"]} 维密度矩阵、{representative["nx"]}×{representative["ny"]} 网格。</p><p>9 轮热运行中位数，包含输入检查、转换与完整输出。不是整个 QuTiP 的提速。</p></section><section><img src="timings.svg" alt="原版与Rust完整调用耗时及四分位区间"></section><section><h2>完整输出逐点核对</h2><p>{nchecks} 项主核验通过。Rust 对默认输出最大误差 {max_default:.3g}。</p><img src="wigner-comparison.png" alt="原版和Rust的完整Wigner图及绝对误差"></section><section><a href="../README.md">完整案例、其他方法对照与复跑步骤</a> · <a href="review.md">独立审阅</a> · <a href="provenance.json">证据摘要</a></section></main></html>'''
    (OUT / "report.html").write_text(page)
    (OUT / "summary.json").write_text(json.dumps({"hardware": machine, "baseline_ms": baseline, "rust_ms": rust,
        "speedup": speedup, "checks": nchecks, "max_default_error": max_default, "max_independent_error": max_independent,
        "raw_samples": benchmark["raw_samples"], "task": {k: representative[k] for k in ["dimension", "nx", "ny", "rank", "g"]}}, indent=2)+"\n")
    print(f"Rendered Rust case: {baseline:.3f} -> {rust:.3f} ms, {speedup:.3f}x.")


if __name__ == "__main__":
    main()
