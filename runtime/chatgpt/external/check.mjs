import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { externalMcp, externalContract } from "./catalog.mjs";
import { externalPaths } from "./setup.mjs";
import { connectExternal } from "./client.mjs";
import { digest } from "../../../src/settings/codex/storage.mjs";

export async function inspectExternalEnvironment(manager, id, record, signal) {
  const paths = externalPaths(manager.root, id, manager.environment);
  const entry = externalMcp(id);
  signal?.throwIfAborted();
  const connection = await connectExternal(manager.root, entry, manager.environment, { signal });
  const stop = () => connection.close().catch(() => {});
  signal?.addEventListener("abort", stop, { once: true });
  try {
    signal?.throwIfAborted();
    const actual = await connection.client.listTools({}, { signal, timeout: 90000 });
    const expected = await externalContract(manager.root, entry.id);
    const ordered = tools => tools.map(({ name, description, inputSchema, outputSchema, annotations }) => ({ name, description, inputSchema,
      ...(outputSchema ? { outputSchema } : {}), ...(annotations ? { annotations } : {}) })).sort((a, b) => a.name.localeCompare(b.name));
    if (actual.nextCursor || !isDeepStrictEqual(ordered(actual.tools), ordered(expected.tools))) throw new Error("实际 MCP Tool 合同发生变化，请检查固定依赖");
    return { ready: true, fingerprint: await manager.fingerprint(id, record.configuration), checkedAt: new Date().toISOString(),
      paths: [paths.python, paths.marker], markers: [{ path: paths.marker, sha256: digest(await fs.readFile(paths.marker)) }],
      details: ["固定上游 MCP 实际握手与 Tool 合同已检查；云端账户及科学结果在调用时验证"] };
  } finally { signal?.removeEventListener("abort", stop); await connection.close(); }
}
