# FatQat 量子实验

接入日期：2026-09-11。此接入将 FatQat 的有界本地计算提供给 OpenQuantum Agent，
并用 Skill 指导实验选择和解释。它可供量子学习通的教学任务使用；没有新增课程编辑器或独立实验面板。

## 版本与运行方式

- 上游：[spaceqat/fatqat](https://github.com/spaceqat/fatqat)，Apache-2.0。
- 固定版本：`0.1.0a1`，Git SHA `39b75e30ae50ddb4a8c7b840847edce678aa814c`。
  此版本已包含上游 #19 的经典寄存器顺序与保留修复。
- Python 3.12，全部传递依赖由 [uv.lock](../../.agents/skills/fatqat-workbench/uv.lock) 固定。
  安装来源的 Git revision 在每次计算前核对，返回依赖锁、输入和物理模型摘要。
- [Skill](../../.agents/skills/fatqat-workbench/SKILL.md) 由现有文件系统 Skill Provider 发现。
- `fatqat_local` 是 Agent Preset 中默认开启的本地 stdio MCP 连接；Harness MCP Client 负责注册 Tool。
  Node MCP 边界校验输入，独立 Python worker 调用 FatQat，复用现有 `runLocalJsonProcess` 处理超时和取消。
- 初次 Tool 调用可能下载依赖、写入 `.openquantum/python-envs/fatqat-workbench` 和绘图库缓存，
  因此两个 Tool 都声明 `workspace-write`、非破坏性、允许联网准备环境；数值实验不访问模型 API 或量子云。
  每次计算最多 120 秒，服务最多两个并行计算；Harness 调用上限 135 秒。

## 已暴露的计算合同

| Tool | 内容 | 限制 |
| --- | --- | --- |
| `simulate_fatqat_circuit` | 通用线路、超导原生门与 CZ 图约束、原子阵列配对；精确概率、可选采样、态与 Z 期望值、PNG 图 | 1–8 qubits，64 操作，4096 shots；噪声最多 5 qubits，原子阵列最多 6 站点 |
| `simulate_fatqat_dynamics` | 两个三能级 transmon 的单站点恒定驱动，或 1–6 个二能级里德堡原子链的全局恒定驱动、失谐与 C6 作用；人口时间序列、最终态和 PNG 图 | transmon 0.01–200 ns；原子 0.001–5 µs；2–51 个时间点；全基态初态，无附加噪声 |

位序固定为 q0/site0 在最左侧、最高位。电路概率来自测量前的态；counts 是另一条终端测量的有限 shots 结果。
噪声是每个幺正门后各操作数独立的通道，不作用于加载或配对。原子阵列初始已加载；Pair/Unpair
只改变门级资格，不代表真实移动轨迹。超导 profile 接受 X/SX/RZ/CZ 原生门，不自动编译或路由。

动力学结果含完整模型文档和单位：transmon 使用 ns、rad/ns；原子使用 µs、µm、rad/µs、rad/µs·µm⁶。
transmon 保留完整 9 维物理态；图上 level 2 是单站点泄漏人口。两类模型均为参考模型，不能当成当前设备校准。
transmon 驱动是各 site 旋转系中的共振 Rabi 包络，此接口无静态 exchange；泄漏仅计三能级截断的 level 2，
采样峰值不保证是连续时间峰值。Rydberg 使用 `H/ℏ=(Ω/2)ΣX−ΔΣn+Σ(C6/r⁶)nᵢnⱼ`、`n=|r⟩⟨r|`。
相互作用强度与时长的计算预算只限制多原子实验，单原子的 C6 和间距不影响轨迹。

输入示例见 [experiments.md](../../.agents/skills/fatqat-workbench/references/experiments.md)。
用户可在 OpenQuantum 对话中请求“用 FatQat 比较 Bell 态精确概率与 1024 次采样”或
“用 FatQat 展示一个里德堡原子的 Rabi 振荡，标明单位”。设置中心可看到 **FatQat 量子实验**。
更改连接开关或升级 Preset 后需要重启 Harness。
此次同步修复了量子组件页对 DSH 新版 `remote.credentials` 接口的适配；桌面运行副本通过
`npm run desktop` 从源码更新，仅在应用内重启不会重新复制源码组件。

## 验证与证据

```bash
npm run capability:fatqat-workbench:test
npm run capability:fatqat-workbench:live
OPENQUANTUM_REAL_FATQAT=1 node --test tests/harness-fatqat.test.mjs
node --test tests/harness-native-quantum.test.mjs tests/project-settings.test.mjs
```

默认合同测试检查工具清单、schema、边界拒绝、凭据隔离、图像与结果结构、错误和取消。
真实计算测试是显式入口，避免普通 CI 隐式下载科学依赖；覆盖 Bell 相干幅度、非对称位序、相位干涉、
seed 重复性、完全振幅阻尼、原生门和连通性失败、原子配对、解析 Rabi、无相互作用因子化以及 transmon 激发与泄漏。
独立试用使用另行构造的 Hamiltonian 核对超导末态和 Rydberg 人口，并核对 transmon 的能级映射；
发现并修正了单原子不应受相互作用预算限制的问题。结构归一化误差不代表动力学轨迹误差。

Harness 端到端验证使用临时 Home 和本地模型协议桩，经过真正的 Skill Registry、Agent Tool Calling、
MCP、FatQat 计算与持久事件记录，确认数据和 PNG 图进入 `tool/result`。它验证工程调用链，
不证明真实外部模型会自主正确规划实验。

本地实测工件保留在 Git 忽略的 `.openquantum/fatqat-evidence/`：各案例 JSON、PNG 和
`harness-session.json`。该目录由显式测试生成，包含测试时间和完整来源；不是发布产品中的额外持久化系统。

当前为 L1 执行能力，所有结果均为 `scientificValidation=not_evaluated`。
未新增 Scientific Validator、Acceptance Profile 或独立运行时。
没有暴露任意 Python、用户路径、自定义物理文档、编译器、动态控制流、通用 qudit 门、
上游私有三能级原子接口或 QPU 提交。上游完整教程和课程 UI 尚未自动导入。
