# SlowQuant：分子线性响应与谱学

`slowquant-response` 提供固定 SlowQuant 完整源码、隔离依赖和共享 Skill。用户可通过上游公开接口
组合分子、基组、电子数/自旋、积分来源、活性空间、UCC/UPS、轨道优化、激发阶数和响应形式，
计算激发能、跃迁偶极与振子强度。小分子例子是验证范围，不是 SDK 的输入规模上限。

该入口补充 VQE/VQD/SQD 之后的响应与谱学工作流。普通 HF、积分、基态或子空间任务仍可使用已有
PySCF、OpenFermion、QDK Chemistry 等路径，不需要重复包装算法。

## 使用入口

```sh
node scripts/sdk-access.mjs inspect slowquant-response
node scripts/setup-sdk.mjs slowquant-response
node scripts/sdk-access.mjs inspect slowquant-response
```

`inspect` 只读；显式 setup 根据新环境的 `uv.lock` 准备 Python 3.12，并使用现有 `sourceProject`
下载、校验完整源码 SHA。固定源码不提供可安装包，不能用 `pip install slowquant` 代替准备。
源码、依赖与锁不一致时保持未就绪；准备不执行科研程序，执行不隐式安装。

使用 `inspect.run.command` 给出的解释器，加 `-B` 运行
[可编辑示例](../../.agents/skills/slowquant-response/references/native-example.py)。在用户结果目录执行，
可调整 `--atom`、`--basis`、`--charge`、`--spin`、活性空间、激发阶数、响应形式和优化参数。
该示例使用限制性 HF 起点；其他波函数与流程按上游公开接口编写自己的程序。
复制例子到其他位置时，设置 `OPENQUANTUM_ROOT` 为插件/仓库目录，并沿用 `inspect` 的源码目录。

导入前运行 `sdk_bootstrap.prepare_sdk("slowquant-response")`；它从 SDK 清单读取唯一固定来源，
拒绝空清单、额外/缺失/改变的源码、错误 revision 和逃逸路径。Numba 缓存应位于源码之外的任务目录；
默认缓存也与固定源码分离，以免模块检查改变准备状态。所有计算及缓存写入遵循宿主授权与资源预算。

DSH/Codex 共享 Skill 和实现，各宿主独立拥有环境、权限及状态。没有新增 Tool、MCP Server、
宿主执行循环、Validator 或 Acceptance Profile。

## 验证范围

离线检查使用 macOS arm64 隔离环境，并由操作系统拒绝网络访问。
H₂/STO-3G 的两个电子、两个空间轨道可用完整 singlet FCI 对照 SD 响应；这个等价关系不推广到
任意截断活性空间。参考程序独立调用 PySCF FCI 与跃迁密度矩阵，不导入 SlowQuant；它与主计算
共享同一明确的分子模型/积分来源，不构成独立积分实现的核验。

- 0.74 Å、naive 响应：基态与激发能、允许和禁戒跃迁的振子强度。
- 1.1 Å、projected 响应：改变用户输入和响应形式后重复独立对照。
- 无效活性空间与未优化基态：保留上游失败诊断，不生成成功结果。
- Qiskit 本地 StatevectorSampler：256 shots 下的 HF 行列式占据数，切换缓解/后选择标记并重复调用。
  这是解析占据数回归，不是完整分子 qLR、噪声模型或硬件验证。
- 固定源码加载、真实 Skill 发现及 Codex 环境检查：工程就绪与数值正确分别记录。

能谱和强度回归的容差在执行前固定，保留 Hessian/metric 残差、范数、虚部和优化日志。
本轮出现的 SciPy BFGS 精度损失警告保留在原始 stderr；小模型的 FCI 对照通过不代表一般优化问题已收敛。
详细数值、版本、源码/锁摘要和实际检查见[证据记录](evidence/slowquant-2026-10-31.json)。
Qiskit 分子 qLR、带噪谱学和真实硬件尚未验证；其他响应形式、大规模性能和跨平台安装不由这些例子证明。
上游返回实部、正常退出或工程 CI 通过均不等于科学验收，当前 `scientificValidation=not_evaluated`。

## 来源与维护

- 上游：[erikkjellgren/SlowQuant](https://github.com/erikkjellgren/SlowQuant)，固定
  [`b0d12b2e7e680141e50f3de0c9ba029d9574bbca`](https://github.com/erikkjellgren/SlowQuant/tree/b0d12b2e7e680141e50f3de0c9ba029d9574bbca)。
- [BSD-3-Clause](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/LICENSE)：
  保留版权、许可与免责声明；准备的完整源码中包含原始许可证。依赖许可随各自锁定发行包保留。
- [方法论文](https://arxiv.org/abs/2312.13937)；原[接入规格](../ecosystem/proposals/slowquant.md)。
- 同步归每周上游任务：检查源码加载、依赖兼容、波函数/响应约定和测量分布复用变化，不只修改 SHA。
