# OpenQuantum 品牌资产

- 产品名统一写作 `OpenQuantum`；内部包名、路径和协议标识可以使用小写 `openquantum`。
- 中文主标语是“量子计算，就在指尖”；英文对应为 “Quantum computing, right at your fingertips”。
- `mark.svg` 是独立 OQ 图标的主源文件；深海军蓝 O、量子青轨道和紫色节点共同表达开放连接的量子工具平台。
- `lockup.svg` 是横版主 Logo；`mark-inverse.svg` 与 `lockup-inverse.svg` 用于深色背景。
- `icon-192.png` 与 `icon-512.png` 都从 `mark.svg` 机械生成，不单独设计或修改。

Harness Web 品牌插件会把同一主标用于侧栏、首页、favicon 和 Web App manifest。修改品牌时，先改
`runtime/openquantum/web-branding/identity.mjs`、`mark.svg` 与 `lockup.svg`，再重新生成 PNG 并运行品牌测试。
