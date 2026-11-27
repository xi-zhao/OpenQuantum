# Quantum Metal 超导器件版图的 GDS 导出与独立读回

调研日期为 2026-11-27（北京时间）。候选发行包为 `quantum-metal==0.10.2`，Python 导入名为 `qiskit_metal`。上游标签 `v0.10.2` 指向提交 `aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d`。[官方仓库](https://github.com/qiskit-community/qiskit-metal) · [正式发行](https://github.com/qiskit-community/qiskit-metal/releases/tag/v0.10.2) · [发行包与校验值](https://pypi.org/pypi/quantum-metal/0.10.2/json)

## 谁需要这条路径

研究者已有 Quantum Metal 的 `QDesign`，希望把指定的 transmon 电容焊盘、约瑟夫森结和共面波导导出为另一套 CAD 软件可以核对的 GDSII 文件。OpenQuantum 主线 `54d22380efff952cb0c22a695fe2e8e2fbeb8c91` 已有 JosephsonCircuits，可以把电感、电容及其连接写成 SPICE 网表。网表没有焊盘坐标、掩模层和结单元的放置信息。这里的增量是把**已有的器件几何设计**交给版图读者，服务需要复用实际研究设计的团队。SQuADDS 的作者用 Qiskit Metal 生成超导器件设计，提供了独立团队使用这种输入的实例。该论文没有验证本候选版本的 GDS 输出。[产品能力](../../../README.md#科研能力) · [研究主线](../../roadmap/VISION.md) · [现有网表示例](../../../.agents/skills/josephson-circuits/references/native-example.jl) · [SQuADDS 论文](https://arxiv.org/abs/2312.13483v3)

对于从零画同一块芯片，KQCircuits 的参数化单元和 DeviceLayout.jl 都能产生 GDS。对已经选定 `TransmonPocket`、引脚和布线的设计，改走这两条路需要重建元件并核对坐标与连接。Quantum Metal 保留原设计的参数和元件语义，再把最终文件交给 KLayout 独立解析。此次优先评估这一交接，速度和仿真精度没有比较结论。[KQCircuits 参数化元件](https://iqm-finland.github.io/KQCircuits/getting_started/first_look.html) · [KQCircuits 掩模导出](https://iqm-finland.github.io/KQCircuits/_modules/kqcircuits/masks/mask_export.html) · [DeviceLayout.jl](https://github.com/aws-cqc/DeviceLayout.jl/blob/319b1f1715b647be465a7518c5fbed9c02845983/README.md)

## 为什么现在评估

固定发行已包含三个曾影响交接的修复。禁布区边缘曾留下切碎的接地面孔洞，`fabricate=True` 清理辅助单元时曾留下悬空引用，旧结模板路径曾依赖启动目录。仍有一个值得单独验证的行为。默认未传结文件时，导出器会警告并返回成功。上游显式加载结的回归依赖源码树中的示例文件。接入验收必须在**磁盘上的文件**中找到实际放置的结。以上是上游源码和回归证据，本轮只做调研。[修复记录](https://github.com/qiskit-community/qiskit-metal/pull/1235) · [修复已包含在固定发行中](https://github.com/qiskit-community/qiskit-metal/compare/3eb5b8b93672f2594ad6a0cc8a3ae4e724675c26...aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d) · [缺结与显式结文件回归](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/tests/test_gds_junction_file_default.py#L50-L87)

## 最小接入与维护成本

若核验通过，沿用共享 `quantum-sdk-workbench`，增加隔离的 Python SDK 清单项、一个可编辑示例和简短的 Skill 指南。示例用 `designs.DesignPlanar()` 构造设计，经 `design.renderers.gds.options.path_filename` 显式传入合成结文件，调用 `export_to_gds`。DSH 和 Codex 可共用这一份示例。KLayout 只在验证环境读取 GDS。原生 SDK 和标准文件已覆盖这两个接口。[共享 SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md) · [扩展模型](../../architecture/EXTENSION_MODEL.md) · [上游导出教程](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/docs/tut/3-Renderers/3.2-Export-your-design-to-GDS.ipynb)

上游源码与 wheel 声明 Apache-2.0，支持 Python 3.11–3.14。核心依赖含 gdstk、Shapely、GeoPandas、QuTiP 和 scqubits。维护成本主要是带原生依赖的环境锁、平台 wheel，以及升级后复核掩模极性与结模板约定。后续用无 GUI 的 CPU 环境记录安装时间和磁盘用量，独立读图可用 `klayout==0.30.14` 的 Python 3.12 wheel（GPL-3.0-or-later）。用自行构造的结形状，范围限于版图文件的几何交接。器件频率、相干性、代工厂设计规则及可流片性均需另外的证据。[上游许可](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/LICENSE.txt) · [核心依赖和可选后端](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/pyproject.toml) · [独立读图发行包](https://pypi.org/pypi/klayout/0.30.14/json)

## 接入时怎样验证

1. **固定输入及几何参考。** 在以原点为中心的 2 mm × 2 mm 芯片上放置方向为 0° 的 `TransmonPocket`。中心取 `(0, −400) µm`，焊盘宽 400 µm、高 80 µm、间隙 40 µm，故两块焊盘的中心应为 `(0, −340)` 和 `(0, −460) µm`。在独立层 `7/0` 的结模板中放入可区分方向的标记，原点取结中心，模板正 x 轴应映射为版图正 y 轴。另在第 1 层布一条从 `x = −0.5 mm` 到 `+0.5 mm`、`y = 24.5 µm` 的直波导，取中心线宽 10 µm、单侧缝宽 6 µm、方孔边长 25 µm、禁布缓冲 25 µm。孔阵列沿两轴每隔 100 µm 放置一个中心，起点由芯片边界内缩 200 µm 确定。由这些输入在 KLayout 或解析几何中独立构造波导中段的参考区域。[焊盘与结段的几何定义](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/src/qiskit_metal/qlibrary/qubits/transmon_pocket.py#L151-L192) · [结的旋转约定](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/src/qiskit_metal/renderers/renderer_gds/gds_renderer.py#L1789-L1818) · [触发孔洞缺陷的上游输入](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/tests/test_gds_cheese_keepout.py#L24-L76)
2. **从最终文件读回。** 同一输入保留诊断版图及显式指定极性的掩模文件。另一个进程用 KLayout `Layout.read` 从顶层沿引用遍历，记录数据库单位、层号和 datatype。按配置的 1 nm 网格检查焊盘边界、结中心及方向标记，预期恰有一个可达且非空的结实例。分别核对默认正掩模与第 1 层负掩模的材料区和开口区。默认正掩模须保留 `1/100` 的接地面图形，两份 `fabricate` 文件都应去除观察用的 `1/99` 并能解析所有单元引用。波导中段的禁布条带覆盖 (0, 0) µm 方孔的一部分，这个孔应整孔去掉。(−300, 200) µm 处远离器件，应保留完整的 25 µm 方孔。对最终掩模按极性读取对应的材料和空隙。[上游两种极性的回归](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/tests/test_gds_fabricate_references.py) · [层与 datatype 约定](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/docs/klayout.rst#L35-L58) · [KLayout 独立数据库接口](https://www.klayout.de/doc/programming/database_api.html)
3. **负对照与去留。** 省略结模板，验证读回检查能拒绝缺结的成品，即使导出返回成功。再用一份引用指向缺失单元的 GDS 检查读者能报告悬空引用。记录输入、输出文件摘要、实际几何差异及两项失败原因。若上述缺陷不能可靠检出，锁定版必须借助商业后端才能导出，或现有工作台已能从同一 `QDesign` 交付并核对同一文件，则退回观察。实施前的科学验收状态为 `not_evaluated`。
