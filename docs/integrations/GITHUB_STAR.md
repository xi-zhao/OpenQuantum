# 设置页内的 GitHub Star

状态：0.7.8 本地候选。代码与模拟授权流程可验证；尚未配置真实 GitHub App Client ID，
没有完成真实账号授权、Star 或新版 Codex 全局入口验收。当前已安装版本仍为 0.7.7。

## 用户体验

用户点击「给 OpenQuantum 点个 Star」，使用自己的 GitHub 账号支持 `xi-zhao/OpenQuantum`。
本机已有有效的 OpenQuantum 授权时，直接提交 Star 并显示结果；尚未授权时，显示验证码并打开
GitHub 的设备授权页面。用户确认后，原页面自动完成这一次点击，无需再去仓库点 Star。
打开设置页、刷新状态、安装插件不会自动授权或点 Star。GitHub 已登录可以省去重复登录，
但 Codex 的 GitHub 连接器授权不等于 OpenQuantum 的授权，当前没有可复用的 Star 接口。

取消、原页面关闭或 MCP 连接关闭会停止后续提交。已经发出的请求不能承诺撤回；只有 GitHub
返回 204 才显示成功。失败后用户可刷新实际状态，再决定是否重试。页面不会用取消 Star 补偿失败。

## 项目维护者的一次性注册

注册一个由项目维护的 GitHub App，普通插件用户不需要注册 App，也不需要填写 Client ID 或 Token。
以下是可审阅的注册配置；名称需要在 GitHub 上唯一，如已占用可加项目组织名称。

| 注册字段 | 建议值 |
| --- | --- |
| GitHub App name | `OpenQuantum Support` |
| Description | `Let users support xi-zhao/OpenQuantum with a GitHub Star from OpenQuantum settings.` |
| Homepage URL | `https://github.com/xi-zhao/OpenQuantum` |
| Enable Device Flow | 开启 |
| Expire user authorization tokens | 保持开启 |
| Callback URL / Setup URL | 留空，设备授权流程不使用回调 |
| Request user authorization during installation | 关闭，用户主动点 Star 时才发起授权 |
| Webhook Active | 关闭，本功能不使用 webhook |
| Account permissions → Starring | Read & write |
| Repository permissions → Metadata | Read-only |
| 其他权限 | No access |
| Where can this GitHub App be installed? | Any account |

注册入口：[GitHub Apps](https://github.com/settings/apps)。具体字段见
[GitHub 注册说明](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)。
授权使用 [GitHub App device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)。
权限与成功状态以 [Star API](https://docs.github.com/en/rest/activity/starring#star-a-repository-for-the-authenticated-user) 为准。

注册后将公开的 **Client ID** 写入 `runtime/chatgpt/github-app.json` 的 `clientId` 字段，再构建插件。
Client ID 与 App ID 不同。这个文件不允许放 Client Secret、私钥或用户 Token；设备授权流程不需要它们。
开发联调可通过环境变量 `OPENQUANTUM_GITHUB_CLIENT_ID` 覆盖公开 Client ID。
未配置时，原地 Star 按钮不可用，页面保留 GitHub 仓库链接；量子能力设置不受影响。

## 权限与凭据边界

- Starring 是 GitHub 账号级权限，GitHub 没有把此权限限定到单个仓库。本插件在服务端固定仓库、
  方法和 GitHub 地址，拒绝由页面指定其他仓库、URL、Token 或权限范围。授权文案不宣称 GitHub 提供单仓库 Star 权限。
- 只有 app-only 设置命令提供此操作，不增加模型可见的 GitHub Tool。UI 通过宿主调用本插件的
  Application Interface；UI 不直接访问 GitHub API。
- `device_code` 仅保存在内存中；页面只接收用户验证码、固定授权地址及状态。Access Token
  只写入系统凭据库中按 Client ID 隔离的条目，不经过 MCP 参数/结果、设置文件、浏览器存储或日志。
- 当前只保留短期 Access Token，最多使用 8 小时；Refresh Token 不保留，过期后需再次授权。
  GitHub 支持设备授权 Token 刷新，本候选尚未实现刷新；并非平台不支持。
- 「断开授权」只删除本设备保存的授权，不取消 Star，也不撤销 GitHub 上的 App 授权。
  要完全撤销，用户需到 GitHub Settings → Applications → Authorized GitHub Apps 操作。
- 「取消此次 Star」不会回滚已经完成并保存的 GitHub 授权；显式断开才删除本机记录，避免取消时
  误删另一插件进程刚保存的授权。多个窗口共享同一 Client ID 的本机凭据，提交前会再次核对账号。

## 验证与后续联调

合同与交互控制测试：`node --test tests/codex-plugin-github-star.test.mjs`。
回归：`npm run plugin:test`，构建：`npm run plugin:build`。
单元测试使用内存凭据和受控 HTTP 响应，不构成真实 GitHub 或系统凭据库验收。

真实 Client ID 配置后，仍需分别验证：项目维护者与另一位自愿测试用户的首次授权、已有授权点 Star、
授权拒绝/撤销/过期、取消与关闭，以及 Codex 左侧全局入口的显示与开窗。Star 测试会改变测试账号的
公开 Star 状态，执行前须明确测试账号和动作；不能把模拟成功写成真实用户已经可用。
