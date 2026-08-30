# QMClaw 实验目录

此目录把 QMClaw 上游 commit `18d7fa1594949a1203fca4866e651641bbde021f` 的实验名称规范化为
OpenQuantum 的 SI 单位合同。它描述当前本地模拟能力，不是 LabRAD/lqms 仪器说明书。

| OpenQuantum experiment | QMClaw 上游 Tool | 用途 | 主要输出 |
| --- | --- | --- | --- |
| `s21` | `s21` | 读取谐振腔响应并定位共振 | frequency、amplitude、phase |
| `spectroscopy` | `spectrum` | 扫描比特能谱 | frequency、response |
| `spectroscopy-2d` | `spectrum_2d` | 比较频率与偏置二维响应 | frequency、bias (V)、response matrix |
| `rabi` | `rabi` | 标定驱动幅度与布居振荡 | drive amplitude、population |
| `ramsey` | `ramsey` | 模拟失谐振荡和 T2* 包络 | delay、population |
| `t1` | `t1` | 模拟能量弛豫 | delay、population |
| `s21-vs-flux` | `s21vsflux` | 扫描磁通偏置下的读出共振 | flux bias、frequency、response matrix |
| `single-shot` | `singleshot` | 生成基态/激发态 IQ 簇 | shot、I/Q samples、centroid separation |
| `drag` | `drag` | 比较 DRAG 系数与泄漏代理量 | DRAG coefficient、leakage proxy |
| `pi-pulse-optimization` | `opt_pipulse` | 搜索 π 脉冲幅度 | drive amplitude、pulse error proxy |
| `power-shift` | `powershift` | 比较驱动功率引起的共振偏移 | power (W)、frequency、response matrix |
| `delta` | `delta` | 扫描频率偏移及重复脉冲对比 | detuning、contrast series |
| `randomized-benchmarking` | `rb` | 生成参考 RB 衰减曲线 | Clifford cycles、survival probability |

## 参数与资源约束

- 量子比特：每次恰好 1 个，名称只接受短标识符；多比特任务拆成独立调用；
- 一维 points：16–256；二维副轴 points：8–64；
- shots：16–4096；
- seed：0–2147483647；
- 频率：显式 Hz；延迟：显式 s；功率：显式 W；
- `noiseFraction` 只控制合成噪声，不代表真实设备噪声模型；
- Tool 会拒绝未知参数、非有限数值、反向区间和与实验无关的参数。

具体默认值以 `list_qmclaw_experiments` 的运行时结果为准；本文件只说明语义，不复制第二份数值权威。

## 调校依赖

```text
s21
  └─ spectroscopy
      └─ rabi / pi-pulse-optimization
          ├─ ramsey
          ├─ t1
          ├─ single-shot
          ├─ drag / delta / power-shift
          └─ randomized-benchmarking
```

真实实验中每一步还依赖设备状态、温度、脉冲链路、前一步 Dataset 与实验室 Acceptance Profile；当前模拟
不会伪造这些来源链。
