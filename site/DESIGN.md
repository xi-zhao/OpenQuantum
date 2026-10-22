# 首页设计与核验

## 定位与视觉方向

**OpenQuantum，共建可信的量子科研智能。** 主行动是开始使用，内容依次说明专业覆盖、专项优化、可核对的工作过程与开放共建。

本轮按「科技范、量子感、精致」重新调整视觉。使用 taste skill 2.1.4 的 **The quiet instrument**，seed **240589583**，保留精密、安静的表达，采用宽幅文字与量子态几何并置的首屏。
方向候选为 Dense tiles、Type-only statement、The quiet instrument；选择后者，因为它能承载专业内容，同时留出图形与文字的呼吸空间。
按真实产品内容调整蓝图：中置导航改为清楚的页顶导航，窄栏改为适合科学对照的宽幅布局，虚构应用状态改为真实界面截图与两份专项实测。

一句话概念：用有秩序的量子态几何，把社区的专业积累、计算与可核对的结果连接起来。

上一版的大块青色与巨型 Q 裁切改为深海军蓝、银白材质和少量冷青色。1440px 首屏标题由 84.1px / 600 字重调整为 66.2px / 400；加宽页面边距，简化按钮，真实产品画面恢复完整矩形展示。
平板收回图形负边距，手机缩小概念图并压缩首屏间距，使完整图形及图注进入首屏。手机案例标题保留 20px，避免被读成细小标签。

## 交互与素材

主要交互是 QuTiP / PennyLane 实测选择器：同时切换计时、速度比、输入条件、核对结论、真实图像与固定版本报告。初始展示 QuTiP；无脚本时显示两个完整案例。

首屏概念图采用内置 **image_gen** 生成，保存为 [site/assets/quantum-state-v2.png](assets/quantum-state-v2.png)，1254 × 1254、透明背景。完整生成提示词保存在 [site/assets/quantum-state-v2.prompt.txt](assets/quantum-state-v2.prompt.txt)。
银白与石英质感的球面轨道、波面和冷青色路径表达量子态几何；图注写明「概念视觉」。这幅图不承担硬件、实验结果或在线运行状态的证明。

其余资源来自项目既有工作：OpenQuantum OQ 标志；2026-10-13 的实际工作台和能力设置；QuTiP Wigner 原库、Rust 和逐点误差图；QuTiP 与 PennyLane 计时图。
来源逐项见 [README](README.md#资源来源)，构建保留 `provenance.json`。生成素材与既有图片均按源文件原字节复制；社区项目链接原项目，页脚链接开源和组件许可。

概念图有缓慢的小幅浮动与指针视差，内容分层进入，案例切换提供短促反馈。减少动态效果时停止 CSS 与进行中的脚本动画，复位视差，保留完整内容。
仓库没有适合本页的真实操作录屏，因此保留 inspector 的一项 `no-footage` 提醒；概念运动与真实结果图足以支撑当前内容，不补无关硬件视频。

## 最终核验

2026-10-22，本地 Chrome inspector 与 IAB 交互核验。页面不请求外部模型或量子云。

| 视口 | 结果 | 标题最长 | 检测到的动态元素 | 页面控制台错误 | 左右边距 |
| --- | --- | --- | ---: | ---: | --- |
| 1440 × 900 | 0 FAIL | 2 行 | 32 | 0 | 79px / 79px |
| 768 × 1024 | 0 FAIL | 2 行 | 28 | 0 | 28px / 28px |
| 390 × 844 | 0 FAIL | 2 行 | 32 | 0 | 24px / 24px |

最终 fold 与 page 截图均逐张查看，记录位于 `.taste-skill/refinement-final/`。inspector 共 0 FAIL、1 WARN（上述无操作视频提醒）。
source lint 为 0 FAIL、2 WARN：两项 Inter `default-font` 提醒来自沿用既有品牌字体的明确选择。

实际浏览器操作通过：

- QuTiP / PennyLane 切换，同步显示 5.69× / 5.09× 及对应完整调用计时；Enter 可操作案例按钮。
- 计时条件展开后，展示输入、版本、预热次数、计时范围与固定规模限制。
- 390px 目录展开、跳转后收起；Escape 关闭并返回目录焦点。
- 指针进入概念图会改变小幅视差角度；切换减少动态效果后，0 个运行中动画、视差复位且无横向溢出。
- 关闭 JavaScript 并刷新，两份案例均完整显示，安装和报告保留普通链接。
- 核验后恢复正常脚本、媒体偏好与原视口，并保留首页预览。

3 项自动检查通过：QuTiP 文案与原始测量一致；PennyLane 使用完整调用而非孤立内核计时；静态资源、图片原字节与锚点完整。相关 JavaScript 通过 ESLint，`git diff --check` 通过。
预览服务此前核验：首页与资源分别返回 200；工作区 `.env` 为 404，目录穿越为 403，POST 为 405。服务实现本轮未改动。
安装入口指向已核验存在的 `v0.8.4` 与 `codex-v0.8.4` 正式 Release。

## 最终图片审视

ROUND 2

Seen in one second: 深海军蓝上的银白量子态几何，清晰而克制的品牌宣言。

Idea (one sentence): 精密的共同几何连接社区专业积累与可核对的研究过程。

Live thing: 选择 QuTiP 或 PennyLane 查看专项实测，首屏几何随指针轻微变化。

Layout words by section: hero=scientific-object-and-type / capabilities=editorial-index / benchmark=comparison / workspace=actual-interface / community=invitation / start=quiet-dark-close / footer=wordmark

Scores: design 8.1 · usability 8.2 · creativity 7.6 · content 8.7 → overall 8.1

Caps applied: none。

Top three remaining limits, with screenshot and response:

1. mobile-page-01：科学对照图缩小后不适合逐字阅读。保留普通图片链接以查看完整原图，正文写清最大误差和核对范围。
2. desktop-page-02：现有真实工作台画面处于新会话状态，不能充分展示一项研究的完整过程。当前保留原图与日期，后续可换为经验证的真实科研录屏。
3. desktop-fold：首屏概念图传递量子气质，无法证明执行能力。图注明确概念性质；紧接的实测区承担输入、计时、结果与复跑证据。

当前页面的阅读、入口、结果核对与响应式交互已完成核验；以上保留为素材表达力的后续改进空间。
