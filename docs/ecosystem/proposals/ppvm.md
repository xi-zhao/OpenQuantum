# PPVM：丢失、泄漏与非 Clifford 电路模拟

用户于 2026-11-10 明确要求接入。本项是用户指定实施，不受自动发现队列的三项上限限制；沿用现有插件架构、隔离验证和 PR 交付边界。

## 价值与替代

OpenQuantum 面向量子科研、应用和教学。PPVM 的增量是把 Pauli 传播、广义 tableau、测量反馈和原子丢失/泄漏语义接入同一可编程 SDK，使 Agent 能表达中性原子噪声研究任务并保留可复核结果。现有 Clifft、TSim 和 Monoprop 已覆盖部分非 Clifford 采样及 Pauli 传播；Rust 实现或另一个采样器本身不是接入价值。

优先验证具体物理模型和错误解释，不预设性能优势；大型数字孪生、硬件真实性、截断收敛和千比特规模仍需逐任务验证。示例规模只界定开发证据，不限制上游公开 API。

## 固定来源与接入设计

- 官方源码：https://github.com/QuEraComputing/ppvm
- Release：v0.3.0，完整提交 `3cc883fd93b2475cb10c892a8a31adcc09a7579c`。
- 论文：https://arxiv.org/abs/2610.18225
- Apache-2.0；保留上游版权与许可，不复制数值实现。
- Python 发行名 `bloqade-ppvm`，导入名 `ppvm`。2026-11-10 核查 PyPI 仅到 0.2.0，因此固定 v0.3.0 的源码构建，明确 Rust/Cargo 构建要求和间接依赖锁。版本事实以项目声明与锁文件为准。
- 使用 L0 `ppvm-simulation` Skill + 现有原生 SDK 工作台。最小 Interface 是既有的 SDK `inspect`、显式 `setup` 和宿主文件/代码 Tool；不新增转发 Tool、MCP Server、宿主适配器或 Runtime。DSH/Codex 复用同一份目录与指南。
- 共享清单仅添加 PPVM 条目，README 仅补充能力入口与边界；保留 #79/#77 的未合并内容，由后续合并顺序协调，不修改它们的分支。

## 验收范围

1. 只读发现返回完整公开 SDK 导航、固定依赖及独立环境的显式准备命令；发现不安装，执行不隐式安装。
2. 通过现有准备入口从完整 SHA 与锁安装，验证用户自定义程序和结果工件；不将小示例包装成唯一功能。
3. 真实数值对照覆盖：Heisenberg 门/噪声逆序、非 Clifford 小电路、丢失标记、相关丢失概率、泄漏与 `reset`/`reset_state` 区别；失败路径覆盖不支持或非法输入。解析结果或独立稠密矩阵作参考，不用上游相同实现充当答案。
4. 现有 SDK、Skill 发现、Codex 投影/打包、清单一致性及 README 链接检查通过。新增执行行为按既有 SDK Interface 先复现失败再接通；数值检验属于开发回归，不新增科研验收 Profile 或阈值。
5. 根 README 说明能力、入口、源码构建成本与科学边界。真实运行证据与自审结论分别保存；未完成项保留 Draft。CI 不替代科学验收或真实宿主 UI 验证。

## 必须保留的科学语义

- `PauliSum` 反向传播整个门/噪声序列，旋转角符号不因此反转；truncation 按任务记录并验证。
- `reset_state` 保留丢失/泄漏状态，v0.3.0 的 `reset` 可恢复这些状态再置零。后者包含补回/恢复假设，不等同于任意硬件复位。
- `MeasurementResult.LOST` 不是 0 或 1。泄漏为上游离散有效模型，不宣称完整多能级微观动力学。
- 相关丢失参数的第二项是每个指定量子比特单独丢失的概率，恰好一个丢失的总概率为其两倍；已丢失一个时第三项另有条件语义。
- Stim 格式支持范围由该版本及所选 backend 决定，不承诺全部 Stim 语法或自动生成 detector error model。
- 所有证据保留 `scientificValidation=not_evaluated`；本次不添加 Validator/Acceptance Builder 集成，不声称硬件校准或量子优势。
