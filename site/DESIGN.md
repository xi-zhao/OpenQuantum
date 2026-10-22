# 首页设计与核验

## 定位与方向

**OpenQuantum，共建可信的量子科研智能。** 主行动是开始使用，内容依次说明专业覆盖、专项优化、可核对的工作过程与开放共建。

使用 taste skill 2.1.4 的 **One motif**，seed **998590642**。OQ 标志的开放轨道成为页面的圆形母题，承载项目自己的 Wigner 输出；海军蓝、量子青、现有 Logo 和 Inter 延续品牌。
一句话概念：把真实计算放进 OpenQuantum 的共同轨道，让社区的专业积累成为下一次研究的起点。

从三个候选 Type and nothing else / One motif / The quiet instrument 中选择 One motif，因为它能容纳本项目的真实计算和鲜明品牌，不依赖虚构硬件照片。
按真实内容调整两个 section blueprint：合作 Logo 瓦片改为社区项目的分类文字索引；放大的产品开关改为原库与优化版的实际计时比较。
第一轮删除了难以辨认的行内缩略图，把完整产品画面保留在工作台段落。没有额外更换方向或随机重抽。

## 交互与素材

主要交互是 QuTiP / PennyLane 实测选择器：同时切换计时、速度比、输入条件、核对结论、真实图像与固定版本报告。初始展示 QuTiP；无脚本时显示两个完整案例。

页面使用项目已有资源：OpenQuantum OQ 标志；2026-10-13 的实际工作台和能力设置；QuTiP Wigner 原库、Rust 和逐点误差图；QuTiP 与 PennyLane 计时图。
来源逐项见 [README](README.md#资源来源)，完整构建保留 `provenance.json`。原图字节与源文件一致，CSS 只做展示裁切。
无图库图、生成图、虚构用户背书或待替换样例。图注标明科研内容或界面时间；社区项目链接原项目；页脚链接开源和组件许可。

动效采用一次图像展开、各段内容的短距离分层进入、控制反馈，以及真实相空间图的缓慢缩放。
仓库没有可用的实际操作视频；本版用真实计算图承担动态画面，因此保留 inspector 的一项 `no-footage` 提醒。引入无关量子硬件素材不能帮助解释这个软件平台。

## 最终核验

2026-10-22，本地 Chrome inspector 与 IAB 交互核验。页面不请求外部模型或量子云。

| 视口 | 结果 | 标题最长 | 实际运动元素 | 页面控制台错误 |
| --- | --- | --- | ---: | ---: |
| 1440 × 900 | 0 FAIL | 2 行 | 32 | 0 |
| 768 × 1024 | 0 FAIL | 2 行 | 32 | 0 |
| 390 × 844 | 0 FAIL | 2 行 | 33 | 0 |

所有最终 fold 与 page 截图均逐张查看。等宽外边距为桌面 32px、平板与手机 20px。
保留既有字体导致 source lint 的两项 Inter `default-font` 提醒，属于使用原有品牌字体的明确选择；无 lint FAIL。

实际浏览器操作通过：

- QuTiP / PennyLane 切换，同步显示 5.69× / 5.09× 及对应完整调用计时。
- 计时条件折叠与展开。
- 390px 目录展开、跳转后收起；Escape 关闭并返回目录焦点。
- Enter 操作案例按钮。
- 减少动态效果：0 个运行中的动画，滚动方式为 `auto`，内容可读且无横向溢出。
- 关闭 JavaScript 并刷新：两份案例完整显示，安装和报告均保留普通链接。
- 核验后恢复正常脚本、媒体偏好与原视口。

3 项自动检查通过：QuTiP 文案与原始测量一致；PennyLane 使用完整调用而非孤立内核计时；静态产物资源、原图字节与锚点完整。
新增 ESM 与相关测试通过 ESLint；`git diff --check` 通过。
预览服务的首页与资源分别返回 200；工作区 `.env` 为 404，目录穿越为 403，POST 为 405。
安装入口已读取实际 GitHub Release，`v0.8.4` 与 `codex-v0.8.4` 均存在且为非预发行版本。

## 最终图片审视

ROUND 2

Seen in one second: 共建可信的量子科研智能，巨大的 OQ 轨道中是一幅真实计算。

Idea (one sentence): OpenQuantum 的共同轨道让社区资源、优化计算和核对结果属于同一段研究过程。

Live thing: 选择 QuTiP 或 PennyLane，查看可核对的专项实测。

Layout words by section: hero=giant-cropped-Q / capabilities=statement-and-index / benchmark=comparison / workspace=inset-split / community=two-column / start=action-field / footer=wordmark

Scores: design 7.7 · usability 8.1 · creativity 7.5 · content 8.7 → overall 7.9

Caps applied: none。

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. mobile-page-01：完整科研对照图在窄屏不适合逐字阅读。已提供普通图片链接，点击可查看完整原图；正文写清最大误差和核对范围。
2. desktop-page-02：现有真实工作台截图处于新会话状态，能够证明入口，但不能充分展示完成一项研究的过程。后续可用经验证的真实科研操作录屏替换；本版保留截图日期和原始画面。
3. tablet-fold：相空间图的局部可视化需要图注才能被非专业读者辨认。当前图注明确写为 QuTiP Wigner 结果，实测区给出完整三图对照；不把纹理伪装成硬件或在线运行状态。

以上是素材表达力的余量，当前页面的阅读、入口、结果核对和响应式交互均已完成核验。
