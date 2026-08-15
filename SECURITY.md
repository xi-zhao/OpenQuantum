# Security Policy

## 支持范围

OpenQuantum 目前处于预发布开发阶段。安全修复应用于 `main` 的最新版本；尚未承诺旧提交、第三方 Fork、
自定义 Skill、MCP 或 `dsh-plugin` 获得回补。

## 私密报告

请不要在公开 Issue、PR、Discussion、日志或 Artifact 中披露漏洞细节、API Key、科研数据或可用攻击载荷。

优先使用仓库 **Security → Report a vulnerability** 的 GitHub Private Vulnerability Reporting。若仓库尚未启用该功能，
可创建一个不含漏洞细节的公开 Issue，请维护者提供私密联系渠道；在获得私密渠道前不要发送复现材料。

报告建议包含：

- 影响与攻击前提；
- 受影响版本、DeepSeek Harness 版本、Skill/MCP/Plugin 版本或 commit；
- 最小复现步骤；
- 是否涉及凭证、数据外发、沙箱逃逸或供应链；
- 已知缓解措施。

## 安全范围

我们关注但不限于：

- Harness Web Host、Session/interaction、权限和沙箱绕过；
- Skill、MCP 或 `dsh-plugin` 的依赖与供应链污染；
- Tool/MCP 未经声明的网络、文件、子进程或云资源访问；
- API Key、科研输入、Artifact 或来源链泄露；
- Result/Acceptance/Score/Reproduction 状态伪造；
- 模型路由、审批、取消和恢复中的越权；
- 默认配置导致的明文外发或不安全公开监听。

纯模型回答质量问题通常不是安全漏洞；如果它能绕过强制 Validator、权限、审批或伪造可信状态，则属于安全范围。

## 扩展代码

OpenQuantum 第一版不提供远程插件市场或自动安装。仓库内 stdio MCP 和 `dsh-plugin` 都是可信宿主代码，
必须在 Fork 中显式引入、锁定依赖并接受代码审查；`SKILL.md` 也不能代替 Harness 权限、Tool 输入校验或
科学 Validator。不要把任意用户提供的 MCP command、Cordis patch 或插件包直接装入正在运行的 Harness。

维护者会尽快确认报告、评估影响并协调修复与披露时间。我们不会要求研究者公开未修复漏洞来证明有效性。

## 官方 Qiskit MCP

默认 Qiskit Circuits 与 Docs 服务通过 `uvx` 从 PyPI 获取经过版本固定的上游包。它们仍属于第三方供应链，
升级时必须审查 Qiskit 官方源码、Tool schema、依赖和网络行为，并运行显式 MCP 探针。默认离线 CI 可设置
`OPENQUANTUM_DISABLE_QISKIT_MCP=1`，但产品 preset 的正常默认值保持开启。

IBM Runtime 与 Transpiler 默认关闭。只有用户在设置中心保存 `QISKIT_IBM_TOKEN` 并显式启用后，可信的
credential Adapter 才会在 Harness 启动时把 Token 注入对应 stdio 子进程。Token 不得进入项目配置、Session、
Artifact、日志或截图；云任务可能消耗配额或产生费用，启用服务不等于授权 Agent 任意提交高成本任务。

## 社区 Quantum Hardware MCP

`Lokesh-2025/quantum-hardware-mcp` 是可选社区连接器，不属于 OpenQuantum 或 Qiskit 官方组件。它默认关闭，
且必须先通过显式命令把固定 commit 安装到被 Git 忽略的 `.openquantum/external/` 后，设置中心才允许启用。
安装器验证源码 URL、完整 commit SHA、入口文件和本地来源标记；它不会静默覆盖已有目录，也不会跟随远程
分支更新。

该 MCP 作为本地 stdio 进程运行，拥有当前 Harness 进程可见的主机权限，并可访问外部云服务、提交或取消
真实任务、消耗配额或产生费用。Harness 会安全注入必需的 IBM 凭据及可选 IonQ 凭据，但当前没有对
第三方 MCP 的每个 Tool 提供通用参数级权限隔离。启用前必须审查固定源码、Python 依赖、Tool schema、
账户配额和云端权限；生产环境应使用最小权限、预算受限且可撤销的凭据。

设置中心允许项目所有者新增自定义 MCP，但不会自动下载或信任远程配置：新服务默认关闭，HTTP URL 禁止
内嵌用户名/密码，凭据只接受 Harness reference。启用自定义 `stdio` MCP 等同于授权其程序以 Harness
进程的本地权限运行；OpenQuantum 当前不提供独立容器隔离，因此不要运行来源不明的 command、包或脚本。
