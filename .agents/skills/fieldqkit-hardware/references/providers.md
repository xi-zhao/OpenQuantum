# FieldQKit Provider 对照

| Provider | 凭据引用 | 默认用途 |
| --- | --- | --- |
| `simulator` | 无 | 本地模拟器元数据 |
| `quafu` | `QUAFU_API_TOKEN` | 夸父量子云 |
| `tianyan` | `TIANYAN_API_TOKEN` | 天衍量子云 |
| `guodun` | `GUODUN_API_TOKEN` | 国盾量子云 |
| `tencent` | `TENCENT_API_TOKEN` | 腾讯量子云 |
| `origin` | `ORIGIN_API_TOKEN` | 本源量子云；部分操作需要可选 `pyqpanda3` |
| `fieldquantum` | `FIELDQUANTUM_API_TOKEN` | FieldQuantum 云端模拟器 |
| `logicalqubit` | `LOGICALQUBIT_API_TOKEN` | 逻辑比特量子云 |

凭据值只保存在 DeepSeek Harness credential store。Skill、MCP 输出、Session 和 Git 中均不得出现明文。

当前集成固定到 FieldQKit `0.1.2` 的公开提交
`3ef2493d3f840b6a924af66a0c3f1b79cfce3fa0`。使用提交摘要而不是浮动的 `main`，保证每次安装得到同一份上游源码。
