import { fileURLToPath } from "node:url";

import { ensureCcConnectConfig } from "../src/channels/cc-connect.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const result = await ensureCcConnectConfig(projectRoot);

console.log(result.created
  ? "CC Connect 已生成 OpenQuantum ACP 配置。"
  : "CC Connect 配置已存在，未覆盖现有渠道和凭据。",
);
console.log(`配置：${result.configPath}`);
console.log(`状态：${result.state}`);
console.log("下一步：");
console.log("  1. 运行 npm run cc-connect:feishu（或按接入文档添加其他平台）");
console.log("  2. npm run cc-connect:start");
console.log("  3. 在另一个终端运行 npm run cc-connect:web");
