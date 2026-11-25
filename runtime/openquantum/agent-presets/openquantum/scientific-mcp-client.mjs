import { apply as applyMcpClient } from "@deepseek-ai/dsh-mcp-client";
import { confinedMcpLaunch } from "./execution-boundary.mjs";

export { Config } from "@deepseek-ai/dsh-mcp-client";
export const name = "openquantum-scientific-mcp-client";
export const inject = ["tools", "sandbox"];

export async function apply(ctx, config) {
  const launch = await confinedMcpLaunch(ctx.sandbox, config);
  ctx.effect(() => launch.dispose);
  await applyMcpClient(ctx, { ...config, command: launch.command, args: launch.args, env: { ...config.env, ...launch.env } });
}
