# AQT、OQC 与 Quantum Inspire 接口

这三项使用固定官方 Python SDK，通过独立 MCP Server 暴露 6 个 Tool。Skill 说明方法、鉴权前提和返回边界；
连接及凭据引用在 Harness Preset 中独立配置。默认均关闭，由用户启用和配置。

| 能力 / 固定 SDK | Tool | 实际动作 |
| --- | --- | --- |
| [AQT](https://github.com/qiskit-community/qiskit-aqt-provider) / qiskit-aqt-provider 1.15.0 | `simulate_aqt_circuit` | 结构化门电路到 AQT 原生门，再由官方离线后端采样；可用示例去极化噪声 |
| 同上 | `list_aqt_devices` | 官方 Arnica 工作区和资源查询 |
| [OQC QCaaS](https://docs.oqc.app/) / oqc-qcaas-client 3.23.0 | `prepare_oqc_task` | 结构化门电路与末端测量到 OpenQASM2，再由 SDK 构建/序列化 QPUTask |
| 同上 | `query_oqc_service` | 活跃设备或既有任务状态 |
| 同上 | `submit_oqc_task` | 显式目标、shots、电路的一次任务提交；只返回确认的任务 ID |
| [Quantum Inspire](https://github.com/QuTech-Delft/quantuminspire) / quantuminspire 4.1.0 | `query_quantum_inspire` | ResourceManager 查询一页设备类型或一个既有任务状态 |

## 准备和数值语义

```sh
node scripts/setup-paper-tools.mjs aqt-workbench oqc-cloud quantuminspire-cloud
```

三项各用 Python 3.12 的隔离锁定环境。AQT 依赖 Qiskit 1.x，与平台其他 Qiskit 版本隔离；官方离线目标限制为 20 qubits、
每作业 2000 shots，不截断超范围请求。固定随机种子控制 SDK 模拟器，位串顺序是 q[n−1]…q[0]。
噪声模型为 SDK 示例，不能当作当前设备标定。OQC 本地准备只验证任务能被 SDK 序列化，不能证明目标接受该电路。

OQC 使用专有 SDK，仓库不附带供应方源码或 wheel；显式准备由使用者按其许可执行。其他两项上游主包为 Apache-2.0。
所有动作保守声明 `workspace-write`，考虑 SDK 缓存；OQC 提交声明最大副作用为 `external-write`，且非幂等。
参数不接受代码、任意路径、任意 URL 或凭据值。

## 远程行为

- AQT：`AQT_API_TOKEN`，固定 `https://arnica.aqt.eu`。关闭 `.env` 加载，离线计算不读该令牌；
  HTTP 客户端构造时固定端点、排除环境代理，不受 ambient AQT_PORTAL_URL 影响。远程设备列表不等于硬件可执行验证。
- OQC：`OQC_API_TOKEN`，`OQC_API_ENDPOINT` 可选，默认 `https://cloud.oqc.app`；只允许 HTTPS 官方 oqc.app 域。
  SDK 初始化会读取服务版本与设备列表。禁用额外状态页请求、环境代理、重定向、自动 HTTP 重试及原始服务提示日志。
  写入只调用一次 SDK schedule_tasks；若响应丢失，结果明确标为未知，先查账户任务再决定是否重试。
- Quantum Inspire：`QUANTUMINSPIRE_API_TOKEN`，固定 `https://api.quantum-inspire.com`。
  通过 SDK ResourceManager 和生成客户端注入内存配置，不读取/改写 ~/.quantuminspire，也不浏览器登录或刷新令牌。
  后端目录在上游 API 中是公开 GET，因此 SDK 不为该路由发送认证头；任务状态路由发送 bearer token。
  适配入口仍要求用户显式配置令牌后再连接。列表只返回指定页与服务报告的 total；100 条每页是上游 API 上限。

所有远程响应都是服务报告；错误文本不包含原始服务体或令牌值。这里不支持 AQT、Quantum Inspire 任务提交，
也不支持取消任务、后台轮询或自动重试。OQC 的已确认提交同样不表示任务已完成。

## 实际验证

```sh
node --test tests/sdk-gaps-cloud-contracts.test.mjs
OPENQUANTUM_REAL_SDK_GAPS_CLOUD=1 node --test tests/sdk-gaps-cloud-live.test.mjs
```

真实 SDK 数值/接口用例在禁止 socket 连接下运行：AQT 的 Bell 统计、固定种子、位序、RY、噪声及上游 shots 约束；
OQC 的任务序列化、配置恢复、设备/状态查询、单次写入与失败；Quantum Inspire 的分页、模型反序列化及作业状态。
HTTPX、requests、aiohttp 仅在传输层使用受控响应，保留供应方请求序列化、认证和响应模型；失败测试覆盖缺凭据、401、
重定向、超时、非官方地址与错误脱敏。真实 MCP 分别验证本地成功和无凭据失败。

本地生成记录在 `.openquantum/sdk-gaps-evidence/cloud`。没有实际账户连通、QPU、收费提交或科学验收；
所有成功结果保持 L1 / `scientificValidation=not_evaluated`。
