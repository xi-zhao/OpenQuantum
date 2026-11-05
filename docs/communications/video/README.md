# OpenQuantum 宣传片与 README 动态横幅

这里是两段动态素材的源文件，全部由代码逐帧渲染，可以随时重新生成。

| 素材 | 规格 | 用途 |
| --- | --- | --- |
| 宣传片 | 母版 1920 × 1080，30 fps，78.6 秒，H.264 + AAC；GitHub 版 1280 × 720，不超过 10 MB | 母版用于 B 站、发布会；GitHub 版用于 README 附件。成片不放进仓库 |
| README 动态横幅 | 1200 × 600，15 fps，12 秒无缝循环 animated WebP，约 3 MB | `docs/images/readme/banner-motion.webp`，静帧 `banner.webp` |

## 结构

宣传片没有旁白，靠产品界面和仓库里的真实记录讲故事。节奏为 100 BPM，镜头切换都落在节拍上。

| 段落 | 时间 | 内容 |
| --- | --- | --- |
| 开场 | 0–12.0 s | 先出现 OpenQuantum 与「开源量子智能体平台」；让 AI 做科研，它却常常从零写起（Wigner 函数反复重写仍未跑通）；就算跑通了，结果能信吗；如果你的 AI 一开始就像资深研究员那样工作；OpenQuantum，把这些交到你的 AI 手中 |
| 提问与工作过程 | 12.0–24.6 s | 输入框里依次出现四个研究问题，最后打出主问题；选择 VQE，调用 `solve_and_validate_ground_state`，再用闭式精确解独立核对 |
| 结果 | 24.6–27.6 s | VQE −1.85727503 Ha，与独立精确参考一致，能量差 4.44 × 10⁻¹⁶ Ha，15 项本地计算检查通过、0 失败 |
| 四个字 | 27.6–30.6 s | 全面 · 高效 · 可信 · 开放，每拍一个词 |
| 全面 | 30.6–48.0 s | 186 个 Skill、91 个 MCP 服务连接、114 个环境；真实 Skill 卡片墙；按需准备；论文复现（薛定谔化） |
| 高效 | 48.0–56.4 s | QuTiP Wigner 函数 5.69×、PennyLane Pauli 对易子 5.09× 两组完整调用实测 |
| 可信 | 56.4–63.6 s | Lean 离线检查：4 个定理通过，错误命题被拒绝，含 sorry 的证明不计为完成 |
| 开放 | 63.6–73.2 s | 最近的 PR 动态、两种入口（Codex 插件与 Desktop） |
| 收尾 | 73.2–78.6 s | OpenQuantum，开源量子智能体平台；全面 · 高效 · 可信 · 开放 |

### 文案原则

- 这是对外的产品宣传片，主要面向希望上手 AI 科研的科研工作者，同时让投资人看到可靠与价值、让量子工具方愿意接入：先讲 AI 做科研的痛点，再讲产品能力，最后给出安装与接入的入口；用词保持克制、准确，写软件名、Skill 名、实测数字，少用空泛的大词和口号。
- 每一句都要经得起对照记录核对；不夸大适用范围，限定条件写在画面脚注里。
- 画面上的数字都能在下表的记录里找到；示意画面明确标注「示意」。

## 数据来源与边界

| 画面 | 数值 | 来源 | 边界 |
| --- | --- | --- | --- |
| 氢分子基态 | −1.85727503 Ha、4.44 × 10⁻¹⁶ Ha、112 次评估、15 项通过 | [2026-09-12 本地复验记录](../../examples/quantum-ground-state-local-demo-2026-09-12.json) | 输入 Hamiltonian 的系数与 [Qiskit 教程](https://qiskit-community.github.io/qiskit-algorithms/tutorials/03_vqe_simulation_with_noise.html)中由 Qiskit Nature 为 H₂ 计算的二量子位算符一致；能量为该算符的基态本征值。会话来源检查未执行，所以片中只写「本地计算检查」，不写「科学验收通过」 |
| 能力规模 | 186 个 Skill、91 个 MCP 服务连接、114 个 SDK/源码环境 | [根 README](../../../README.md#科研能力)，2026-11-02 | 数量会随版本变化，重新渲染时同步 |
| Skill 卡片墙 | 24 个 Skill 的标题、目录名与一句用途 | `.agents/skills/*/SKILL.md`，2026-11-02 | 用途是对各 Skill 描述的缩写；卡片只展示其中一部分 |
| Wigner 函数 | 171.77 → 30.18 ms，5.69×，6.52 × 10⁻¹⁶，272 项核对 | [QuTiP Rust 移植报告](../../../experiments/qutip-rust-wigner/README.md) | Apple M4、单线程、9 轮交错执行中位数；提速只对应所列输入 |
| Pauli 对易子 | 30.62 → 6.02 ms，5.09×，9 个输入逐项一致 | [PennyLane Rust 案例](../../../experiments/pennylane-rust-commutator/README.md) | 同上 |
| 薛定谔化 | 相对 L2 误差 4.1 × 10⁻⁴（8 × 512 维） | [2026-09-12 实验报告](../../../experiments/schrodingerization-heat1d/evidence/2026-09-12/report.md) | NumPy/SciPy 经典仿真原型，片中注明不声称量子加速 |
| Lean 证明 | `OpenQuantumProofs.lean` 的 4 个定理通过；错误命题以 exit 1 被拒绝；含 sorry 的证明不计为完成 | [2026-10-28 证据](../../integrations/evidence/lean-physics-2026-10-28.json)，[证明文件](../../../.agents/skills/lean-physics/OpenQuantumProofs.lean) | Lean 4.35.0、macOS arm64 CI；只构建了默认的 Pauli 依赖闭包；证明只覆盖文件中的定义、假设与公理；科学验证未评估 |
| PR 动态 | #54、#55、#67、#68、#74、#75、#76；自 2026-08-15 建库以来合并 64 个 PR | GitHub Pull requests，2026-11-02 | 标题按 PR 原文缩写 |
| 兼容平台 | IBM Qiskit、Google Stim、Microsoft QDK、NVIDIA CUDA-Q、AWS Braket | `.agents/skills` 中的对应 Skill 与 SDK 环境 | 指可在 OpenQuantum 中调用这些开源 SDK，不表示与相关公司有合作或认证 |

- 工作台是按 Desktop 界面重新绘制的示意，片中标注「界面示意」。
- 开场的「AI 从零实现 wigner()」代码是为片子写的示意，标注「示意」。
- 粒子、干涉条纹与光效是示意画面，不代表任何计算结果。
- 配乐由 `score.py` 用 numpy/scipy 合成，节拍点由 `stage.html` 导出的 `window.CUES` 决定，没有使用第三方音频素材。

## 重新生成

需要 Playwright（Chromium 或本地 Chrome）、Pillow、numpy、scipy，以及带 libx264 与 libwebp 的 ffmpeg。这些都不是项目依赖。

```bash
cd docs/communications/video
python3 render.py film /tmp/oq-film               # 分镜头编码、拼接、合成配乐，输出母版与 GitHub 版
ONLY=SKILLS python3 render.py film /tmp/oq-film   # 只重渲一个镜头，其余复用
python3 render.py edu /tmp/oq-edu                 # 教育平台版
python3 render.py hero /tmp/oq-hero               # 输出 banner-motion.webp 与 banner.webp
```

`CHROME` 环境变量可指定本地浏览器；`WEBP_Q`、`HERO_FPS`、`HERO_DPR` 可调整横幅的体积与清晰度。

## 教育平台版

面向 AI 教育平台的运营人员：说明接入 OpenQuantum 后，平台能为高校上线哪些专业的量子科研智能体，以及接入方式。`python3 render.py edu OUT_DIR` 生成，约 65 秒，规格与宣传片相同。

| 段落 | 时间 | 内容 |
| --- | --- | --- |
| 品牌 | 0–2.4 s | OpenQuantum · 开源量子智能体平台 · 面向 AI 教育平台 |
| 需求 | 2.4–8.4 s | 研究生：这篇论文的方法，能帮我复现吗？导师：能不能让学生直接用上专业的科研工具？→ 高校需要的，是专业的科研智能体 |
| 难点 | 8.4–13.2 s | 软件多、不专业、难核对；自己开发量子科研智能体需要专业团队、大量软件环境和长期维护 |
| 转折 | 13.2–15.6 s | 接入 OpenQuantum，你的平台就能上线专业的量子科研智能体 |
| 演示 | 15.6–30.0 s | 平台内的「量子化学计算助手」完成氢分子基态计算与独立核对 |
| 智能体 | 30.0–36.0 s | 量子化学计算、量子纠错实验、多体与动力学模拟、论文复现、形式化证明、算法与实验教学 |
| 能力 | 36.0–40.8 s | 186 个科研 Skill 与 114 个专业环境，真实 Skill 卡片墙 |
| 可信 | 40.8–45.6 s | 专业软件计算、独立方法交叉核对、Lean 机器证明 |
| 接入 | 45.6–54.0 s | 平台 ⇄ OpenQuantum，经 MCP 与 Skill 接入；持续更新；MIT 许可 |
| 价值 | 54.0–60.0 s | 多一整类专业的科研智能体 · 不用自建量子科研团队 · 专业、可复现、可核对 |
| 收尾 | 60.0–65.4 s | 开源量子智能体平台 · 为高校带来专业的量子科研智能体 |

边界：

- 演示窗口是示意界面，标注「界面示意」；数值与宣传片相同，取自 2026-09-12 本地复验记录。
- 六类智能体是平台方可以用 OpenQuantum 的 Skill 与工具组合出的形态，不是现成打包的产品，画面脚注写明。
- 「可商用」指 OpenQuantum 本身的 MIT 许可；第三方组件遵循各自许可，见 [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md)。
- 片中不出现合作方名称。

## 放进 README

GitHub 只会自动播放图片格式的动画，所以首屏用动态横幅。宣传片需要在 GitHub 网页上编辑 README，把 GitHub 版 MP4 拖进编辑框，GitHub 会生成一个 `user-attachments` 链接并显示播放器。免费账户的视频附件上限是 10 MB。
