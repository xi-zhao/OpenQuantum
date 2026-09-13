"""Bounded classical simulation of a Schroedingerized 1D heat equation.

Independent implementation of the warped-phase construction described in
Jin, Liu and Yu, arXiv:2407.15895v3, section 2. No UnitaryLab dependency.
This experiment does not compile quantum circuits or produce Acceptance.
"""

import argparse
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
from time import perf_counter

import numpy as np
import scipy
from scipy.linalg import expm


@dataclass(frozen=True)
class Case:
  points: int = 8
  auxiliary_points: int = 512
  length: float = 1.0
  diffusivity: float = 0.1
  time: float = 0.05
  half_width: float = 8.0
  recovery_p: float = 1.0

  def __post_init__(self):
    if type(self.points) is not int or self.points not in (4, 8, 16):
      raise ValueError("points must be 4, 8 or 16 interior Dirichlet grid points")
    if type(self.auxiliary_points) is not int or self.auxiliary_points not in (128, 256, 512, 1024):
      raise ValueError("auxiliary_points must be 128, 256, 512 or 1024")
    for key in ("length", "diffusivity", "time", "half_width", "recovery_p"):
      value = getattr(self, key)
      if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{key} must be a finite real number")
    if not (0.5 <= self.length <= 2 and 0 < self.diffusivity <= 0.2 and 0 <= self.time <= 0.2):
      raise ValueError("require length in [0.5,2], diffusivity in (0,0.2], time in [0,0.2]")
    if not (4 <= self.half_width <= 16 and 0 < self.recovery_p < self.half_width):
      raise ValueError("require half_width in [4,16] and recovery_p in (0,half_width)")
    dp = 2 * self.half_width / self.auxiliary_points
    index = (self.recovery_p + self.half_width) / dp
    if not np.isclose(index, round(index), rtol=0, atol=1e-10):
      raise ValueError("recovery_p must coincide with an auxiliary grid point")
    dx = self.length / (self.points + 1)
    max_rate = 4 * self.diffusivity / dx**2 * math.cos(math.pi / (2 * (self.points + 1)))**2
    if self.recovery_p + max_rate * self.time + dp >= self.half_width:
      raise ValueError("auxiliary domain is too small: characteristic would wrap at the recovery point")


def heat_problem(case):
  n = case.points
  dx = case.length / (n + 1)
  x = np.arange(1, n + 1) * dx
  coefficient = case.diffusivity / dx**2
  matrix = coefficient * (np.diag(np.full(n, -2.0)) + np.diag(np.ones(n-1), 1) + np.diag(np.ones(n-1), -1))
  initial = np.sin(np.pi * x / case.length) + 0.25 * np.sin(3 * np.pi * x / case.length)
  analytic = np.zeros(n)
  discrete_modes = np.zeros(n)
  for mode, amplitude in ((1, 1.0), (3, 0.25)):
    profile = amplitude * np.sin(mode * np.pi * x / case.length)
    analytic += profile * np.exp(-case.diffusivity * (mode * np.pi / case.length)**2 * case.time)
    eigenvalue = -4 * coefficient * np.sin(mode * np.pi / (2 * (n + 1)))**2
    discrete_modes += profile * np.exp(eigenvalue * case.time)
  return matrix, x, initial, analytic, discrete_modes


def relative_error(actual, expected):
  return float(np.linalg.norm(actual - expected) / np.linalg.norm(expected))


def rotate_pairs(state, offset, angle):
  """Apply exp(-i * angle * X) to disjoint spatial neighbor pairs."""
  left = np.arange(offset, state.shape[0] - 1, 2)
  first, second = state[left].copy(), state[left + 1].copy()
  cosine, sine = np.cos(angle), -1j * np.sin(angle)
  state[left] = cosine * first + sine * second
  state[left + 1] = sine * first + cosine * second


def simulate(case, method="spectral", steps=128):
  if method not in ("spectral", "strang"):
    raise ValueError("method must be spectral or strang; no fallback solver")
  if type(steps) is not int or not 1 <= steps <= 4096:
    raise ValueError("steps must be an integer in [1,4096]")
  matrix, x, initial, analytic, discrete_modes = heat_problem(case)
  dp = 2 * case.half_width / case.auxiliary_points
  p = -case.half_width + np.arange(case.auxiliary_points) * dp
  frequencies = 2 * np.pi * np.fft.fftfreq(case.auxiliary_points, d=dp)
  warped = np.outer(initial, np.exp(-np.abs(p)))
  initial_norm = float(np.linalg.norm(warped))
  initial_state = warped / initial_norm
  fourier = np.fft.fft(initial_state, axis=1, norm="ortho")
  started = perf_counter()
  if method == "spectral":
    eigenvalues, eigenvectors = np.linalg.eigh(matrix)
    coefficients = eigenvectors.T @ fourier
    evolved = eigenvectors @ (coefficients * np.exp(-1j * eigenvalues[:, None] * frequencies * case.time))
  else:
    evolved = fourier.copy()
    coefficient = case.diffusivity / (case.length / (case.points + 1))**2
    dt = case.time / steps
    for _ in range(steps):
      rotate_pairs(evolved, 0, coefficient * frequencies * dt / 2)
      rotate_pairs(evolved, 1, coefficient * frequencies * dt)
      rotate_pairs(evolved, 0, coefficient * frequencies * dt / 2)
    # The diagonal term is a multiple of I and commutes with both edge terms.
    evolved *= np.exp(2j * coefficient * frequencies * case.time)
  state = np.fft.ifft(evolved, axis=1, norm="ortho")
  elapsed = perf_counter() - started
  index = round((case.recovery_p + case.half_width) / dp)
  solution = initial_norm * np.exp(case.recovery_p) * state[:, index]
  started = perf_counter()
  discrete = expm(case.time * matrix) @ initial
  classical_elapsed = perf_counter() - started
  result = {
    "parameters": asdict(case),
    "method": method,
    "steps": steps if method == "strang" else None,
    "executionKind": "classical_simulation_of_unitary_dilation",
    "quantumCircuitCompiled": False,
    "qpuExecuted": False,
    "scientificAcceptance": "not_evaluated",
    "metrics": {
      "relativeL2VsDiscreteHeat": relative_error(solution, discrete),
      "relativeL2VsContinuumHeat": relative_error(solution, analytic),
      "spatialDiscretizationRelativeL2": relative_error(discrete, analytic),
      "discreteReferenceVsSineModes": relative_error(discrete, discrete_modes),
      "unitaryNormDrift": abs(float(np.linalg.norm(state)) - 1),
      "imaginarySolutionRelativeNorm": float(np.linalg.norm(solution.imag) / np.linalg.norm(discrete)),
      "auxiliarySliceProbability": float(np.sum(np.abs(state[:, index])**2)),
    },
    "resources": {
      "statevectorAmplitudes": int(state.size),
      "singleStatevectorBytesComplex128": int(state.nbytes),
      "logicalRegisterQubits": int(math.log2(case.points) + math.log2(case.auxiliary_points)),
      "initialWarpedNorm": initial_norm,
      "amplitudeRecoveryFactor": initial_norm * math.exp(case.recovery_p),
      "evolutionSeconds": elapsed,
      "classicalExpmSeconds": classical_elapsed,
      "readout": "full complex amplitudes inspected in classical memory; no shot-based reconstruction",
      "costScope": "register and single-state storage only; excludes workspace copies, state preparation, gate synthesis, error correction and readout cost",
    },
    "grid": [0.0, *x.tolist(), case.length],
    "solutionReal": [0.0, *solution.real.tolist(), 0.0],
    "solutionImaginary": [0.0, *solution.imag.tolist(), 0.0],
    "continuumReference": [0.0, *analytic.tolist(), 0.0],
    "discreteReference": [0.0, *discrete.tolist(), 0.0],
  }
  return result, state


def run_study():
  spatial = [simulate(Case(points=n))[0] for n in (4, 8, 16)]
  auxiliary = [simulate(Case(auxiliary_points=n))[0] for n in (128, 256, 512, 1024)]
  exact_result, exact_state = simulate(Case())
  trotter = []
  for steps in (16, 32, 64, 128, 256, 512):
    result, state = simulate(Case(), "strang", steps)
    result["metrics"]["relativeStateErrorVsSpectralDilation"] = relative_error(state, exact_state)
    result["metrics"]["relativeSolutionErrorVsSpectralDilation"] = relative_error(
      np.array(result["solutionReal"]) + 1j * np.array(result["solutionImaginary"]),
      np.array(exact_result["solutionReal"]) + 1j * np.array(exact_result["solutionImaginary"]),
    )
    trotter.append(result)
  return {
    "schemaVersion": 1,
    "verifiedAt": datetime.now(timezone.utc).isoformat(),
    "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "dependencies": {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__},
    "paper": "https://arxiv.org/html/2407.15895v3#S2",
    "scope": "dimensionless homogeneous 1D heat; zero Dirichlet boundaries; initial sin(pi*x/L)+0.25*sin(3*pi*x/L)",
    "scientificAcceptance": "not_evaluated",
    "quantumSpeedupEvidence": False,
    "spatialStudy": spatial,
    "auxiliaryStudy": auxiliary,
    "strangStudy": trotter,
  }


def write_report(study, directory):
  directory.mkdir(parents=True, exist_ok=True)
  (directory / "results.json").write_text(json.dumps(study, indent=2, allow_nan=False) + "\n")
  lines = [
    "# 一维热方程：薛定谔化独立数值实验", "",
    "这是采用 NumPy/SciPy 的经典仿真原型，尚未编译量子电路或接入用户运行链，也没有量子加速或最终科学验收结论。", "",
    f"运行时间：{study['verifiedAt']}。依赖：`{json.dumps(study['dependencies'])}`。", "",
    "固定问题：无量纲区间 [0,1]，扩散系数 0.1，T=0.05，零 Dirichlet 边界；初态为 sin(πx)+0.25sin(3πx)。", "",
    "空间误差相对于连续解析解；辅助网格与 Strang 误差另对照离散热方程和有限维幺正演化，避免混合误差来源。", "",
    "## 空间网格（辅助网格固定为 512 点）", "",
    "| 内点数 | 薛定谔化/离散热解相对 L2 | 空间离散相对 L2 |", "| --- | --- | --- |",
  ]
  for row in study["spatialStudy"]:
    metrics = row["metrics"]
    lines.append(f"| {row['parameters']['points']} | {metrics['relativeL2VsDiscreteHeat']:.3e} | {metrics['spatialDiscretizationRelativeL2']:.3e} |")
  lines += ["", "## 辅助网格（空间固定为 8 个内点）", "", "| 辅助点数 | 薛定谔化/离散热解相对 L2 | 单个态矢存储 | p=1 切片概率 |", "| --- | --- | --- | --- |"]
  for row in study["auxiliaryStudy"]:
    metrics, resources = row["metrics"], row["resources"]
    lines.append(f"| {row['parameters']['auxiliary_points']} | {metrics['relativeL2VsDiscreteHeat']:.3e} | {resources['singleStatevectorBytesComplex128']//1024} KiB | {metrics['auxiliarySliceProbability']:.3e} |")
  lines += ["", "## 二阶 Strang 时间分裂（8×512 维状态）", "", "| 步数 | 相对有限维精确幺正态的误差 | 恢复解/离散热解相对 L2 |", "| --- | --- | --- |"]
  for row in study["strangStudy"]:
    metrics = row["metrics"]
    lines.append(f"| {row['steps']} | {metrics['relativeStateErrorVsSpectralDilation']:.3e} | {metrics['relativeL2VsDiscreteHeat']:.3e} |")
  lines += [
    "", "## 实现成本与下一步", "",
    "原型只依赖现有开源数值库。频谱法用辅助 FFT 和空间本征分解计算有限维幺正演化；Strang 法把空间相邻耦合分成偶边/奇边的二阶乘积。", "",
    "默认状态为 8×512=4096 个复振幅，对应 12 个逻辑寄存器量子位，单个 complex128 态矢 64 KiB；这些数字不包括额外工作数组、状态制备、门综合、纠错或读出成本。", "",
    "当前通过经典内存读取完整复振幅恢复热解。单切片概率随辅助网格加密下降；不能把寄存器规模或本地耗时当成量子计算资源优势。", "",
    "下一项有实质价值的工作是使用开源电路后端构造并复核受控偶边/奇边演化，同时估算状态制备及读出开销；随后再决定是否形成产品计算 Tool。非齐次源项、其他边界、二维问题均不属于本原型。", "",
    "[完整数据](results.json) · [对照图](comparison.svg) · [公开方法来源](https://arxiv.org/html/2407.15895v3#S2)", "",
  ]
  (directory / "report.md").write_text("\n".join(lines))
  import matplotlib
  matplotlib.use("Agg")
  import matplotlib.pyplot as plt
  fig, axes = plt.subplots(1, 3, figsize=(13, 3.8), layout="constrained")
  row = study["spatialStudy"][1]
  axes[0].plot(row["grid"], row["continuumReference"], label="Continuum heat", linewidth=2)
  axes[0].plot(row["grid"], row["discreteReference"], "--", label="Discrete heat")
  axes[0].plot(row["grid"], row["solutionReal"], "o", ms=4, label="Schrodingerized (real part)")
  axes[0].set(xlabel="x", ylabel="u(x, T)", title="Heat solution, T=0.05")
  axes[0].legend(fontsize=8)
  rows = study["auxiliaryStudy"]
  axes[1].loglog([r["parameters"]["auxiliary_points"] for r in rows], [r["metrics"]["relativeL2VsDiscreteHeat"] for r in rows], "o-")
  axes[1].set(xlabel="Auxiliary grid points", ylabel="Relative L2 error", title="Auxiliary discretization")
  rows = study["strangStudy"]
  axes[2].loglog([r["steps"] for r in rows], [r["metrics"]["relativeStateErrorVsSpectralDilation"] for r in rows], "o-")
  axes[2].set(xlabel="Strang steps", ylabel="Relative state error", title="Time-splitting convergence")
  for ax in axes:
    ax.grid(alpha=0.2)
  fig.savefig(directory / "comparison.svg")
  fig.savefig(directory / "comparison.png", dpi=180)
  plt.close(fig)


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--output", type=Path, required=True, help="Directory for the numerical evidence and plots")
  args = parser.parse_args()
  write_report(run_study(), args.output)
  print(f"Numerical evidence written to {args.output.resolve() / 'report.md'}")
