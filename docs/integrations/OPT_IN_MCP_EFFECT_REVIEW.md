# 默认关闭的外部 MCP Server 合同审查

- 审查日期：2026-09-05
- 范围：固定源码的 Tool 注册清单、逐 Tool 最大副作用、部署版本引用
- 逐项证据：[机器可读合同与源码摘要](evidence/opt-in-mcp-tool-contracts.json)

本记录补齐发行版 Preset 中原先未登记的五个外部 MCP Server。它们是 **Tool-only 的接入合同**，
不为凑目录或一一对应而新建 Skill；已有工作流可以使用其注册后的 Tool。

| MCP Server | 固定上游来源 | Tool 数 | 当前状态 |
| --- | --- | ---: | --- |
| `qiskit_ibm_runtime` | [PyPI 0.6.1](https://pypi.org/project/qiskit-ibm-runtime-mcp-server/0.6.1/) | 20 | 默认关闭 |
| `qiskit_ibm_transpiler` | [PyPI 0.4.1](https://pypi.org/project/qiskit-ibm-transpiler-mcp-server/0.4.1/) | 7 | 默认关闭 |
| `qiskit_gym` | [PyPI 0.4.1](https://pypi.org/project/qiskit-gym-mcp-server/0.4.1/) | 37 | 默认关闭 |
| `qpanda_runtime` | [OriginQ 固定 commit](https://github.com/OriginQ/qpanda3-runtime-mcp-server/tree/4a06035afa415ed8dc9d571869cb5ca60ed1bcb1) | 19 | 默认关闭 |
| `quantum_hardware` | [社区硬件固定 commit](https://github.com/Lokesh-2025/quantum-hardware-mcp/tree/83d1b924caaffbec4c07dd20473ccb4c2aacba06) | 53 | 默认关闭 |

固定分母为 **5 个 Server、136 个 Tool**。JSON 每项记录名称、副作用、依据类别、源码文件与行号；
对应源码记录 SHA-256。本次只读取固定发行包和源码，没有运行这五个 Server，没有使用真实凭据、
提交 QPU 任务或执行训练。源码覆盖不等于 `tools/list` 握手、在线可用性、完整安全认证或科学验收。

## 副作用口径

按完整调用的最大可能影响声明，而不是看名字或默认参数。`read-only` 不等于没有网络读取；
`external-write` 是保守上界，也包括工作区之外的用户凭据、共享服务状态和后台进程，不表示每次调用都会付费。

- IBM Runtime 的查询与提交分开；账户 setup 会调用 `save_account(overwrite=True)`，删除账户会改写
  用户目录下的凭据文件，所以与提交/取消一样标为 `external-write`。返回的掩码账户信息也仍属于敏感数据。
- IBM Transpiler 的账户保存和 AI SDK 路径没有工作区隔离保证；路由/合成允许云端模式或 fallback，
  所有七项先保守声明为 `external-write`，不把 `local_mode` 的默认值误当成只读承诺。
- Qiskit Gym 有训练、共享模型/环境状态和 TensorBoard 进程。模型及日志默认位于用户目录；
  `list_saved_models_tool` 和 `get_model_info_tool` 也可能通过内部路径函数创建目录，不能标为只读。
  训练、模型变更、后台进程和未隔离的模型合成按 `external-write` 上界管理；纯查询/内存转换单列。
- QPanda Runtime 的纯内存列表与云 SDK、任务和 binding 变更分开。后者保守标为 `external-write`；
  这不声称每个 SDK 方法都提交硬件任务。`sample`、`estimate` 和 batch 路径确实具备云任务提交能力。
- 社区硬件的设备列表/详情和结果收集会保存项目内 SQLite 证据，部分数据库读取也可能创建文件，
  因此标为 `workspace-write`。提交/取消、带可选真机分支的算法和未隔离的可选化学 SDK 路径按
  `external-write` 上界管理。明确的纯数学、电路检查和远端数据读取分别登记为 `read-only`。

启动阶段的包下载、Gym 目录创建和硬件数据库初始化还需独立的安装/启用审批；不能用某个 Tool 的
只读声明证明 Server 启动无副作用。上游依赖范围也不等于传递依赖完全可复现。

## 可重复检查

默认离线测试 `tests/external-mcp-contracts.test.mjs` 核对 policy、固定版本、逐 Tool 副作用和审查清单。
`capability:conformance` 反向检查所有 Preset MCP 连接，包括默认关闭和 Cordis group 中的连接；
每个 Server 只能有一个合同归属，多个 Skill 消费同一 Tool 不需要重复登记 Server。

重新审查固定源码时，解包到独立目录后运行以下只读检查；`source-root` 对 Git 来源指仓库根，
对 PyPI 来源指解包后包含 Python package 的目录：

```bash
node scripts/check-reviewed-mcp-source.mjs --server qiskit_ibm_runtime --source-root /absolute/path/to/unpacked-wheel
```

报告固定为 `scope=reviewed-source-bytes`、`runtimeExecuted=false`，拒绝缺失文件、摘要漂移、路径越界和
符号链接。不要用本机旧缓存代替固定版本，也不要为通过检查直接修改审查摘要。升级时必须重新审查
注册入口及其实现，更新证据与 policy，并在隔离环境中补真实 `tools/list` 与必要的审批/错误路径测试。

## 启用前仍需的边界

合同登记不会自动打开接入，也不会替代 Harness 的权限系统。正式开放云/训练能力前，还必须验证：

- 凭据只通过受控设置注入；上游账户 setup 的原始密钥参数和用户目录写入不能成为产品默认路径；
- 请求范围、数据外发目标、返回内容脱敏及模型可见的最小 Tool 集；
- 费用/资源上限、写操作审批、不自动重试提交，以及取消和失败恢复；
- 独立工作区、后台进程回收、依赖锁定与真实部署上的合同握手。

在这些证据不足时，保持默认关闭，不对外承诺 production-ready。
