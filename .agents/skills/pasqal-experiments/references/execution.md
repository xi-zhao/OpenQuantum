# 命令和数据合同

先用 SDK 定位器取得 `run.command`（Python）和 `project`（Pulser 目录）。
本辅助器路径是 `<project>/../pasqal-experiments/scripts/experiment.py`；参数以下用 `PYTHON`、`RUNNER` 示意，
实际经宿主代码 Tool 以参数数组或安全引用的绝对路径执行，不把秘密插入命令文本。

```text
PYTHON RUNNER validate-spec --spec experiment_spec.json
PYTHON RUNNER prepare --spec experiment_spec.json --sequence experiment_sequence.py --out ideal-plan.json --local-device MockDevice
PYTHON RUNNER local-run --plan ideal-plan.json --out ideal-raw.json --seed 42
PYTHON RUNNER analyze --raw ideal-raw.json --sequence experiment_sequence.py --out ideal-analysis.json
PYTHON RUNNER plot --report ideal-analysis.json --out ideal.png

PYTHON RUNNER prepare --spec experiment_spec.json --sequence experiment_sequence.py --noise-file paper-noise.json --out noise-plan.json --local-device MockDevice
PYTHON RUNNER local-run --plan noise-plan.json --out noise-raw.json
PYTHON RUNNER analyze --raw noise-raw.json --sequence experiment_sequence.py --baseline ideal-analysis.json --out noise-analysis.json
```

`MockDevice` 是明确选择的本地 stand-in，不证明任何实际 QPU 的可行性。噪声变化可能使比较“不一致”，
该差异本身就是结果。辅助 CLI 没有隐式联网、安装、credential discovery 或账户创建。

需要真实云操作时，宿主在受保护环境提供 `PASQAL_AUTH_TOKEN`，或同时提供 `PASQAL_USERNAME`、
`PASQAL_PASSWORD`。项目与 region 每次计划显式指定，不读取环境中的默认计费项目。
不读取 `~/.pasqal_credentials.json`，不从插件设置存储导出秘密，不把秘密或签名下载 URL 保存到证据。

```text
PYTHON RUNNER device --project-id PROJECT --region fr --device DEVICE --out device.json
PYTHON RUNNER prepare --spec experiment_spec.json --sequence experiment_sequence.py --device-file device.json --project-id PROJECT --target EMU_MPS --out cloud-plan.json
PYTHON RUNNER submit --plan cloud-plan.json --receipt cloud-receipt.json --approve-plan REVIEWED_SHA256
PYTHON RUNNER harvest --receipt cloud-receipt.json --out cloud-raw-001.json
PYTHON RUNNER recover --receipt cloud-receipt.json --batch-id VERIFIED_BATCH_ID
PYTHON RUNNER cancel --receipt cloud-receipt.json --confirm
```

QPU 使用 `--target QPU`；只有具体 Device、已解决的待决问题和经审阅计划可用。
准备时按所选设备检查 `max_runs` 和 Pulser QPU 序列约束；本地示例的 shots 不能直接视为云设备额度。
`--open-batch` 声明可追加批次；新计划通过 `submit --parent-receipt first-receipt.json --receipt second-receipt.json ...`
追加，最后用 `close --receipt first-receipt.json --confirm` 关闭。云响应代表请求状态，不保证取消、费用退还或科研成功。

计划与首次输出以排他方式创建，避免覆盖已执行证据。写操作收据先 `fsync` 再发请求。
`~/.openquantum/pasqal-cloud/` 保存按项目/region/request ID 散列的永久提交索引、按 batch ID 共享的锁与未决追加标记，
同一计划换路径或换收据不会重复提交。可用 `OPENQUANTUM_PASQAL_STATE_ROOT` 指定工件根目录；同一账户的
所有本机调用应沿用该目录，不能换目录绕过提交记录。索引包含恢复材料，不存秘密。
强制杀进程可留锁，先确认旧进程已停止并查询远端，
再人工移除锁恢复。开放批次的未决追加必须先恢复，才能继续追加；恢复旧收据不会纳入后来新增的 jobs。
收据丢失可用 `recover --receipt 原路径 --plan 原计划 --batch-id 已核对ID` 从索引重建。
索引持续保存最新 batch/job 映射与控制记录，旧收据副本只用于定位。追加在创建收据前先保留完整未决记录；
若仅剩该记录，同一恢复命令仍可重建。明确尚未发送的请求恢复为 `not_submitted`，不匹配后来请求的 jobs；
确需执行时重新准备新计划。`send_attempted=true` 是持久化的发送意图，进程可能在真正发送前已中断，
因此它只表示结果需核对，不能单独证明 API 收到了请求。未知结果不自动重试。
跨设备并发必须由使用者协调；本文件收据不是 Harness 执行状态的第二事实源。
不知道批次 ID 时，用 request tag 和完整分页查找；找不到也不代表可以安全重发。

计划包含完整 spec、序列、device snapshot、代码/依赖摘要、总 shots；收据包含 batch/job ID 和映射。
原始输出包含所有计划点的状态与 raw result；分析仅推导数值事实，保留 `scientificValidation=not_evaluated`。
所有结果使用严格 JSON，不写 NaN/Infinity。分析代码变更必须生成新的实验计划；不能混用旧来源摘要。

完整 SDK 路径：直接在相同 Python 环境导入 `PasqalCloudClient`、`PasqalCloudConnection`、`OVHConnection`
和所需 backend。用本版本 `help()` / `inspect.signature()` 核实方法。可以复用 `scripts/cloud.py` 的
`client(project_id, region)` 以获得单次 HTTP 策略；裸 SDK 的自动重试与认证行为遵循上游，不能据此绕过
提交审阅、收据和异常恢复。官方文档：[API](https://pasqal-io.github.io/pasqal-cloud/api/overview/)、
[认证](https://pasqal-io.github.io/pasqal-cloud/advanced/authentication/)。
