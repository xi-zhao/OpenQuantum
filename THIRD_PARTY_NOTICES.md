# Third-party notices

OpenQuantum 自有代码采用仓库根目录中的 [MIT License](LICENSE)。这个许可证不替代第三方项目的许可证，也不把第三方代码重新许可为 OpenQuantum 的代码。

下表记录 OpenQuantum 当前明确接入或直接依赖的主要上游组件。各组件仍由原作者持有版权，并继续遵循其原始许可证。

| 组件 | 许可证 | OpenQuantum 中的使用方式 | 上游来源 |
| --- | --- | --- | --- |
| DeepSeek Harness | MIT | 作为 Agent Runtime 和 Web UI 基础，`dsh` 与 `dsh-mcp-client` 固定为 `0.1.0-rc.6`；OpenQuantum 使用 Cordis patch、preset 与公开接口扩展，不修改 `node_modules` | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) |
| CC Connect | MIT | 固定 npm `1.5.0`，作为可选的消息平台桥；通过 ACP 启动 Harness Agent，不复制上游源码，也不把平台凭据写入仓库 | [chenhg5/cc-connect](https://github.com/chenhg5/cc-connect) |
| Agent Client Protocol TypeScript SDK | Apache-2.0 | 固定为 `0.25.1`，仅用于验证 OpenQuantum ACP 入口与 Harness 的真实 stdio 握手 | [agentclientprotocol/typescript-sdk](https://github.com/agentclientprotocol/typescript-sdk) |
| Qiskit MCP Servers | Apache-2.0 | 通过 `uvx` 使用 Circuits `0.3.1`、Docs `0.3.0`、IBM Runtime `0.6.1`、IBM Transpiler `0.4.1` 与 Gym `0.4.1`；上游实现没有复制进本仓库 | [Qiskit/mcp-servers](https://github.com/Qiskit/mcp-servers) |
| FieldQKit | Apache-2.0 | 使用 `0.1.2` 的固定上游提交 `3ef2493d3f840b6a924af66a0c3f1b79cfce3fa0`；OpenQuantum 维护独立的只读 MCP 桥接与 Skill，上游源码没有复制进本仓库 | [FieldQuantum/fieldqkit](https://github.com/FieldQuantum/fieldqkit) |
| TyxonQ | Apache-2.0 | 通过 `uv` 按需使用 PyPI `tyxonq==1.2.0`；OpenQuantum 维护独立的有界本地仿真 MCP 与 Skill，不复制上游源码，也不开放上游云端任务接口 | [QureGenAI-Biotech/TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) |
| Quantum Hardware MCP | MIT | 安装命令把固定提交 `13fbe9f13fd68c409086491b9598ce2d25f5210a` 检出到被 Git 忽略的 `.openquantum` 目录；OpenQuantum 不在本仓库重新分发上游源码 | [Lokesh-2025/quantum-hardware-mcp](https://github.com/Lokesh-2025/quantum-hardware-mcp) |
| Model Context Protocol TypeScript SDK | MIT | 作为本地 MCP 服务和测试的直接 npm 依赖，固定为 `1.30.0` | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) |

仓库中的 OpenQuantum 自研桥接、配置、Skill 和 Validator 受根目录 MIT License 约束。它们调用或编排某个上游项目，并不改变上游项目的许可证。

通过包管理器或安装脚本取得的组件会携带自己的许可证元数据。发布包含这些第三方组件的 Docker 镜像、安装包或其他二进制分发物时，需要同时保留适用的版权声明、许可证文本和上游要求的 NOTICE 内容。

本文件用于说明项目当前的依赖与分发边界，不构成法律意见。发现遗漏或上游许可证变化时，请提交 Issue 或 Pull Request。
