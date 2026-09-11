# 实验输入

下面是 Tool 的 JSON 参数，不是需要 Skill 自行运行的脚本。Harness 中完整工具名带
`mcp__fatqat_local__` 前缀。

## Bell 态：精确概率与抽样

`simulate_fatqat_circuit`：

```json
{
  "backend": "general",
  "numQubits": 2,
  "operations": [{"gate":"h","qubits":[0]}, {"gate":"cx","qubits":[0,1]}],
  "shots": 1024,
  "seed": 7
}
```

无噪声精确概率应为 00、11 各 1/2，采样频数通常不完全相等。可在同一输入添加
`"noise":{"channel":"depolarizing","probability":0.02}` 比较门后局部噪声。

## 超导原生门与连接检查

`simulate_fatqat_circuit`，原生 X 准备 |11〉，CZ 改变相位：

```json
{
  "backend": "superconducting", "numQubits": 2, "couplings": [[0,1]],
  "operations": [{"gate":"x","qubits":[0]}, {"gate":"x","qubits":[1]}, {"gate":"cz","qubits":[0,1]}],
  "shots": 0
}
```

去掉连接边后同一 CZ 请求应失败。计数不能区分全局相位；相位比较使用态矢和干涉电路。
该 profile 的原生集是 X/SX/RZ/CZ，不能直接提交 H/CX。

## 原子阵列的配对

`simulate_fatqat_circuit`，初始全部已加载：

```json
{
  "backend": "atom_array", "numQubits": 2,
  "operations": [{"gate":"pair","qubits":[0,1]}, {"gate":"rx","qubits":[0],"angle":3.141592653589793}, {"gate":"cz","qubits":[0,1]}, {"gate":"unpair","qubits":[0,1]}],
  "shots": 128, "seed": 7
}
```

## Transmon 驱动与泄漏

`simulate_fatqat_dynamics`：

```json
{"model":"transmon","durationNs":20,"amplitudeRadPerNs":0.15707963267948966,"target":0,"phaseRad":0,"samples":21}
```

这是一个 π 面积恒定驱动的参考模型实验，实际三能级结果由数值演化决定。`sitePopulations[t][0][2]`
表示 q0 泄漏人口；不能把它与 q1 的激发概率混淆。

## Rydberg Rabi 与相互作用

`simulate_fatqat_dynamics`：

```json
{"model":"rydberg","numAtoms":1,"spacingUm":6,"durationUs":3.141592653589793,"omegaRadPerUs":1,"detuningRadPerUs":0,"c6RadPerUsUm6":0,"samples":21}
```

一原子无失谐的解析基准是 P(r,t)=sin²(Ωt/2)。研究相互作用时可改为两个原子，并对比
C6=0 与带明确单位的非零 C6，保持其他参数相同。一原子实验不包含原子间相互作用。

## 上游资源与版本

固定源：[spaceqat/fatqat@39b75e30](https://github.com/spaceqat/fatqat/tree/39b75e30ae50ddb4a8c7b840847edce678aa814c)。
教程位于上游 `docs/mkdocs/tutorial-sources/en/`，有 Bell、VQE、QAOA、QNN、GHZ、反铁磁链、PXP 与电力系统案例。
这些是拓展教学材料；案例中超出当前 Tool 输入合同的部分，不可声称已经自动接入或生成课程。
