# 原生 SDK 工程证据归档

这里保存首批 13 项、后续 72 项及其验证索引所引用的原始字节，包括程序、收据、完整数组和其他工件、安装与检查日志、失败和中断尝试。原始报告及其摘要保持不变；报告中的本地路径是来源标识，复核时无需访问原机器。

`manifest.json` 使用“历史相对路径 + SHA-256”定位一个文件。相同内容只存一次，位于 `objects/<sha256>.gz`；gzip 解压后的字节数和 SHA-256 必须与记录相符。旧报告引用的不同版本源码分别保留，没有用当前版本替换旧字节。6 个路径有多个历史版本，读取时可附加 SHA-256 消除歧义。

当前归档含 1,673 个路径/版本记录和 971 个唯一对象，压缩对象约 3.4 MB；多次运行的完整大数组通过内容去重保留。记录涵盖三份顶层报告的全部文件摘要，并递归覆盖执行收据及 QDMI 头文件/驱动收据中的引用。失败与中断记录保留原来的状态和开始时间，不用归档文件的时间重新排序。

已知历史缺口：TensorCircuit 的失败尝试 `tensorcircuit-differentiable-ok5Pjx` 使用过未提交的中间 `pyproject.toml` 与 `uv.lock`，两份原始字节未保留。它的诊断、程序、包版本清单和失败收据仍在归档中，但不能据此恢复该次尝试的完整依赖快照。`manifest.json` 的 `unavailableHistoricalReferences` 明列两份文件及原始 SHA-256；`verify` 输出同一清单，并核对它们只属于这次失败尝试。其他 SDK 元数据引用缺失仍会失败。85 项最终成功运行的证据不使用这两份中间快照。

在仓库根目录运行，只有 Node.js 24+ 是必要运行时：

```sh
node scripts/sdk-evidence-bundle.mjs verify
node scripts/sdk-evidence-bundle.mjs read .openquantum/sdk-checks/remaining/alicebob-cat-circuits-vDZvwR/verification.json
```

`verify` 只读仓库中的三份报告和证据包。它核对全部对象、引用覆盖、历史版本和成功收据之间的关系；已列对象缺失、大小/摘要不符、重复映射或损坏压缩数据均失败，已知历史缺口明确输出。它不会读取原本地路径、访问 Git 历史、下载、导入第三方 SDK 或运行归档程序。`read` 先校验归档，再把所选文件的原始字节写到标准输出。

新目录可复核性和篡改拒绝由 `tests/sdk-evidence-bundle.test.mjs` 验证：只复制三份报告、此证据包与标准库校验脚本，不带 `.git`、`.openquantum` 或 `node_modules`。负例另外在隔离目录中放入同路径的原始文件，即使该文件存在，归档缺失或损坏也必须失败。

`build` 是维护者在原证据仍保留时使用的归档命令。它校对来源字节；遇到旧版源码摘要时，只接受已记录提交中完全匹配该摘要的字节。它不是运行 SDK 或重新验收科研任务的入口。

所有记录仍为 `scientificValidation=not_evaluated`。这份归档解决工程证据可复核性，不新增科学结论。
