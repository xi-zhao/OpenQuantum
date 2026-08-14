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

- Harness 同源网关、Session/interaction、权限和沙箱绕过；
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
