# 量子学习通 · OpenMAIC 原版 UI

量子学习通直接嵌入 [OpenMAIC 官方应用](https://github.com/THU-MAIC/OpenMAIC) 的原版首页、课程库、课堂、
练习和课件编辑器。OpenQuantum 只提供入口、返回按钮和建课会话连接，不再维护另一套课堂界面。

## 使用

```sh
npm install
npm run learning:ui:setup
npm run dev
```

从 `http://localhost:3000` 侧栏打开「量子学习通」。首次点击会启动原版 Next.js UI Host，
默认只监听 `127.0.0.1:3037`，随 Harness Host 退出而停止。页面内保留原版 OpenMAIC 品牌和 MIT 许可。
默认中文，可使用原版语言、外观和学习者设置。顶栏「返回 OpenQuantum」关闭子应用。

- 首页：输入量子主题与已有基础。可写明初级、中级或高级，不设置年龄、学历门槛。
- 建课：沿用当前 Harness 模型和专用建课会话，现阶段生成 4 页讲义加练习。支持 TXT / Markdown，
  每份最多 100 KB，文字合计最多 24,000 字，建课要求最多 2,000 字。
- 已有课堂：首次打开时，已生成课堂自动导入原版课程库；随后可以在原版课堂播放、答题和编辑。
- 原版课程库：保留搜索、文件夹、重命名和 ZIP 课程导入；导出沿用上游原生菜单。
- 页面关闭不取消 Harness 任务；生成完成后重新打开会导入课程。顶部可查看生成记录或停止任务。

导入使用上游 `saveStageData` / `loadStageData`，不是直接写浏览器数据库表。
已导入课程不会重复覆盖；原版编辑器中的改动保留，主动从原版课程库删除后也不会在下次打开时自动复活。
编辑、文件夹与练习进度使用原版浏览器本地存储，绑定 UI 的地址、端口与浏览器；换浏览器或清理站点数据不会自动迁移，
需要使用原版课程导出 / 导入。OpenQuantum 的原始建课文档仍保存在 `.openquantum/learning/classrooms/`。

## 固定上游与适配

- 官方稳定版：[v1.0.1](https://github.com/THU-MAIC/OpenMAIC/releases/tag/v1.0.1)
- 源码提交：`f50a25644c9c3893503cf0727ccf613c0ce1e748`
- 本地源码 / 依赖：`.openquantum/external/openmaic`，不进入 OpenQuantum Git。
- `learning:ui:setup` 校验提交、使用上游锁文件安装并显式构建工作区包；不自动批准全部依赖安装脚本。
- `scripts/lib/openmaic-ui-source.mjs` 保存少量适配：建课回调、课程导入、默认语言、托管模型提示与 UI Host 边界。
  保留上游页面、CSS、课堂组件、编辑器和导入导出实现。适配使用内容摘要，发现额外改动时停止覆盖。
- `runtime/openquantum/openmaic-ui/bridge.tsx` 是唯一新增上游组件。没有 Provider Key，也不能发送任意 Harness RPC。
- 本机用 Next.js 开发模式提供原版资源；公开部署、生产构建与远程访问不属于本次本机集成。

## 架构

| 对象 | 职责 |
| --- | --- |
| Harness Client Plugin | 侧栏入口、独立来源 iframe、Session 创建 / 取消 / 状态读取 |
| Bounded Host Route | `/openquantum/api/learning`，同源 JSON POST 和大小边界 |
| UI Host 生命周期 | `src/learning/ui-service.mjs`，启动固定本机服务、检查本次进程身份、随 Host 回收 |
| 课堂 Application Interface | 课程要求、会话关联、完整文档的原子保存与幂等生成 |
| 原生 Tool Provider | `generate_quantum_classroom(courseId)`，真实 Harness 事件与已有模型路由 |
| OpenMAIC 原版 UI | 课程库、课堂呈现、答题、编辑与本地课程归档 |
| OpenMAIC generation SDK | 有界提纲、slide/quiz、讲解生成；回调调用 Harness LLM Interface |

iframe 消息校验精确来源、窗口身份、请求 UUID 和命令白名单，只开放课程同步与建课。
UI 服务不继承项目密钥或 Provider 环境，原版通用 Pro Agent Runtime 保持关闭，课件编辑器独立启用。
上游 AI POST 接口返回明确的未接入错误，防止另起模型通路。

## 当前边界

本次继承原版 UI，并连接已有的 Harness 建课流程；不表示上游所有 AI 服务已经接通。
PDF / PPT 解析、联网搜索、交互课生成、PBL AI 导师、多角色实时问答、AI 编辑、图片 / 视频 / TTS 服务和 Pro Agent
工作台尚未映射到 Harness。对应请求会明确失败；原版的静态课堂呈现、手动编辑和本地归档可独立使用。
公开课程资源库仍是独立工件，尚未批量输入模型，也未完成整体课程体系制作。

生成内容是待审阅草稿。SDK 输出仍经过输入 / 场景 / HTML 校验和本地 KaTeX 重建；这一校验针对 Harness 生成的数据，
不代表用户另行导入的上游 ZIP 课堂也经过同一组 OpenQuantum 科学校验。练习反馈不产生科学 Acceptance。

## 验证

```sh
node --test tests/learning-ui-bridge.test.mjs tests/quantum-learning.test.mjs tests/harness-quantum-learning.test.mjs
npm run harness:config
```

测试使用隔离的 Harness Home、真实 OpenMAIC SDK 和模拟模型，覆盖会话 / 模型路由继承、原子保存、取消、幂等、
错误语义、输入边界以及跨来源 UI 消息隔离。浏览器验收使用明确标为离线验收的既有示例，不能当作在线建课成功证据。

2026-09-09 本次验收：13 项相关测试通过，适配后的上游应用 TypeScript 检查通过，Harness 组合配置与本次 JavaScript
检查通过。浏览器实际验证了原版首页与课程库、三页课堂翻页、公式显示、原版测验 1/1 正确反馈、专业模式编辑，
以及修改讲解后关闭并重开仍保留修改和作答报告。测试讲解文字随后已恢复。

此前真实模型验证沿用 `openquantum-public / glm5.2`，首个模型请求返回 `TIMEOUT`，配置端点连接也失败。
本次 UI 修订没有修改模型、Provider 或代理设置；真实在线建课仍待连接恢复后验证。

本机界面日志：`.openquantum/learning/openmaic-ui.log`。
可通过 `OPENQUANTUM_OPENMAIC_PORT` 显式调整 UI 端口；端口是浏览器本地课程存储地址的一部分，已有课程应先导出。
本机此次运行把可重建的 `.next` 编译缓存放在 `/Volumes/Elements/openquantum-build-cache/openmaic-next-20260909`，
以免占满系统盘；源文件和课程存储位置保持如上。该缓存链接是本机状态，不进入 Git，其他机器正常在源码目录重建缓存。
