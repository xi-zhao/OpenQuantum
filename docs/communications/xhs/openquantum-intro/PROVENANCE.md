# OpenQuantum 小红书三页介绍图

## 发布顺序

1. `exports/openquantum-xhs-01-cover.png`：产品定位与核心价值；
2. `exports/openquantum-xhs-02-capabilities.png`：真实工具、真实设置界面与能力边界；
3. `exports/openquantum-xhs-03-trust.png`：真实运行结果、执行轨迹与独立科学验收。

三张图片均为 1080 × 1440 px、3:4 竖版。中文、品牌标识、数字、真实截图和安全边距由
`scripts/render-openquantum-xhs.py` 确定性排版；生成模型只负责无文字背景视觉。

## 事实来源

- 产品定位、能力与边界：仓库 `README.md` 与 `docs/architecture/ARCHITECTURE_AUDIT.md`；
- 设置界面：`docs/images/openquantum-quantum-settings.jpg`；
- 科学验收结果：`docs/images/openquantum-quantum-result.jpg`；
- 品牌标识：`public/openquantum/icon-512.png`；
- 版式参考：[RedInk](https://github.com/HisMax/RedInk) 的竖版连续图、强标题和统一视觉节奏。

没有复制 RedInk 的示例图片、源代码或品牌资产。

## 生成方式

背景使用 Codex 内置 ImageGen 分别生成。最终发布图由本地脚本合成，确保中文、数值、Logo 与真实产品界面
不被图像模型改写。`manifest.json` 记录最终尺寸、文件大小、SHA-256 与所有来源文件。

## 最终提示词

### 01 封面背景

```text
Use case: stylized-concept
Asset type: premium 3:4 vertical Xiaohongshu cover background illustration for OpenQuantum; background only, with later typography added separately
Primary request: Create an original, restrained editorial technology illustration expressing an open-source scientific-agent platform through the visual idea of “quantum gate + wavefunction + connected tool nodes.” It should feel credible, precise, modern, and research-oriented rather than flashy sci-fi.
Scene/backdrop: deep navy architectural space with subtle depth, faint technical grid traces and soft atmospheric gradients; no outer space, no planets, no stars
Subject: in the lower half, a refined open quantum portal shaped as a minimal dark metal gate frame; two luminous wavefunction ribbons, one cyan and one blue-to-purple, travel through the open gate and branch into several small, elegant connected tool nodes; the network looks modular and open, with thin precise connectors and varied but disciplined node forms
Style/medium: high-end 3D editorial illustration blended with clean scientific visualization; crisp geometry, premium matte metal and translucent glass, subtle bloom, controlled detail, believable lighting; not a logo and not an infographic
Composition/framing: exact portrait 3:4 canvas; keep the upper approximately 40% as clean uninterrupted dark negative space suitable for later headline typography; concentrate the portal, wave ribbons, and nodes in the lower 55%, with the visual center slightly below the middle; retain safe margins; strong hierarchy and plenty of breathing room
Lighting/mood: quiet confidence, intelligent, open, trustworthy; soft cyan rim light and restrained violet accents; no dramatic explosions
Color palette: OpenQuantum-inspired midnight navy and near-black, luminous cyan/teal, electric blue, restrained violet; avoid rainbow colors
Materials/textures: matte graphite portal, translucent glass-like wave ribbons, delicate emissive node edges, extremely subtle circuit-line texture in the background
Constraints: absolutely no text, no letters, no numbers, no logo, no UI screenshot, no app panels, no readable symbols, no watermark; clean top 40% negative space must remain free of objects; portal and network must stay in the lower half; original composition that only carries the reference concept, not its exact logo layout
Avoid: people, hands, faces, astronauts, spaceships, planets, galaxies, atom icons, glowing quantum spheres, circuit-board cliché, dense dashboards, generic crypto imagery, cartoon style, excessive neon, clutter, lens flare, illegible pseudo-text, branding marks
```

### 02 能力页背景

```text
Use case: stylized-concept
Asset type: Xiaohongshu carousel page background, page 2 capability showcase, true 3:4 vertical portrait canvas
Primary request: Create a premium, text-free background illustration for a mature quantum research software product. It will later receive a real product screenshot and capability labels, so it must function as a refined supporting stage, not as a standalone interface.
Scene/backdrop: Warm mist-white to very pale blue atmospheric background with subtle paper-soft grain and a calm studio glow.
Subject: Along the outer margins only, elegant abstract modular quantum-computing elements: a few navy geometric circuit rails, small cyan and violet backend nodes, translucent scientific modules, fine tool-connection threads, and restrained orbital/entanglement curves. These are abstract environmental motifs only, never an actual circuit diagram and never a software interface.
Style/medium: High-end editorial product illustration with restrained soft 3D depth, matte translucent materials, precise geometry, refined scientific software branding, sophisticated and trustworthy.
Composition/framing: Strict 3:4 portrait. Keep the top 28% exceptionally clear, bright, quiet, and uncluttered for a future headline. In the middle and lower area, preserve one large, clean, uninterrupted pale stage for a future real product screenshot; suggest it only through a broad soft luminous plane and very subtle shadow, with no screen, no device, no window, no panels, and no UI components. Place all decorative modules and connection lines around the left, right, and lower outer edges, lightly framing the empty stage without entering its central area. Strong visual hierarchy, generous negative space, balanced asymmetry, safe margins.
Lighting/mood: Soft diffused daylight, gentle depth, calm confidence, premium scientific clarity; bright rather than dark.
Color palette: Mist white and pale powder blue dominate; controlled accents of deep navy blue, clean cyan, and muted violet.
Materials/textures: Frosted glass-like translucency, matte ceramic geometry, hairline luminous connections, very subtle paper texture.
Text: none.
Constraints: absolutely no letters, words, numbers, mathematical notation, labels, logo, watermark, QR code, trademark, readable symbols, screens, app windows, browser frames, dashboards, charts, cards, buttons, or fictional/real UI. No human figures. Preserve a completely usable clean headline area at the top and a large clean screenshot stage in the middle-lower area.
Avoid: cyberpunk, neon overload, black background, dramatic sci-fi, childish illustration, cartoon look, clutter, dense circuitry, fake interface, perspective device mockup, HUD graphics, typography, glyphs, icons that resemble letters.
```

顶部净空修正：

```text
Change only the top headline zone. Remove every decorative object, orbital ring, sphere, node, module, line, and dark patch from the entire top 28% of the canvas. Seamlessly extend the warm mist-white and very pale blue softly illuminated background into that area. Keep everything below unchanged; add no text, logo, watermark, symbols, screens, UI, or new objects.
```

### 03 可信科研页背景

```text
Use case: stylized-concept
Asset type: third background image in a premium vertical 3:4 Xiaohongshu product introduction carousel for a trustworthy scientific-agent platform.
Primary request: Create a restrained, high-end abstract scientific illustration that communicates auditable research. Show two clearly independent yet coordinated trajectories: one cyan trajectory represents the execution trace, with orderly discrete event-like pulses, linked points, and precise forward motion; one violet trajectory represents scientific validation, with calibrated checkpoints, measurement rings, and subtle analytical wave patterns. The two paths remain visually distinct throughout, then enter the lower half from different directions and jointly resolve into one transparent, crystal-like evidence vessel / trusted-result container — a clean sculptural glass capsule or faceted chamber, not a screen, not a shield, and with no symbol or lettering inside.
Scene/backdrop: deep ocean navy field with subtle layered depth, faint scientific-grid geometry and sparse microscopic particles only in the middle and lower regions.
Style/medium: polished editorial technology illustration, sophisticated 3D glass and luminous linework, precise scientific visualization language, calm and credible, visually auditable rather than mystical.
Composition/framing: exact vertical 3:4 composition. Keep the upper approximately 30% as clean, uncluttered deep-navy negative space for a title overlay. Put the two trajectories across the middle third and the transparent result vessel in the lower third. Maintain useful open areas in the center and lower region where a real results screenshot can later be overlaid; avoid filling the whole frame with detail. Clear hierarchy, generous spacing, balanced vertical flow.
Lighting/mood: controlled low-key illumination, subtle cyan and violet glow, crisp edges, premium restrained contrast, scientific trust and quiet confidence.
Color palette: deep ocean navy, cyan/teal, ultraviolet purple, with very limited cool white highlights.
Materials/textures: optical glass, fine luminous filaments, delicate volumetric haze, subtle matte background grain.
Text: none.
Constraints: background artwork only; no logo; no UI; no screens; no browser windows; no charts with labels; no readable characters; no typography; no watermark. The two trajectories must be visibly separate before their shared lower-half convergence. Preserve the clean top 30% title space.
Avoid: people, hands, faces, robots, padlocks, shields, cybersecurity clichés, checkmarks, badges, stamps with symbols, blockchain visuals, exaggerated outer space, planets, galaxies, rockets, fantasy nebulae, loud neon overload, busy circuitry, clutter, stock-photo aesthetics.
```

## 重新导出

```bash
python3 scripts/render-openquantum-xhs.py --variant v1
```

脚本需要 Pillow 与系统内置中文字体；不会修改生成背景或项目截图。

本版保留为第一版视觉档案。当前建议发布的内容增强版见 `PROVENANCE-v2.md`。
