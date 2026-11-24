# QEC memory L2 验证证据

本目录记录开发证据，不是科学 Acceptance Report。`capability.yaml` 固定结果 schema、独立 Validator、
eval suite 及证据摘要；`acceptanceProfiles` / `reproductionProfiles` 为空，未接 Materializer 或 central
Acceptance Builder。成熟度为 L2，不表示阈值、硬件表现或科研验收通过。

## 独立检查

`validators/validate-result.mjs` 从逐 shot 的 packed failure bits 独立计数，并复算点估计、标准误和
Wilson score 95% 区间。沿用原 Tool 的 `z=1.959963984540054` 与 `1e-15` 数值比较容差，没有放宽门槛。
Validator 使用另一代数形式：中心为 `(k + z²/2)/(n + z²)`，半宽为
`z sqrt(k(n-k)/n + z²/4)/(n + z²)`；0 / n 次失败的区间端点分别固定为 0 / 1。

`validators/replay.py` 只读取原始请求，在新进程中独立生成 Stim 电路、DEM、单批样本并用 PyMatching
解码，不导入 Tool 的 `bridge.py`，不采用其输出或自报检查结果。对照实际电路/DEM 文本摘要、规模、
detector/observable/prediction 样本摘要与逐 shot 失败记录，复核 basis、distance、rounds、四类均匀噪声和
seed。两个过程使用同一固定科学库；这是适配与统计复核，不是 Stim/PyMatching 算法正确性的独立证明。

精确 seed 重放仅限相同机器、包版本、Stim 实现及单批调用方式；Stim 不承诺跨版本、CPU SIMD 能力或
不同分批调用仍得到相同样本。参见 [Stim 官方 sampler seed 说明](https://github.com/quantumlib/Stim/wiki/Stim-v1.13-Python-API-Reference)
及当前固定版本的 `stim.Circuit.compile_detector_sampler.__doc__`。没有独立参考运行时，电路/DEM
参数与 seed 检查均为 `not_checked`；包版本或机器实现不兼容时，精确 seed 检查也为 `not_checked`。

## 固定案例与统计边界

`fixtures/*.json` 保存 2026-11-25 在 macOS arm64、Stim 1.16.0 (`stim._stim_polyfill`) / PyMatching 2.4.0
下分别运行 Tool 和参考进程取得的记录。每份包含原始 request、Tool facts 与独立 reference；fixture
SHA-256 绑定到 `cases.json`，每个 case 的摘要绑定到 suite，suite 摘要绑定到 manifest。

| 固定案例 | 参数 | 记录结果 |
| --- | --- | --- |
| zero-noise | Z memory，d=3，rounds=3，shots=1000，p=0，seed=1234 | 0 次失败，Wilson 上界 0.0038267584855551234 |
| noisy | X memory，d=3，rounds=3，shots=1000，p=0.01，seed=1234 | 74 次失败，点估计 0.074，Wilson 区间 [0.05935499258410698, 0.09190540564558597] |

19 个固定 eval 包含上述正例、计数/区间/方法/电路/DEM/seed 篡改、非法 shots/码距，以及单 shot 的
0 次失败、全部失败和非零 padding。单 shot 案例为**合成统计单元案例**：不声称来自所记录电路的新采样，
其独立模型与 seed 检查保留 `not_checked`。0/1 次失败时 Wilson 上界约 0.79345069；1/1 时下界约
0.20654931，收缩为 [0,0] / [1,1] 会失败。无噪声并不允许报告零区间宽度。

`test/mcp.test.mjs` 使用固定记录作协议夹具，并运行上述 Validator 案例、非法输入、缺少环境与合同
边界测试；不能把这组离线测试当作本轮执行了 Stim。`test/live.test.mjs` 则执行真实本地科学库，包含
同 seed 新进程重放、替换码距/轮数/basis/噪声的完整一致结果、逐一遗漏四类噪声、伪造 seed、极小 shots
与指数记法概率。替换案例重新生成正确哈希，仍必须被独立参考检出。

## 重跑

```sh
node .agents/skills/qec-memory-experiment/evals/run-evals.mjs
npm run capability:qec-memory-experiment:test
node scripts/setup-paper-tools.mjs qec-memory-experiment
OPENQUANTUM_REAL_QEC_MEMORY=1 npm run capability:qec-memory-experiment:test
```

环境位置沿用 `OPENQUANTUM_PYTHON_ENV_ROOT`；安装使用已有 `uv.lock`。准备与测试仅需本地 Stim/PyMatching，
不调用模型、量子云或硬件。未准备时只能执行离线 eval；实时 circuit/DEM 与 seed 复核必须等准备后执行。

将 Tool 的 `structuredContent.facts` 保存为 `result.json` 后，可运行：

```sh
node .agents/skills/qec-memory-experiment/validators/validate-result.mjs result.json
node .agents/skills/qec-memory-experiment/validators/validate-result.mjs result.json --replay
```

默认仅复核文件中可重算的统计与哈希；`--replay` 才调用准备好的独立参考。检查失败退出 1，参考环境
不可用退出 2；两种模式都只输出 observations。当前本地验证摘要见 `evidence-2026-11-25.json`。
