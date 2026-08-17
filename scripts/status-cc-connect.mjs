import { fileURLToPath } from "node:url";

import { readCcConnectStatus } from "../src/channels/cc-connect.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const status = await readCcConnectStatus(projectRoot);

console.log(`CC Connect ${status.version}`);
console.log(`状态：${status.state}`);
console.log(`本地配置：${status.configured ? status.configPath : "未初始化"}`);
console.log(`管理后台：${status.managementUrl}`);
console.log(`消息平台：${status.platformTypes.join("、") || "尚未配置"}`);
