# OpenQuantum 宣传片与 README 动态横幅

这里是两段动态素材的源文件，全部由代码逐帧渲染，可以随时重新生成。

| 素材 | 规格 | 用途 |
| --- | --- | --- |
| 宣传片 | 1920 × 1080，30 fps，57.6 秒，H.264 + AAC；母版约 33 MB，GitHub 版约 9.8 MB | 母版用于 B 站、发布会；GitHub 版用于 README 附件。成片不放进仓库 |
| README 动态横幅 | 1200 × 600，15 fps，12 秒无缝循环 animated WebP，约 3 MB | `docs/images/readme/banner-motion.webp`，静帧 `banner.webp` |

## 结构

宣传片用产品界面和真实记录讲故事，不用旁白。节奏为 100 BPM，镜头切换落在节拍上。

| 段落 | 时间 | 内容 |
| --- | --- | --- |
| 提问 | 0–7.2 s | 输入框里依次出现四个研究问题，最后打出主问题：计算氢分子的基态能量，并用独立方法核对 |
| 工作过程 | 7.2–12.6 s | 选择方法（VQE），调用 `solve_and_validate_ground_state`，再用闭式精确解独立核对 |
| 结果 | 12.6–15.6 s | VQE −1.85727503 Ha，与独立精确参考一致，能量差 4.44 × 10⁻¹⁶ Ha，15 项本地计算检查通过、0 失败 |
| 过渡 | 15.6–18.0 s | 「从化学到多体，从论文到证明」 |
| 四个案例 | 18.0–32.4 s | Wigner 函数、Pauli 对易子、薛定谔化论文复现、Lean 4 证明，每个 3.6 秒 |
| 功能 | 32.4–51.6 s | 汇聚社区软件、按需准备、两种入口、开源共建 |
| 收尾 | 51.6–57.6 s | OpenQuantum，共建可信的量子科研智能 |

## 数据来源与边界

| 画面 | 数值 | 来源 | 边界 |
| --- | --- | --- | --- |
| 氢分子基态 | −1.85727503 Ha、4.44 × 10⁻¹⁶ Ha、112 次评估、15 项通过 | [2026-09-12 本地复验记录](../../examples/quantum-ground-state-local-demo-2026-09-12.json) | 输入 Hamiltonian 的系数与 [Qiskit 教程](https://qiskit-community.github.io/qiskit-algorithms/tutorials/03_vqe_simulation_with_noise.html)中由 Qiskit Nature 为 H₂ 计算的二量子位算符一致；能量为该算符的基态本征值。会话来源检查未执行，所以片中只写「本地计算检查」，不写「科学验收通过」 |
| Wigner 函数 | 5.69×、6.52 × 10⁻¹⁶、272 项核对 | [QuTiP 复跑报告](../../../experiments/qutip-rust-wigner/README.md) | Apple M4、单线程、9 轮热运行中位数；提速只对应所列输入 |
| Pauli 对易子 | 5.09×、9 个输入逐项一致 | [PennyLane 复跑报告](../../../experiments/pennylane-rust-commutator/README.md) | 同上 |
| 薛定谔化 | 相对 L2 误差 4.1 × 10⁻⁴（8 × 512 维） | [2026-09-12 实验报告](../../../experiments/schrodingerization-heat1d/evidence/2026-09-12/report.md) | NumPy/SciPy 经典仿真原型，片中注明不声称量子加速 |
| Lean 4 证明 | 4 个定理通过，错误命题被拒绝，含 sorry 的证明不计为完成 | [2026-10-28 证据](../../integrations/evidence/lean-physics-2026-10-28.json) | 只构建了默认的 Pauli 依赖闭包；科学验证未评估 |
| 能力规模 | 186 个 Skill、91 个 MCP 服务连接、114 个 SDK/源码环境 | [根 README](../../../README.md#科研能力)，2026-11-02 | 数量会随版本变化，重新渲染时同步 |

- 工作台是按 Desktop 界面重新绘制的示意，片中标注「界面示意」。
- 粒子、干涉条纹与光效是示意画面，不代表任何计算结果。
- 配乐由 `score.py` 用 numpy/scipy 合成，节拍点由 `stage.html` 导出的 `window.CUES` 决定，没有使用第三方音频素材。

## 重新生成

需要 Playwright（Chromium 或本地 Chrome）、Pillow、numpy、scipy，以及带 libx264 与 libwebp 的 ffmpeg。这些都不是项目依赖。

```bash
cd docs/communications/video
python3 render.py film /tmp/oq-film               # 分镜头编码、拼接、合成配乐，输出母版与 GitHub 版
ONLY=REACH python3 render.py film /tmp/oq-film    # 只重渲一个镜头，其余复用
python3 render.py hero /tmp/oq-hero               # 输出 banner-motion.webp 与 banner.webp
```

`CHROME` 环境变量可指定本地浏览器；`WEBP_Q`、`HERO_FPS`、`HERO_DPR` 可调整横幅的体积与清晰度。

## 放进 README

GitHub 只会自动播放图片格式的动画，所以首屏用动态横幅。宣传片需要在 GitHub 网页上编辑 README，把 GitHub 版 MP4 拖进编辑框，GitHub 会生成一个 `user-attachments` 链接并显示播放器。免费账户的视频附件上限是 10 MB。
