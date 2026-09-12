// A healthy anonymous index request receives Harness's browser-auth challenge.
// CI separately authenticates and checks the rendered page and Harness RPC.
export async function probeHarnessHealth(baseUrl = "http://127.0.0.1:3000", { timeoutMs = 4000 } = {}) {
  const response = await fetch(new URL("/", baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status !== 401) {
    await response.body?.cancel();
    throw new Error(`Harness health check expected HTTP 401, received ${response.status}`);
  }
  if ((await response.text()).trim() !== "dsh web authentication required; reopen the URL printed by dsh web.") {
    throw new Error("Harness health check did not receive the browser-auth challenge");
  }
}

if (import.meta.main) {
  try {
    await probeHarnessHealth(process.argv[2]);
  } catch {
    // Do not print response bodies, URLs or credentials into Docker health logs.
    console.error("Harness HTTP health check failed");
    process.exitCode = 1;
  }
}
