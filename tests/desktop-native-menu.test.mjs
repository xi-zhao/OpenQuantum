import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildDesktopNativeMenu, verifyDesktopNativeMenu } from "../scripts/lib/desktop-native-menu.mjs";
import { desktopSourceDirectory } from "../scripts/lib/desktop-source.mjs";

const upstream = desktopSourceDirectory(fileURLToPath(new URL("..", import.meta.url)));
const files = ["src/runtime.ts", "src/electron-runtime.ts", "tests/electron-runtime.spec.ts"];

for (const succeeds of [true, false]) {
  test(`native menu compilation restores the pinned source after ${succeeds ? "success" : "failure"}`, {
    skip: !existsSync(path.join(upstream, "dsh-plugin-desktop/src/runtime.ts")),
  }, async t => {
    const directory = await mkdtemp(path.join(tmpdir(), "oq-native-menu-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const before = new Map();
    for (const file of files) {
      const relative = `dsh-plugin-desktop/${file}`;
      before.set(relative, await readFile(path.join(upstream, relative)));
      await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
      await writeFile(path.join(directory, relative), before.get(relative));
    }
    const main = path.join(directory, "dsh-plugin-desktop/lib/main.js");
    const runtime = path.join(directory, "dsh-plugin-desktop/lib/electron-runtime-fixture.js");
    const compile = () => buildDesktopNativeMenu(directory, async () => {
      assert.match(await readFile(path.join(directory, "dsh-plugin-desktop/src/runtime.ts"), "utf8"), /readTrayMenu/);
      await writeFile(path.join(directory, "unrelated"), "preserve me");
      if (!succeeds) throw new Error("compiler fixture failed");
      await mkdir(path.dirname(main));
      await writeFile(main, "compiled native runtime fixture");
      await writeFile(runtime, "compiled native menu fixture");
    });
    if (succeeds) {
      const marker = await compile();
      await verifyDesktopNativeMenu(directory, marker);
      await assert.rejects(verifyDesktopNativeMenu(directory, {}), /differs/);
      await writeFile(runtime, "stale native menu");
      await assert.rejects(verifyDesktopNativeMenu(directory, marker), /differs/);
    } else await assert.rejects(compile(), /compiler fixture failed/);
    for (const [file, content] of before) assert.deepEqual(await readFile(path.join(directory, file)), content);
    assert.equal(await readFile(path.join(directory, "unrelated"), "utf8"), "preserve me");
  });
}
