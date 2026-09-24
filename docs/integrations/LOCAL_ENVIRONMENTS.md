# 本地计算环境准备

Python 计算桥接复用同一个显式安装器。安装和计算是两个动作：准备阶段读取已提交的锁文件，
计算阶段直接使用已准备的 Python，不调用包管理器、不自动补装或升级依赖。

在仓库根目录运行，例如：

```bash
node scripts/setup-paper-tools.mjs qec-memory-experiment qpanda-qubo
```

支持的能力 ID 由安装器验证；各 Skill 给出自己的准备命令。原有 `capability:*:setup` 命令继续有效。
需要 Node 24+、uv 和对应平台的编译条件；安装可能下载 Python、锁定依赖并构建原生包。
环境仍位于 `.openquantum/python-envs/<capability-id>/`，不合并存在依赖冲突的 SDK 环境。
部署者可设置 `OPENQUANTUM_PYTHON_ENV_ROOT` 指向已有的绝对环境根目录；安装器和计算桥接必须使用同一设置。

旧环境升级时运行一次同一准备命令。安装器在原目录按锁文件核验、同步，成功后写入锁摘要标记；
不会删除整个环境。重复运行保持同一位置。未准备、旧锁、缺少 Python 时，Tool 返回具体准备命令；
失败或中断的准备不会留下可误认为成功的旧标记。不要手工复制标记冒充依赖核验。
修复安装错误后重新准备即可恢复，无需重建 Skill 或改 Tool 名称；若运行中的 MCP 发现锁文件已变，还会要求重启连接，保证来源摘要对应实际环境。

本次迁移涵盖 19 个共享 Python 桥接和 7 个专用桥接；Hamiltonian 原有的准备方式已并入共同实现。
FieldQKit 使用原固定 Git 修订及新增提交的依赖锁。RandomMeas 的 Julia Manifest、QDMI 的 C 驱动准备、
上游 MCP 启动器仍按各自说明工作。算法 CLI 的最小/分组环境见[示例说明](../../examples/quantum-algorithms/README.md)。

准备后，本地数值计算不需要访问包源。SDK 的绘图、JIT 等缓存仍可能写磁盘；Toqito/QEC 等能力的
可信结果物化也有工作区写入，因此保留既有 `workspace-write` 声明。Hamiltonian 保留原只读合同。
FieldQKit 的模拟器发现可本地执行；云后端发现仍是所选服务的网络查询，不提交云任务。
环境就绪不等于连接启用、模型可用或科学 Acceptance 通过。
