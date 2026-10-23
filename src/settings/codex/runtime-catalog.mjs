// Reviewed local integrations. Opt-in is an initial user preference, not a
// statement about host compatibility. Presentation stays in the shared catalog.
export const OPTIONAL_RUNTIMES = [
  ["tyxonq-workbench", "tyxonq_local"], ["cqlib-kernel", "cqlib_kernel_local"],
  ["flagquantum-workbench", "flagquantum"], ["qdmi-device", "qdmi_local"],
  ["qoolqit-workbench", "qoolqit_local"], ["qrisp-arithmetic", "qrisp_local"],
  ["cudaq-simulation", "cudaq_local"], ["netqasm-network", "netqasm_local"],
  ["simqn-network", "simqn_local"], ["vqnet-learning", "vqnet_local"],
  ["mrmustard-optics", "mrmustard_local"], ["mimiq-simulation", "mimiq_local"],
  ["myqlm-simulation", "myqlm_local"],
].map(([id, server]) => ({ id, server }));
export const optionalRuntime = id => OPTIONAL_RUNTIMES.find(item => item.id === id || item.server === id);

export function runtimeRequirements(id, platform = process.platform, arch = process.arch) {
  const allowed = id === "cudaq-simulation" ? platform === "linux" || (platform === "darwin" && arch === "arm64")
    : ["mimiq-simulation", "vqnet-learning"].includes(id) ? (platform === "darwin" && arch === "arm64") || (["linux", "win32"].includes(platform) && arch === "x64")
      : id === "qdmi-device" ? ["darwin", "linux"].includes(platform) : true;
  const notes = {
    "cudaq-simulation": "使用 CPU 仿真，无需 NVIDIA GPU。支持 Linux 和 Apple Silicon macOS。",
    "qdmi-device": "安装 Git、CMake 与 C++ 工具链后可准备官方示例驱动；示例数据不代表真实设备。",
    "netqasm-network": "默认安装公开的程序编译环境。网络仿真另需自行准备 SquidASM 0.13.6 / NetSquid 许可环境。",
    "mimiq-simulation": "使用本地 Exaqt，无需云 Token；适用上游专有许可。Linux x64 需要 glibc 2.34 或更新版本。",
    "vqnet-learning": "使用 CPU 梯度计算。支持 Apple Silicon macOS、Linux x64 与 Windows x64。",
    "qoolqit-workbench": "无需账户或 Token；安装和使用适用上游定制许可。",
    "myqlm-simulation": "使用独立的 myQLM 本地环境，无需账户凭据；安装和使用适用上游 EULA。",
    "mrmustard-optics": "使用已固定的兼容版本；上游仓库已归档。",
  };
  const fields = id === "netqasm-network" ? [{ name: "simulationPython", title: "网络仿真环境的 Python", required: false,
    placeholder: "/absolute/path/to/venv/bin/python", description: "可选。填写已自行准备的许可环境解释器路径；不填写时只启用公开的编译功能。此处不收集 NetSquid 账户或密码。" }]
    : id === "qdmi-device" ? [{ name: "driverConfiguration", title: "已审阅的 QDMI 驱动配置文件", required: false,
      placeholder: "/absolute/path/to/driver.json", description: "可选。留空使用官方本地示例。真实驱动配置须遵循 QDMI 1.3.3 清单并包含文件摘要；查询会加载清单中的原生代码。" }] : [];
  return { supported: allowed, note: notes[id] ?? (optionalRuntime(id) ? "运行环境独立安装；无需额外账户或 Token。" : "运行环境独立安装；账户要求见对应服务的配置说明。"), fields };
}
