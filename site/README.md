# OpenQuantum 产品介绍首页

定位：**共建可信的量子科研智能。把量子科研的专业积累，汇聚到一个 OpenQuantum。**

视觉方向、素材说明与最终浏览器核验见[首页设计与核验](DESIGN.md)。

使用原生 HTML、CSS 和浏览器 ESM，复用项目的 Logo、字体、实际界面和计算记录。构建不安装依赖、不连接模型或量子云。

```bash
npm run homepage:dev
```

打开 `http://127.0.0.1:4173`，支持 `-- --port 其他端口`。修改后重新运行构建，再刷新浏览器：

```bash
npm run homepage:build
```

构建产物为 `dist/homepage/`，包含页面、样式、交互、所需本地资源与 `provenance.json`，可整体交付静态托管。
预览服务仅监听本机，提供这个构建目录。科研工作台继续由原有 `npm run dev` 启动。

## 内容与交互

- 首页的 OQ 圆形轨道承载实际 QuTiP Wigner 输出；图注明确说明为结果局部。
- 社区项目按研究方向列出，名称直接链接原项目；能力目录链接 OpenQuantum README。
- QuTiP / PennyLane 选择器同步显示完整调用计时、输入条件、结果核对及固定版本复跑报告。没有 JavaScript 时，两份案例完整显示。
- 原生折叠面板提供详细计时条件。完整计算图和界面截图均可点击查看。
- 手机目录支持原生展开、选择后关闭与 Escape 关闭。动效遵循系统的减少动态效果设置；动画和观察器失败时正文保持可读。
- Codex 与 Desktop 分别链接实际 `codex-v0.8.4`、`v0.8.4` 发行页。更新安装版本时一并验证发布入口。

## 实测范围与原始证据

数字绑定已提交的 `9fa53e6523dee2c81380483b1aedb19819f218ac` 案例版本：

| 案例 | 原始文件 | 完整调用中位数 / Apple M4 |
| --- | --- | --- |
| QuTiP Wigner | [`summary.json`](../experiments/qutip-rust-wigner/results/summary.json) | 171.772125 → 30.183250 ms，5.690975× |
| PennyLane Pauli 对易子 | [`benchmark.json`](../experiments/pennylane-rust-commutator/results/benchmark.json)，`local-32q-pool512` | 30.621250 → 6.018459 ms，5.087889× |

页面显示保留两位小数，提速按未舍入的中位数计算。QuTiP 输入是 **64 维单模 Fock 空间**，PennyLane 输入是 **32 量子位**。
两项均为固定输入的热运行专项基准，包含输入转换与输出构造，不含环境准备、编译和结果核对。
案例中的输出核对不等同于 central Acceptance 的运行时科学验收；页面使用“核对”描述证据。

## 资源来源

构建脚本复制所需文件，保留原始字节，不重绘科研结果或修改界面文字：

| 页面素材 | 源文件 / 说明 |
| --- | --- |
| OQ 标志 | [`mark.svg`](../packages/openquantum-web-branding/assets/mark.svg)，现有 OpenQuantum 标志 |
| 科研工作台、分类设置 | [`docs/images/README.md`](../docs/images/README.md)，2026-10-13 实际原生界面 |
| Wigner 对照、QuTiP 计时 | [`QuTiP 实验`](../experiments/qutip-rust-wigner/README.md)，包含输入、原库/Rust/独立结果与误差 |
| PennyLane 计时 | [`PennyLane 实验`](../experiments/pennylane-rust-commutator/README.md)，包含全部九个输入规模 |
| 拉丁字体 | 既有 `public/openquantum/fonts/inter-latin.woff2`；中文使用系统无衬线字体 |

没有第三方图库图、虚构客户背书、模拟在线 AI 对话或待替换的样例内容。素材说明放在相关图注；项目和组件许可保留在页脚链接。

## 维护核验

```bash
node --test tests/homepage.test.mjs
```

检查页面数值与两份独立原始数据的一致性，以及可交付静态目录的资源和锚点完整性。
浏览器另外检查 1440、768、390px 的版式、案例切换、折叠条件、手机目录、键盘、减少动态效果与无脚本回退。
