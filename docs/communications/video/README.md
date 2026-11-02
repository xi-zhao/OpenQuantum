# OpenQuantum 宣传片与 README 动态横幅

这里是两段动态素材的源文件，全部由代码逐帧渲染，可以随时重新生成。

| 素材 | 规格 | 用途 |
| --- | --- | --- |
| 宣传片《从一个问题，到一个经得起核对的结果》 | 1920 × 1080，30 fps，19.2 秒，H.264 + AAC，约 9 MB | 上传到 GitHub README、B 站或发布会使用；成片不放进仓库 |
| README 动态横幅 | 1200 × 600，15 fps，12 秒无缝循环 animated WebP，约 3 MB | `docs/images/readme/banner-motion.webp`，静帧 `banner.webp` |

## 故事线

宣传片用产品界面讲一个故事，不用旁白：

1. 研究者在输入框里打出一个问题：求一个二量子位 Hamiltonian 在汉明权重 1 扇区的基态能量，并用独立方法核对。
2. 工作台依次显示 Agent 的工作：选择方法（VQE），调用 `solve_and_validate_ground_state`，再用闭式精确解独立核对。
3. 结果落在节拍上：VQE −1.85727503 Ha，与独立精确参考一致，能量差 4.44 × 10⁻¹⁶ Ha，15 项本地计算检查通过、0 失败。
4. 镜头拉远：「从一个问题，到一个经得起核对的结果」。
5. 品牌收尾：OpenQuantum，共建可信的量子科研智能。

## 内容边界

- 工作台是按 Desktop 界面重新绘制的示意，片中标注「界面示意」。
- 片中所有数值取自 [2026-09-12 本地复验记录](../../examples/quantum-ground-state-local-demo-2026-09-12.json)：评估 112 次、已收敛、15 项通过、0 失败。该记录的会话来源检查未执行，所以片中只写「本地计算检查」，不写「科学验收通过」。
- 横幅里的两项提速与误差来自首页实测案例，计时条件见 [QuTiP](../../../experiments/qutip-rust-wigner/README.md) 与 [PennyLane](../../../experiments/pennylane-rust-commutator/README.md) 的复跑报告。
- 粒子、干涉条纹与光效是示意画面，不代表任何计算结果。
- 配乐由 `score.py` 用 numpy/scipy 合成，没有使用第三方音频素材。

## 重新生成

需要 Playwright（Chromium 或本地 Chrome）、Pillow、numpy、scipy，以及带 libx264 与 libwebp 的 ffmpeg。这些都不是项目依赖。

```bash
cd docs/communications/video
python3 render.py film /tmp/oq-film    # 分镜头编码、拼接、合成配乐，输出 OpenQuantum-promo.mp4
python3 render.py hero /tmp/oq-hero    # 输出 banner-motion.webp 与 banner.webp
```

`CHROME` 环境变量可指定本地浏览器；`WEBP_Q`、`HERO_FPS`、`HERO_DPR` 可调整横幅的体积与清晰度。

## 放进 README

GitHub 只会自动播放图片格式的动画，所以首屏用动态横幅。宣传片 MP4 需要在 GitHub 网页上编辑 README，把文件拖进编辑框，GitHub 会生成一个 `user-attachments` 链接并显示播放器。免费账户的视频附件上限是 10 MB。
