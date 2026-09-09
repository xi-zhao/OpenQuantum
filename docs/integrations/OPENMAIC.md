# 量子学习通 · OpenMAIC 集成

量子学习通是 OpenQuantum 侧栏中的课堂子应用。用户填写主题、初／中／高级深度、已有基础与学习目标，
可加入原创或有权使用的文字材料；OpenMAIC 生成讲义、讲解与练习，课堂在本地保存，可以再次打开。
深度按能力选择，不设置学历或年龄门槛。

## 使用

安装项目依赖后运行 `npm run dev`，打开 `http://localhost:3000`，点击侧栏的「量子学习通」。
首次启动及源码修改后的启动会自动构建原生 Client Plugin，无需独立启动 OpenMAIC 服务。

1. 点击「创建课堂」，填写主题与学习深度。支持 2、4、6 页讲义，随后附一页练习。
2. 参考材料可直接粘贴，或导入 TXT／Markdown，最多 24,000 字。
3. 点击「生成课堂」。生成在专用 Harness 会话中执行，关闭课堂窗口不停止会话。
4. 可查看生成记录、停止生成；失败后保留建课要求，用户可在原会话中明确重试。
5. 打开已完成课堂，浏览讲义、公式和讲解，完成随堂练习，或导出课堂 JSON。

朗读使用浏览器提供的语音能力；声音及可用性取决于浏览器／系统。课件会持久保存，练习作答暂存于当前页面。
生成内容始终标记为待审阅，练习答案只用于学习者自行检查，不产生科学 Acceptance。

## 实际接入范围

使用 [OpenMAIC 官方仓库](https://github.com/THU-MAIC/OpenMAIC) 发布的 SDK，而不是另外运行上游 Next.js 应用。
直接依赖固定为 `@openmaic/generation@0.3.6`、`@openmaic/renderer@0.1.6`、`@openmaic/dsl@0.11.1`，
锁文件固定其余依赖。这些 npm 组件有自己的版本号，不等同于上游完整应用的 v1.0.1。
组件采用 MIT 许可证；构建保留依赖声明与许可证注释。

已接入提纲生成、slide/quiz 内容生成、讲解动作生成、DSL 场景组装和官方 `SlideCanvas`。
导出的 `openquantum.openmaic.classroom` 文件包含原生 stage/scenes 数据与来源记录，
属于本集成的文档格式，不能当作完整 OpenMAIC 应用的项目归档直接导入。

当前不含 PDF／PPT 解析、自动搜索、资料库批量摄取、交互网页、PBL、多角色讨论、图片／视频生成、云端 TTS、
课堂编辑器或完整 OpenMAIC 项目导入。已有教育资源库保持独立；公开可读性不自动扩大材料的改编与 AI 使用权限。
本次集成提供课程制作与学习入口，尚未建立完整课程体系。

## 架构与事实来源

| 对象 | 实现与职责 |
| --- | --- |
| Client Plugin | `runtime/openquantum/web-learning/client.jsx`，通过 `sidebar.footer.action` 提供应用入口和课堂界面；使用 Harness 的 React 与连接服务 |
| Bounded Host Route | `/openquantum/api/learning`，只接受同源 JSON POST，校验大小后委托 Application Interface；不执行 Tool 或直接调用模型 |
| Application Interface | `src/learning/application.mjs`，拥有课堂要求、会话关联、并发边界、原子写入与幂等读取 |
| Agent Preset | `quantum-learning`，仅组合建课所需的 persona 和原生 Tool Provider；默认 OpenQuantum Preset 也注册同一 Tool |
| Tool Provider | `learning-tools.mjs` 暴露 `generate_quantum_classroom(courseId)`，只接受与当前会话关联的课堂编号 |
| OpenMAIC | `generation.mjs` 调用官方无状态生成组件，通过回调使用 Harness LLM 服务；不读取密钥、定义 Provider 或管理任务队列 |
| 执行状态 | Harness 的 Session / Turn / Tool 事件；UI 从 Harness 的会话列表和历史读取运行与失败状态 |
| 课堂内容 | 私有目录中的 JSON 文档，`hasClassroom` 仅表示已保存完整课件，不表示模型服务健康或教学质量验收通过 |

模型使用调用 Tool 的当前 Harness step 已记录的 Provider、Model 与 reasoning effort。
部署默认值、用户保存的默认模型和会话选择都由 Harness 原有规则解析，集成不会切换模型或增加第二套密钥设置。
SDK 辅助调用最多 15 次，每次最多 8,192 输出 token，整个 Tool 最长 10 分钟。
这些辅助调用使用同一模型服务；会话中的普通聊天 token 统计不应被当作全部建课费用的独立验收证据。

默认文档位置为 `.openquantum/learning/classrooms/<uuid>.json`，可用进程级 `OPENQUANTUM_LEARNING_DIR` 配置存储目录。
文件记录建课要求、对应 Session、SDK 版本、模型选择、生成时间和未审阅状态。创建请求和完成后的重试具有幂等性；
未完成的模型输出不会发布为完整课堂。取消会传递到 SDK 的每次模型请求，不在页面关闭后创建另一套后台任务。

生成数据先校验，再保存。文本仅允许受限 HTML 和样式；模型给出的公式 HTML 被丢弃，使用本地 KaTeX 重新渲染。
媒体、远程 URL、脚本、事件属性和交互 widget 不进入课堂。字体随 Client Plugin 打包，不从外部字体 CDN 载入。
Tool 按 `external-write` 登记：它会向已有模型服务发送主题／材料并写入本地课件。它不安装依赖、不执行 shell、
不调用硬件，也不向外部发布课程。

## 验证与本次结果（2026-09-09）

运行集成检查：

```sh
node --test tests/quantum-learning.test.mjs tests/harness-quantum-learning.test.mjs tests/harness-web-capabilities.test.mjs tests/capability-package-audit.test.mjs tests/desktop-integration.test.mjs tests/harness-native-quantum.test.mjs
npm run capability:contracts:test
npm run capability:conformance
npm run harness:config
```

集成测试使用隔离的 Harness Home 与模拟的模型响应，调用真实 OpenMAIC SDK，验证原生应用 API、专用 Preset、
模型路由继承、生成与持久化、公式安全、答案对应、超时／取消、幂等重试及 durable Tool result。
浏览器验证覆盖建课表单、保存后的课堂打开、官方讲义与公式渲染、练习作答和正确答案反馈。

本机真实模型验证沿用用户当时生效的 `openquantum-public / glm5.2`，在首个 Harness 模型请求中返回 `TIMEOUT`，
尚未进入 OpenMAIC Tool；配置的模型目录访问也发生连接错误。没有改动模型或 Provider 设置。
这说明目前的真实在线建课仍受模型连接阻塞，模拟模型验收不能替代在线成功记录。
应用中的离线验收示例使用手写测试响应，经真实 SDK 组装；它不是在线生成成功证据或正式课程。

全仓 lint 还会扫描本次任务之外未跟踪的资源库产物，其 `library/library.js:23` 存在原有的空白字符错误；
本次修改范围单独执行 lint。资源库产物及先前已有的 Preset 格式改动不纳入本次提交。
