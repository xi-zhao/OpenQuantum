// Test-only process boundary. This does not change the product's host execution.
export function offlineProcess(command, args) {
  if (process.platform !== "darwin") throw new Error("This engineering run requires a verified OS network-isolation runner; current fixture supports macOS sandbox-exec");
  return { command: "/usr/bin/sandbox-exec", args: ["-p", "(version 1) (allow default) (deny network*)", command, ...args] };
}

export function isolatedEnvironment(output, path) {
  return { PATH: process.env.PATH, HOME: path.join(output, "home"), MPLBACKEND: "Agg",
    MPLCONFIGDIR: path.join(output, "mpl"), NUMBA_CACHE_DIR: path.join(output, "numba"),
    OMP_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2", OUTPUTPATH: path.join(output, "qcompute"),
    ZIG_GLOBAL_CACHE_DIR: path.join(output, "zig") };
}
