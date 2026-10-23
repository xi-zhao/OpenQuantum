# MQT Bench 扩展语料 v2

固定 MQT Bench 2.3.0、Python 3.12 和独立依赖锁。21 个 ALG 电路覆盖 GHZ、QFT、Bernstein–Vazirani、W 态、Deutsch–Jozsa、Grover 与 QAOA，每种规模为 3、5、7。具体实际量子位数、门数、参数赋值、全局相位和 SHA-256 见 `manifest.json`。

生成器关闭随机参数，对符号参数按排序固定为 `0.17*(index+1)`；支持显式 seed 的电路使用 17。每例经过 OpenQASM 2 解析读回及完整酉矩阵的全局相位等价对照。测量被移除后才进行该对照。这是导出合同的工程检查，不是性能测量或最终科学验收。

```sh
uv sync --frozen --no-dev --project benchmarks/quantum-capabilities/corpora/v2 --python 3.12
uv run --frozen --project benchmarks/quantum-capabilities/corpora/v2 python benchmarks/quantum-capabilities/corpora/v2/generate.py > candidate.json
node --test benchmarks/quantum-capabilities/test/*.test.mjs
```

生成命令只输出候选 JSON，不覆盖已接受的语料。v1 的 MQT Bench 2.2.3 和三例分母保留；比较结果必须写明所用语料版本。
