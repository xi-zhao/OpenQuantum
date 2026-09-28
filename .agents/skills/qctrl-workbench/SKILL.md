---
name: qctrl-workbench
description: 使用 Q-CTRL Boulder Opal 构建单量子位分段控制图，或凭用户配置读取 Boulder Opal/Fire Opal 既有作业状态；明确本地准备与远程执行边界。
---

# Q-CTRL 控制图与作业状态

`qctrl_cloud` 默认关闭。用户按自己的厂商许可显式执行 `node scripts/setup-paper-tools.mjs qctrl-workbench`，
再启用连接。固定 Boulder Opal 6.1.0、Fire Opal 12.3.0；二者使用 [Q-CTRL 专有服务条款](https://q-ctrl.com/terms)。
OpenQuantum 提供适配，不复制上游 SDK 源码，不代用户申请账号或订阅。

- `prepare_boulder_opal_control` 用真实 `boulderopal.Graph` 构建分段常数 Hamiltonian 和终态传播子节点，返回官方格式 `graphJson`。
- 输入 `segments` 每项为 `omegaX`、`omegaY`、`detuning`，单位 rad/s。`durationSeconds` 是总时长，所有段等长。
  约定 `H/hbar = (omegaX X + omegaY Y + detuning Z)/2`。返回图的 `unitaries` 输出形状为 `[1, 2, 2]`。
- 图准备不计算传播子；`evaluated=false`。不得把序列化成功描述为动力学仿真或优化完成。
- `get_qctrl_job_status` 读取 `product=boulder-opal|fire-opal` 与数字字符串 `jobId` 对应的既有作业状态。
  `organizationSlug` 可以指定用户已有的组织；空字符串交由 SDK 在单一有权限组织时选择。
- 远程查询从 Harness 凭据引用读取 `QCTRL_API_KEY`，用户自行申请和配置。官方 SDK 执行 token 交换、组织/产品权限查询和一次状态查询。
  固定端点是 `https://federation-service.q-ctrl.com`；没有作业提交、取消、完成轮询或硬件控制。
- `requestTimeoutSeconds` 约束单次 HTTP，`execution` 约束整个 worker。关闭 SDK 导入时的 PyPI 升级查询、Fire Opal analytics、自动重试和重定向。
- 错误只报告类型及排查方向，不回传厂商错误正文或派生 token。账号、密钥和商业使用权限由用户自行处理。
- 当前 L1，`scientificValidation=not_evaluated`。本地成功及传输 fixture 不能证明服务已连通或作业结果科学有效。

参考：[Boulder Opal](https://docs.q-ctrl.com/boulder-opal/)、[非交互 API Key](https://docs.q-ctrl.com/boulder-opal/toolkit/discover/set-up/how-to-authenticate-using-an-api-key)、
[Fire Opal 既有作业查询](https://docs.q-ctrl.com/fire-opal/execute/submit-jobs/how-to-view-previous-jobs-and-retrieve-results)。
