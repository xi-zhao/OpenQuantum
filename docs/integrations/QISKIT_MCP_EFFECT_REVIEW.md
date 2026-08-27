# Qiskit MCP Tool 副作用审查

- 审查日期：2026-08-28
- 证据用途：`.agents/capability-packages.yml` 中 `effectEvidence: reviewed-source` 的可追溯依据
- 上游来源：[Qiskit/mcp-servers](https://github.com/Qiskit/mcp-servers)
- 固定发行包：`qiskit-mcp-server==0.3.1`、`qiskit-docs-mcp-server==0.3.0`

## 结论

两个固定发行包当前暴露的十个 Agent-facing Tool 均声明为 `read-only`。这里的 `read-only` 只表示 Tool
调用不产生持久化写入或外部状态变更；Qiskit Docs Tool 会读取 IBM Quantum 公共文档，因此仍有网络访问
和查询文本外发边界。

上游这两个版本没有在 `tools/list` 中返回 MCP Tool annotations。OpenQuantum 因此不能把
`readOnlyHint` 当作证据，而是固定版本、审查发行包源码，并用 `npm run mcp:qiskit:probe` 精确核对实际
Tool 清单。若未来上游返回与本记录冲突的 annotations，探针必须失败。

## 逐 Tool 结论

| MCP Server | Tool | 最大副作用 | 审查依据 |
| --- | --- | --- | --- |
| `qiskit` | `load_circuit_from_qasm_tool` | `read-only` | 解析调用方提供的 QASM，在内存中返回 QPY 与电路指标 |
| `qiskit` | `analyze_circuit_tool` | `read-only` | 在内存中分析电路结构，不访问网络或持久化文件 |
| `qiskit` | `compare_optimization_levels_tool` | `read-only` | 在本地运行四组转译并返回比较值；可能耗时，但不写外部状态 |
| `qiskit` | `transpile_circuit_tool` | `read-only` | 在本地 Qiskit pass manager 中转译并返回序列化结果 |
| `qiskit` | `convert_qpy_to_qasm3_tool` | `read-only` | 只做调用参数与返回值之间的内存格式转换 |
| `qiskit` | `convert_qasm3_to_qpy_tool` | `read-only` | 使用内存 `BytesIO` 生成 base64 QPY，不写文件 |
| `qiskit` | `export_circuit_to_qasm_tool` | `read-only` | 把调用方提供的 QPY 转成返回值中的 QASM 文本，不导出文件 |
| `qiskit_docs` | `search_docs_tool` | `read-only` | 对 IBM Quantum 公共文档搜索端点发起网络读取；不写远端状态 |
| `qiskit_docs` | `get_page_tool` | `read-only` | 只允许 IBM Quantum 文档域名并读取页面；不写远端状态 |
| `qiskit_docs` | `lookup_error_code_tool` | `read-only` | 读取 IBM Quantum 错误码页面并解析返回；不写远端状态 |

## 已审查源码摘要

以下为固定发行包解包后关键源码的 SHA-256。PyPI wheel 的 `RECORD` 也记录了相同文件内容摘要。

| 发行包 | 源码文件 | SHA-256 |
| --- | --- | --- |
| `qiskit-mcp-server==0.3.1` | `qiskit_mcp_server/server.py` | `ab3ff5d3b10c6871cc78587c4366f4d032705295743f54e494d514a87931d52b` |
| `qiskit-mcp-server==0.3.1` | `qiskit_mcp_server/circuit_serialization.py` | `30c5bad0cf199ddfabef84f742c6ac0c40d9e0f570043c09bf8aead9b567130a` |
| `qiskit-mcp-server==0.3.1` | `qiskit_mcp_server/transpiler.py` | `719096267c0ffa58804afc61c850e2f784fd55ba62783eae0a3976b7f4dc863b` |
| `qiskit-docs-mcp-server==0.3.0` | `qiskit_docs_mcp_server/server.py` | `7fb21c9b6c1d2678ecfaae109b006218dba0e55c6c29dc098464788519d1aa13` |
| `qiskit-docs-mcp-server==0.3.0` | `qiskit_docs_mcp_server/data_fetcher.py` | `674a28e1edbedc6b138d14bc4ead11a801b73217d1042049d0de8110da2c776a` |
| `qiskit-docs-mcp-server==0.3.0` | `qiskit_docs_mcp_server/http.py` | `1eebe5ac4dff23135918c32ed2eb663834de4e5f0b1e4f5ab4754c733db6e6e1` |

## 升级门禁

任一发行包版本、上述源码摘要、Tool 名称或 Tool 实现变化时，本记录必须重新审查。升级提交还必须运行
`npm run mcp:qiskit:probe`，并单独检查网络目标、输入限制、返回 schema、MCP annotations 和许可证变化。
