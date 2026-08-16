# OpenQuantum 品牌资产

- 产品名统一写作 `OpenQuantum`；内部包名、路径和协议标识可以使用小写 `openquantum`。
- 中文主标语是“探索开放量子世界”；英文对应为 “Explore the open quantum world”。
- `mark.svg` 是唯一主标源文件，表现为深色圆角底上的绿色 Q 标记。
- `icon-192.png` 是从 `mark.svg` 机械生成的 192 × 192 应用图标，不单独设计或修改。

Harness Web 品牌插件会把同一主标用于侧栏、首页、favicon 和 Web App manifest。修改品牌时，先改
`runtime/openquantum/web-branding/identity.mjs` 与 `mark.svg`，再重新生成 PNG 并运行品牌测试。
