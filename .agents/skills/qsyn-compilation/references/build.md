# Qsyn 固定源码构建

显式 setup 会下载完整固定源码与 `native.lock.json` 中的依赖提交，检查子模块和额外输入，在新的 build 目录构建。它不执行研究程序。CMake >=3.29、C++20 编译器、BLAS 与 LAPACK 需要预先可用。

在本轮已安装 Homebrew GCC 16 的 Apple Silicon macOS 上：

```sh
CC=/opt/homebrew/opt/gcc/bin/gcc-16 \
CXX=/opt/homebrew/opt/gcc/bin/g++-16 \
node scripts/setup-sdk.mjs qsyn-compilation
```

本轮实际 CMake 为 4.3.0，GCC 为 16.2.0。编译器路径按主机调整；`OPENQUANTUM_CMAKE` 可指定 CMake。Clang 22 与上游固定 fmt 10.2.1 的构建失败已保留，不能以 C++20 支持声明代替这组依赖的实际兼容性。

`inspect qsyn-compilation` 返回完整源码目录和构建后的 CLI。研究程序放在用户任务目录，例如保存输入 QASM 与 `.qsyn` 脚本，使用宿主代码工具运行。设置 `--qsynrc-path` 可指定独立配置文件。源码缓存有用户修改或新增文件时 setup 拒绝重新构建，保留文件；不要 reset 缓存来掩盖改动。

线路优化须独立检查门集、线映射与相位。示例的 QASM 读回用 Qiskit 完整酉矩阵检查全局相位等价性，科学状态仍为 `not_evaluated`。
