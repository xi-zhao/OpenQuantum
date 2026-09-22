# 2026-09-22 量子库更新

本轮以 `97181b39f9970cd3d2135885ec8fb7a445e76f29` 为基线，在独立工作树实施。
目标是更新已有计算能力并验证上游修复；沿用现有 Tool、MCP 连接和参考合同。

## 发行版变更

| 能力 | 旧版本 | 本轮固定版本 | 实际变化 |
| --- | --- | --- | --- |
| Compact | 0.2.1 / Qiskit 2.5.1 | 0.2.3 / Qiskit 2.5.2 | 更新优化搜索；继续独立检查完整 unitary 和交付 QASM，auto 参考阈值仍为 8 qubit |
| QCut | Qiskit 2.5.1 | Qiskit 2.5.2 | QCut 2.2.0 与 cutting addon 0.10.0 不变；保留对称 CZ 切割与真实成本统计 |
| Clifft | 0.10.0 | 0.10.1 | 上游续执行噪声符号重置修复；产品仍只提供原有最终测量门电路 |
| Graphix | 0.3.5 | 0.4 | 迁移至 `to_opengraph().graph`，使用空间调度返回值；每个测量分支独立初始化结果 |

Graphix 0.4 虽已在 PyPI 发布，其 GitHub Release 仍标记为预发布，因此作为单独迁移提交。
NumPy 继续固定 2.4.6。输入弧度到 π 倍数的转换、全零/全 plus 初态、输出逻辑线序、纠正后的态矢、
生成与模拟开关，以及独立参考的 `auto|required|skip` 语义保持一致。有限分支回归不证明任意输入通道等价。

Compact 新增的决策图、相位多项式和证书 checker 不自动成为 OpenQuantum Validator。
当前 Tool 继续将上游 tier 作为诊断，独立比较容差仍为 `1e-8`；9 qubit auto 请求明确返回未检查候选。
ECR/iSWAP 的线序误判在 0.2.3 仍可复现，两种门继续不对外开放。

## 开发版验证与保留项

| 对象 | 已验证的固定来源 | 本轮处理 |
| --- | --- | --- |
| Stim | `1.17.dev1790038003` | 不完整 Circuit/DEM tag 明确报错，带 tag/注释的 DEM 重读、PyMatching 与局域噪声实验通过；发行版仍固定 1.16.0 |
| FlagQuantum SDK | `917bd5f7c1b16576f74f3b7b99a1142c0c052772` + MCP 0.3.0 | 参数、wire、dtype、预算拒绝与代表性 MCP 调用通过；发行版仍固定 PyPI SDK 0.2.0 与 MCP 0.3.0 |
| MQT core / QCEC | 3.10.0 系列 | QCEC 的 `mqt-core~=3.10.0` 约束不允许独立升级至 core 4；保持原锁 |
| TyxonQ、Dynamiqs、FatQat | 当前发行版锁 | 不属于首批必要修复，保留现有接入；后续按实际工作负载迁移 |

开发探针的完整依赖锁与[复跑命令](../../benchmarks/upstream-updates/README.md)留在 benchmark 目录，
不被运行时加载。FlagQuantum 的预算负例已到达底层收缩并拒绝不足一个复数元素的预算；没有测量原生峰值 RSS。
两个开发版仍没有本轮要采用的新稳定版；当前 QEC Tool 不接受用户 DEM 文本，因此继续保留稳定版及已知 EOF 缺陷记录。

## 验证与边界

数值、版本和源码摘要见[版本化证据](../integrations/evidence/upstream-update-2026-09-22.json)。

- 真实 MCP 检查：QCut 的相位敏感重建、反向 CX、显式切割与 shots；Compact 的完整 unitary、导出文本和参考开关；Clifft 的干涉、噪声、线序和 seed；Graphix 的自适应纠正、初态和角度。
- 新增编译回归 14 项，已有编译回归 10 项；Clifft 续执行回归 2 项；Graphix 补充 3 个输入场景。
- 隔离 Stim 解析回归 3 项及局域噪声/DEM 回归 5 项；隔离 FlagQuantum SDK 10 项及 MCP 4 项。
- 18 个真实 MCP 输入及 3 个 Graphix 补充场景通过。三组 Harness 端到端检查记录 14 个成功调用和 3 个预期错误，验证了 Session 事件与结果重读；使用本地模型协议替身，不替代外部模型自主执行。
- 完整 `npm run check`、相关合同检查及 `npm run test:upstream-updates:live` 均通过；验证平台为 macOS arm64，GitHub 的提交检查状态另行核对。
- 全部 L1 结果仍为 `scientificValidation=not_evaluated`；无新增硬件提交、模型路由或科学 Acceptance。

本页记录源码与依赖更新，不是新的应用 Release。已运行 Host 需重启后加载新版接入；已安装桌面 0.5.1
不会因源码 main 更新而自动变成新安装包。回退时使用对应独立提交的逆向变更，再按旧锁重新物化环境。
