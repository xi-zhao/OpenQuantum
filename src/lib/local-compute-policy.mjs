// Deployment choices, independent of a scientific method's input domain.
const hardwareEnvironment = [
  "OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMBA_NUM_THREADS",
  "JULIA_NUM_THREADS", "JAX_PLATFORMS", "JAX_PLATFORM_NAME", "CUDA_VISIBLE_DEVICES",
  "XLA_PYTHON_CLIENT_PREALLOCATE", "XLA_PYTHON_CLIENT_MEM_FRACTION",
];

function configuredInteger(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return 0;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative safe integer; 0 disables the limit`);
  return value;
}

export function localComputeProcessOptions(execution = {}) {
  return {
    timeoutMs: execution.timeoutMs ?? configuredInteger("OPENQUANTUM_COMPUTE_TIMEOUT_MS"),
    maxOutputBytes: execution.maxOutputBytes ?? configuredInteger("OPENQUANTUM_COMPUTE_MAX_OUTPUT_BYTES"),
  };
}

export function localComputeEnvironment(environment, execution = {}) {
  const value = { ...environment };
  for (const key of hardwareEnvironment) {
    delete value[key];
    if (process.env[key]) value[key] = process.env[key];
  }
  if (execution.threads !== undefined) {
    for (const key of ["OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMBA_NUM_THREADS", "JULIA_NUM_THREADS"]) value[key] = String(execution.threads);
  }
  return value;
}
