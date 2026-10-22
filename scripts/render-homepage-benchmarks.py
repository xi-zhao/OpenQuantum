"""Render product comparisons from frozen measured data; no new computation."""
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site/assets"
plt.rcParams.update({"svg.fonttype": "none", "svg.hashsalt": "openquantum-benchmarks",
                     "font.size": 11, "axes.spines.top": False, "axes.spines.right": False})


def source_record(path):
    return {"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def save(figure, name):
    figure.savefig(OUT / name, metadata={"Date": None})
    plt.close(figure)


def timings(library, baseline, optimized, name, figsize):
    source = ROOT / "experiments" / library / "results/benchmark.json"
    rows = json.loads(source.read_text())["cases"]
    series = []
    figure, ax = plt.subplots(figsize=figsize)
    positions = np.arange(len(rows))
    for offset, key, label, color in [(-0.18, baseline, "Original library", "#7f8b9c"),
                                       (0.18, optimized, "OpenQuantum", "#244f70")]:
        values = {field: [row["timings"][key][field + "_seconds"] * 1000 for row in rows]
                  for field in ("median", "q25", "q75")}
        medians, lows, highs = [np.array(values[field]) for field in ("median", "q25", "q75")]
        ax.barh(positions + offset, medians, height=0.32, color=color, label=label,
                xerr=np.array([medians - lows, highs - medians]),
                error_kw={"capsize": 3, "elinewidth": 1})
        series.append({"label": label, **{field + "_ms": value for field, value in values.items()}})
    labels = ([f'N={row["dimension"]}, {row["nx"]} x {row["ny"]} grid' for row in rows]
              if baseline == "qutip_clenshaw" else [row["id"] for row in rows])
    title = "QuTiP Wigner" if baseline == "qutip_clenshaw" else "PennyLane Pauli commutator"
    ax.set(yticks=positions, yticklabels=labels, xlabel="Complete call (ms), logarithmic scale", xscale="log")
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.15)
    ax.set_axisbelow(True)
    ax.legend(frameon=False)
    ax.set_title(title + " | targeted optimization", loc="left", pad=18)
    figure.text(0.015, 0.015, "Apple M4 | 9 warm rounds | medians and IQR | input and output conversion included", fontsize=9)
    figure.tight_layout(rect=[0, 0.06, 1, 1])
    save(figure, name)
    return {"asset": name, "inputs": [source_record(source)], "cases": [row["id"] for row in rows], "series": series}


def wigner():
    source = ROOT / "experiments/qutip-rust-wigner/results/representative-inputs-outputs.npz"
    with np.load(source) as data:
        original, optimized = data["qutip_clenshaw"], data["rust_clenshaw"]
        error = np.abs(original - optimized)
        extent = [data["x"][0], data["x"][-1], data["y"][0], data["y"][-1]]
    figure, axes = plt.subplots(1, 3, figsize=(12, 3.8), layout="constrained")
    limit = max(abs(original).max(), abs(optimized).max())
    for ax, array, title in zip(axes[:2], [original, optimized], ["QuTiP default", "OpenQuantum"]):
        image = ax.imshow(array, origin="lower", extent=extent, cmap="RdBu_r", vmin=-limit, vmax=limit)
        ax.set(title=title, xlabel="x", ylabel="y")
    figure.colorbar(image, ax=axes[:2], label="W(x, y)", shrink=0.8)
    image = axes[2].imshow(error, origin="lower", extent=extent, cmap="magma", vmin=0)
    axes[2].set(title=f"Absolute difference\nmax {error.max():.2e}", xlabel="x", ylabel="y")
    figure.colorbar(image, ax=axes[2], shrink=0.8)
    figure.suptitle("N=64, complete 201 x 201 phase-space grid")
    name = "wigner-comparison.svg"
    save(figure, name)
    return {"asset": name, "inputs": [source_record(source)], "shape": list(original.shape),
            "max_absolute_difference": float(error.max())}


def main():
    plots = [timings("qutip-rust-wigner", "qutip_clenshaw", "rust_clenshaw", "qutip-timings.svg", (10, 5.3)),
             timings("pennylane-rust-commutator", "pennylane", "rust_end_to_end", "pennylane-timings.svg", (15.5, 6.5)),
             wigner()]
    (OUT / "benchmark-charts.json").write_text(json.dumps({"sourceCommit": "9fa53e6523dee2c81380483b1aedb19819f218ac", "plots": plots}, indent=2) + "\n")
    print("Rendered three charts from saved measurements; numerical sources unchanged.")


if __name__ == "__main__":
    main()
