# README 图片说明

## 2026-09-12 更新

本轮以 OpenQuantum `ca1495edac826f2bdcb595bb94ded4eeb54b20ac` 为基线，在独立工作目录、独立
Harness Home 和空白学习数据库中启动实际应用。截图使用 macOS 上的 Chrome，视口为 1440 × 960，
语言为简体中文，主题为浅色；未提交建课、模型生成或科研计算任务。

| 图片 | 内容与来源 |
| --- | --- |
| [科研工作台](openquantum-workbench-20260912.jpg) | 当前 Harness 原生 UI、OpenQuantum 默认 Preset、量子学习通入口；科研侧栏仍显示上游 Harness 标志，截图保留该既有适配缺口。 |
| [量子学习通](openquantum-learning-20260912.jpg) | 在工作台内打开完整原版教学应用；上游固定提交 `29735f10d0081859ac3db1a50a0cc92f46436004`，使用仓库已有名称、主题和持久化适配。空课程库用于展示入口，不代表完整课程体系已发布。 |
| [MCP Server 连接](openquantum-connections-20260912.jpg) | 当前连接目录和配置开关；未更改开关，配置启用不等于服务当前在线。 |
| [Skill 指令](openquantum-skills-20260912.jpg) | 当前工作流目录、说明和加载策略；未修改 Skill 或运行领域任务。 |
| [微信对话](openquantum-wechat-chat.jpg) | 复用仓库此前已发布的渠道演示截图；不是本轮新发起的微信对话或计算验收。 |

本轮新增的四张截图直接取自真实应用，没有替换标志、修改界面文字、填造对话或合成计算结果。
原有 `openquantum-quantum-settings.jpg` 和 `openquantum-trajectory.jpg` 展示较早的组件组织方式，
其中量子基态仍标作 MCP Tool，因此本轮从首页撤下，文件保留供历史材料引用。

## 产品、架构与证据图

| 图片 | 可编辑图源 | 表达范围 |
| --- | --- | --- |
| [产品全景](openquantum-product-overview.png) | [HTML + SVG](../architecture/openquantum-product-overview.html) | 面向新用户展示入口、科研任务、量子学习通和可选择的工具、量子云与模型配置。分区表达产品归属，不表示所有入口都提供教学界面，也不把课程任务画成科研工具调用。 |
| [科研工作台架构](openquantum-platform-overview.png) | [HTML + SVG](../architecture/openquantum-platform-overview.html) | 科研入口、唯一通用 Runtime、Skill、原生 Tool Provider、Harness MCP Client、MCP Server、模型连接和 Session 日志。 |
| [科学证据流程](openquantum-evidence-flow.png) | [HTML + SVG](../architecture/openquantum-evidence-flow.html) | 计算结果、证据物化与重读、Validator observations，以及由 central Acceptance Builder 结合 Profile 与来源链推导验收。仅适用于已接入完整验收的能力。 |

产品全景新增于 2026-09-12 的 README 阅读顺序调整，以主线 `9fcadba647cf673a0fd78939823fed9e5203b838`
为事实基线；量子课程建设与在线 AI 教学验收仍按应用说明标明进度。该轮复用上方五张界面截图。

三图根据[架构总览](../README.md)、[扩展对象模型](../architecture/EXTENSION_MODEL.md)和
[科学验收契约](../architecture/ARCHITECTURE_AUDIT.md#6-qgs-参考纵切)整理，不是运行监控或性能图。
为便于首页阅读，省略非主线返回消息、具体配置行和内部函数；量子学习通独立的课程任务与数据
仍以[应用集成说明](../integrations/OPENMAIC.md)为准。

图示沿用 OpenQuantum 的品牌颜色；英文字体为 Inter 和 Instrument Serif，中文使用 macOS 的
PingFang SC / Songti SC 字体。PNG 按两倍尺寸导出，已检查文字边界、连线几何和实际渲染。
HTML 保留可编辑文字，其他系统会按字体栈使用可用的中文字体。
