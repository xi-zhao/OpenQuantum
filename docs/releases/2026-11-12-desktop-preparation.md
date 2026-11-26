# Desktop 启动时复用已验证扩展

日期：2026-11-12（Asia/Shanghai）。对应 [Issue #59](https://github.com/xi-zhao/OpenQuantum/issues/59)。
基线：`508ed5cd05eb44276fd5009641efa7e82a3b70c0`。这是本地源码改进，不代表发行或本机应用更新。

## 问题与复用方案

独立应用的 `prepare-installed-desktop.mjs` 每次启动都会调用 Home 准备。即使载荷没有变化，也会复制七个
扩展目录、重新构建学习通/语言/能力三个客户端，并为这些目录保存升级事务备份。安装器其实已经逐文件验证了
完整发行清单，可以复用这份身份，避免再实现一套构建依赖追踪。

保留现有 esbuild 构建函数。上游的[增量构建上下文](https://esbuild.github.io/api/#rebuild)用于同一进程内的
重复构建；桌面启动准备是每次独立退出的进程。本次只增加小型准备记录，没有新依赖、后台构建服务或通用缓存系统。

记录保存在 Home 的 `.openquantum-extensions.json`，只保存身份与摘要，不含凭据、会话或科研数据：

- 输入身份包括完整发行清单摘要、项目路径、实际依赖目录、Node 路径和版本、平台及架构。
- 输出摘要覆盖七个受管扩展目录的文件名、字节和权限；不仅检查目录存在或修改时间。
- 命中时跳过扩展复制、三个客户端构建和这些目录的事务备份；配置、凭据迁移、兼容性、载荷及链接检查继续执行。
- 缺失/无效记录、文件缺失或损坏、输入身份变化、`--rebuild-extensions` 均触发重建。
- 重建前使记录失效，全部 Home 准备成功后才写入新记录。记录与扩展使用同一个既有安装事务，失败恢复旧字节。

这是安装器内部的性能记录，不是新的安全或科学验收凭证。源码开发入口继续构建；共享插件、模型路由及科学合同
没有改变。本次没有跳过安装载荷核验，也没有缓存用户配置。

## 验证

验证使用本机 macOS arm64、Node 24.14.1、已有锁定依赖，以及隔离的临时 Home。真实执行安装准备 CLI 和
现有三个 esbuild 构建函数；测试通过本地依赖链接避免网络安装，不读取或改写用户实际安装。

回归先在旧实现上失败：第二次准备改写了能力客户端，单次准备耗时 2,351 ms。修复后同一断言通过，客户端
修改时间和 inode 均保持不变，且记录不被重复写入；完整回归中该次准备为 1,959 ms。耗时仅为本机临时载荷的
单次观察，不是完整应用启动基准。

以下定向检查合计 **64 项通过、0 失败、0 跳过**：

```sh
node --test tests/desktop-install-home.test.mjs
node --test tests/desktop-home.test.mjs tests/harness-home-roundtrip.test.mjs tests/desktop-distribution.test.mjs tests/desktop-payload.test.mjs
node --test tests/desktop-install-transaction.test.mjs
```

三组分别为 15、30、19 项。改动代码的 ESLint、差异空白检查及新增文档相对链接检查通过。

范围覆盖首次准备与复用、用户设置保留、同版本载荷源码变化、缺失/损坏客户端和记录、强制修复、符号链接拒绝、
不兼容 Home 拒绝、构建中途失败回滚，以及已有安装事务与 Web/Desktop 共用 Home 回归。

未进行完整 DMG 构建、真实 GUI 启动计时或 Linux/Windows 原生运行验收。
