import { createOpenQuantumGateway } from "./lib/openquantum-gateway.mjs";

const listenHost = process.env.OPENQUANTUM_HOST ?? "127.0.0.1";
const listenPort = Number(process.env.OPENQUANTUM_PORT ?? "3000");
const uiTarget = process.env.OPENQUANTUM_UI_URL ?? "http://127.0.0.1:3001";
const harnessTarget =
  process.env.HARNESS_BASE_URL ?? "http://127.0.0.1:3080";
if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) {
  throw new Error("OPENQUANTUM_PORT must be a valid TCP port");
}

const gateway = createOpenQuantumGateway({ uiTarget, harnessTarget });

gateway.server.listen(listenPort, listenHost, () => {
  console.log(
    `[gateway] OpenQuantum listening on http://${listenHost}:${listenPort} (UI ${uiTarget}, Harness events ${harnessTarget})`,
  );
});

async function shutdown() {
  await gateway.close();
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, shutdown);
}
