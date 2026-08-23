# OpenQuantum 小红书三页介绍图 · 内容增强版

## 发布顺序

1. `exports/openquantum-xhs-01-overview-v2.png`：OpenQuantum 是什么，以及它给用户带来的四项核心价值；
2. `exports/openquantum-xhs-02-architecture-v2.png`：Skill、MCP/Tool、Validator 与 DeepSeek Harness 的真实关系，以及当前能力状态；
3. `exports/openquantum-xhs-03-experience-v2.png`：二量子位基态任务的执行轨迹、真实数值结果与独立科学验收。

三张图片均为 1080 × 1440 px、3:4 竖版。第二版把每一页组织成一个完整答案，优先保证
产品信息、架构边界和运行证据的可读性；第一版视觉稿仍保留在同一目录，便于对比和回溯。

## 内容依据

- 产品定位与当前接入能力：仓库 `README.md`；
- Skill、MCP/Tool、Validator、Harness 的边界：`docs/architecture/ARCHITECTURE_AUDIT.md`；
- 面向公开传播的产品表达：`docs/communications/openquantum-wechat-launch.md`；
- 基态任务数值与真实界面：`docs/images/openquantum-quantum-result.jpg`；
- 品牌标识：`packages/openquantum-web-branding/assets/icon-512.png`。

第二页明确区分“开启”“只读”“已接入但关闭”，避免把配置入口误写成当前可用能力。第三页同时呈现
运行完成和科学验收：MCP/Tool 产生结构化事实，Validator 重读证据并派生 Acceptance，模型不能自行改写结论。

## 可核验信息

- VQE 扇区基态能量：`-1.85727503 Ha`；
- 独立精确参考：`-1.85727503 Ha`；
- 绝对能量差：`4.44e-16 Ha`；
- 科学验收：16 项检查通过；
- 当前开启：Qiskit Circuits、Qiskit Docs、FieldQKit 只读、Ground State 本地能力；
- 已接入但关闭：TyxonQ Local、IBM / IonQ 云任务入口。

## 生成方式

第二版不使用生成模型绘制文字、图表或产品界面。所有中文、数字、结构连线、状态标识和版式均由
`scripts/render-openquantum-xhs.py` 使用 Pillow 确定性生成；第三页只裁入仓库中已有的真实运行截图。
`manifest-v2.json` 记录尺寸、文件大小、SHA-256 和来源文件。

## 重新导出

```bash
python3 scripts/render-openquantum-xhs.py --variant v2
```

脚本需要 Pillow 与系统内置中文字体，不修改真实截图、第一版背景或项目配置。
