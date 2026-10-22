# 首页设计与核验

## 定位与主参考

**OpenQuantum，共建可信的量子科研智能。把量子科研的专业积累，汇聚到一个 OpenQuantum。**

本轮由用户明确选择 [Google DeepMind 官网](https://deepmind.google/) 作为整页主参考，替代此前独立量子雕塑与深浅色段落交替的构图。不重新抽取随机方向，也不使用旧 seed 描述这一版。
2026-10-22 已实际查看其首屏、产品展示与科研内容区。本页参考它的连续浅色画布、居中品牌宣言、清楚的模块层级和统一留白；OpenQuantum 继续使用自己的品牌、文案、界面和科研证据。

一句话概念：量子波场中的共同空间，把社区的方法、研究工作台与可核对的结果连接为一个开放平台。

## 整页的统一方式

- 页顶导航、正文、共建邀请与页尾使用同一白色画布；浅灰模块承担内容分组，量子蓝集中于首屏。
- 首屏标题居中，浅蓝量子波场融入整个画面，不再把单独的金属球体当作展示物。
- 共享文字尺度、页面边距与圆角；1440px 正文左右各 72px，正文不超过 60ch。
- 科研能力之后先展示真实工作台，再进入实测成果，随后是开放共建与两种安装入口。
- 专业项目按研究方向分组并链接原项目；OpenQuantum 的筛选、适配、整合、优化与核对工作在正文直接说明。
- 实测模块将完整调用计时、提速和原始结果并排呈现，详细条件可以展开。手机按阅读顺序重排，保留完整证据入口。
- 两种安装入口收在一个浅灰行动区域，页尾沿用相同的品牌与文字比例。

三轮调整记录位于 `.taste-skill/deepmind-round-1-critique.md`、`.taste-skill/deepmind-round-2-critique.md` 与本页最终审视。之前的页面截图保存在 `.taste-skill/deepmind-before/`。

## 交互与素材

主要交互是 QuTiP / PennyLane 实测选择器：同步切换原库与 Rust 完整调用计时、提速、输入条件、核对结论和固定版本报告。无脚本时，两份案例都显示。

首屏概念图使用内置 **image_gen** 生成，保存为 [site/assets/quantum-field-v3.png](assets/quantum-field-v3.png)，1672 × 941、不透明背景。完整提示词与生成方式保存为 [site/assets/quantum-field-v3.prompt.txt](assets/quantum-field-v3.prompt.txt)。
它是量子波场的视觉概念，图注明确写为「概念视觉」，科研证据由下方原始结果和复跑报告提供。

其余资源沿用项目已有工作：OpenQuantum OQ 标志和 Inter 字体、2026-10-13 实际工作台与能力设置、QuTiP Wigner 结果及逐点误差图、QuTiP 和 PennyLane 原始计时图。
来源见 [README](README.md#资源来源)；所有导出图片按源文件原字节复制，`provenance.json` 记录源文件与固定案例版本。

波场有缓慢的平移缩放和轻微指针视差，内容分层进入，按钮和案例切换提供短促反馈。减少动态效果时取消 CSS 与脚本动画并复位视差。
当前没有适合本页的真实科研操作录屏，保留 inspector 的 `no-footage` 提醒。现有动效只呈现概念与交互反馈，真实计算由案例证据展示。

## 最终核验

2026-10-22，本地 Chrome inspector 与 IAB 操作核验。最终截图及报告位于 `.taste-skill/deepmind-final/`，已逐张查看全部三个尺寸的 fold 与 page 截图。

| 视口 | 标题最长 | 检测到的动态元素 | 左右边距 | 横向溢出 | 页面控制台错误 |
| --- | --- | ---: | --- | ---: | ---: |
| 1440 × 900 | 2 行 | 31 | 72px / 72px | 0 | 0 |
| 768 × 1024 | 2 行 | 28 | 28px / 28px | 0 | 0 |
| 390 × 844 | 2 行 | 31 | 24px / 24px | 0 | 0 |

inspector：**0 FAIL、1 WARN**，只保留上述无操作视频提醒。桌面页面约 4.9 屏，正文使用 6 个共享字号。
source lint：0 FAIL、2 WARN，均为沿用项目 Inter 字体的 `default-font` 提醒。

实际操作通过：

- 手机目录展开，跳转到优化实测后自动收起；Escape 关闭并返回目录焦点。
- Enter 切换 PennyLane，显示 30.62 ms → 6.02 ms、5.09× 及 9 个基准输入的核对范围。
- 展开计时条件，显示原版本、输入、预热、完整调用范围和专项限制；切回 QuTiP 显示 171.77 ms → 30.18 ms、5.69×。
- 指针进入首屏，波场产生小幅位移；启用减少动态效果后运行中动画为 0、视差复位且无横向溢出。
- 关闭 JavaScript 并刷新，两份案例及普通安装、报告链接仍完整显示。
- 核验后恢复脚本、媒体偏好与原视口，保留正常首页预览。

3 项自动检查通过：两份案例的显示值与固定原始数据一致、PennyLane 使用完整调用计时、静态资源与图片原字节及锚点完整。相关 JavaScript 通过 ESLint，`git diff --check` 通过。
页面不请求外部模型或量子云，未新增生产依赖；安装入口继续指向已核验存在的 `v0.8.4` 与 `codex-v0.8.4` 正式 Release。科学数据与原始界面没有重绘。

## 最终图片审视

ROUND 3

Seen in one second: 开阔的浅蓝量子波场中，一句清楚的 OpenQuantum 品牌宣言。

Idea (one sentence): 让社区专业积累、实际工作台与可核对的成果，在同一个开放的科研空间中相连。

Live thing: 两份真实案例可切换、展开条件与查看原图，首屏波场随指针轻微移动。

Layout words by section: hero=atmospheric-statement / capabilities=grouped-project-index / workspace=paired-product-media / benchmark=evidence-comparison / community=invitation / start=shared-action-field / footer=brand-and-links

Scores: design 8.1 · usability 8.3 · creativity 7.0 · content 8.7 → overall 8.0

Caps applied: creativity capped at 7 for adapting an explicitly selected reference framework; no unresolved inspector FAIL。

Top three remaining limits, with screenshot and response:

1. mobile-page-01：完整科学图在手机上仍不适合逐字阅读。保留点击原图与复跑报告，正文独立给出计时、输入与核对数字。
2. desktop-page-01：真实工作台截图是新会话状态，未展示完整研究过程。当前保留实际截图与日期，后续可换成经验证的科研操作录屏。
3. desktop-fold：概念波场表达量子气质，不承担执行能力的证明。图注明确概念性质，工作台与固定版本实测提供产品和计算证据。

本轮完成整页视觉与阅读关系的统一；后续最有价值的素材改进是一段真实研究过程，而不是继续增加装饰。
