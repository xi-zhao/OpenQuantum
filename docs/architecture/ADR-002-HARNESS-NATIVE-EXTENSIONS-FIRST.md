# ADR-002：Harness 原生扩展优先

状态：已接受（取代本文件的早期决策）
日期：2026-08-14
关联工作：M0、M1、M2、M3

## 背景

OpenQuantum 的目标是成为一个便于量子公司 Fork 和二次开发的开源工具，而不是经营一个插件市场。
DeepSeek Harness 已经提供 Agent Runtime、Skill、Tool、MCP、Plugin、权限、沙箱、模型路由和持久化。
如果 OpenQuantum 再定义私有包格式、安装锁、Catalog 和发布治理，会让贡献者同时学习两套系统，
并让项目承担与量子科研无关的 Runtime 维护成本。

## 决策

OpenQuantum 定位为 **DeepSeek Harness 的量子科研发行版**，第三方扩展直接采用 Harness 原生机制：

- 领域工作流使用原生 `SKILL.md`；
- 确定性计算和外部后端使用 Harness 支持的 stdio / Streamable HTTP MCP；
- Agent、Skill、MCP、权限和模型通过 preset / Cordis 配置组合；
- 只有原生机制无法表达的宿主行为才使用经过审查的 `dsh-plugin`；
- 量子公司通过 Fork、普通 Git 分支与 PR，或维护自己的发行版完成交付。

OpenQuantum 只增加量子 preset、初级 Skill、MCP、可信插件、科学 Validator、必要科研 UI 和薄
`HarnessTransportAdapter`。Session、Agent loop、Tool/Skill/MCP registry、权限、沙箱、模型、事件和持久化
全部以 Harness 为权威实现。

科学 Validator 是独立于 Harness Skill Registry 的领域实现，可以与 Skill 源码共置以提高 locality，
但必须由 MCP/Tool 或可信插件显式调用。它将 Harness 的“执行完成”与“科学验收通过”分开，不形成新的
Runtime、安装系统、发布状态机或 Skill→Validator 绑定协议。

第一版明确不实现：

- `.oqcap` 或其他 OpenQuantum 私有包格式；
- OpenQuantum 私有的打包工具链、发布身份或安装 lockfile；
- 独立 Catalog、插件市场、签名和发布通道治理；
- 平行于 Harness 的权限、沙箱、模型或持久化；
- 自动下载并执行未信任的第三方插件。

## 结果

收益：

- 量子公司只需理解 DeepSeek Harness 和量子 Skill 本身；
- OpenQuantum 的改造面保持很薄，可以持续跟进 Harness 上游；
- 第一版可以集中完成 QGS Skill、一个 MCP、Harness E2E 和开发指南；
- 通用 Runtime 缺口可以优先向 DeepSeek Harness 上游贡献。

代价：

- 不提供跨 Fork 的一键安装、升级、回滚或统一市场；
- 版本固定暂时依赖 Git commit、npm/pip lockfile 和 Harness 配置；
- `dsh-plugin` 是可信宿主代码，维护者必须人工审查；
- Harness 处于预览期，OpenQuantum 需要用薄 adapter 和 E2E 吸收兼容性变化。

只有当多个真实量子公司明确提出跨发行版分发需求，且 Harness 上游没有可复用机制时，才重新评估安装和治理。
在此之前，不为假设性市场设计新的 Interface。
