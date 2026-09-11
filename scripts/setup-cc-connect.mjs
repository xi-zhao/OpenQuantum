import { fileURLToPath } from "node:url";

import { ensureCcConnectConfig } from "../src/channels/cc-connect.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
await prepareOpenQuantumHarnessHome({ projectRoot, harnessHome: process.env.DSH_HOME ?? `${projectRoot}/.openquantum/dsh` });
const result = await ensureCcConnectConfig(projectRoot);

console.log(result.created
  ? "CC Connect 已生成 OpenQuantum ACP 配置。"
  : result.migrated
  ? "CC Connect 已更新 Harness 启动入口，原配置已备份，渠道和凭据已保留。"
  : "CC Connect 配置已存在，未覆盖现有渠道和凭据。",
);
console.log(`配置：${result.configPath}`);
console.log(`状态：${result.state}`);
console.log("下一步：");
console.log("  1. 运行 npm run cc-connect:feishu（或按接入文档添加其他平台）");
console.log("  2. npm run cc-connect:start");
console.log("  3. 在另一个终端运行 npm run cc-connect:web");
