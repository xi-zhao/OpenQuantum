# OpenQuantum 官网设计说明

## 定位与视觉节奏

**OpenQuantum，共建可信的量子科研智能。**

官网采用「浅色建筑纸白 + 单段黑曜石实算剧场」的高对比节奏：
- **页头与首屏**：磨砂玻璃顶栏 + 浅蓝量子波场（`quantum-field-v3.png`）+ 明确面向初次接触量子智能体用户的产品定义、双主按钮与真实规模条（194 Skills / 91 MCP / 122 锁定环境 / 11 项可回放科学验收）。
- **真实科研流程剧场（`#workflow`）**：以深海黑曜石表面承载 3 项来自本仓库的冻结实测记录（H₂ 分子基态 VQE 本机零密钥实跑 15 项通过 + `not_derived`、Stim + PyMatching 零噪声表面码 `0/1000` 与 95% Wilson 上界 `0.003827`、Lean 4 v4.35.0 `pauli_x_square` / `pauli_xy_commutator` 公理审计）与 1 项 MQT QCEC 验证契约示意，初始 HTML 全量可读、脚本就绪后启用标签切换。
- **可筛选科研生态（`#capabilities`）**：覆盖 6 大研究板块、122 个锁定环境语言分布与 49 项可运行算法例程，支持按研究方向一键筛选。
- **底层算子实测（`#benchmarks`）**：保留 QuTiP Wigner（`5.69×`、`6.52 × 10⁻¹⁶`、272 项核对）与 PennyLane Pauli 对易子（`5.09×`、9 组基准）的完整调用中位数、逐点误差图与可展开计时条件，且证据图取消懒加载避免首屏/滚动留白。
- **信任架构与诚实演进路线（`#architecture`）**：明确“跨宿主共享插件”“按需准备与凭据隔离”“执行完成 ≠ 科学验收”三大工程原则，以及已交付 / 演进中 / 长期愿景（明确标注 RSI 闭环尚未实现）三阶段。
- **双入口启动中心（`#start`）**：Codex 插件（含与 `README.md` 逐字对齐的一键复制安装请求）与 Desktop / 源码零密钥复算并列。

## 资源与约束

- 全部字体（`Inter`、`JetBrains Mono`）与图标均自托管于构建产物 `dist/homepage/assets/`，无外部字体 CDN 请求；`provenance.json` 记录全部源资源并经 `tests/homepage.test.mjs` 逐字节校验。
- 关闭 JavaScript 时，4 个案例面板、生态卡片、两份基准实测与安装文本均保持可读可用。
- 支持 `prefers-reduced-motion: reduce`、键盘 Tab / 方向键切换及桌面 / 平板 / 手机三端零横向溢出。
