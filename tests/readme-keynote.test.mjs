import { execFile, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { localChromium } from "./helpers/chromium.mjs";

const python = process.platform === "win32" ? "python" : "python3";
const script = fileURLToPath(new URL("./helpers/keynote_plates.py", import.meta.url));
const run = promisify(execFile);
for (const [name, method] of [
  ["four frozen inputs reject missing and tampered files and supply the rendered values and commutator scope", "test_evidence"],
  ["all 16 current WebPs match the published dimensions, metadata policy and current/historical README inventory", "test_inventory"],
  ["four benchmark WebPs match their verified renderer markup, fonts and figure", "test_signatures"],
]) {
  test(name, () => run(python, ["-B", script, `Keynote.${method}`]));
}

test("Chromium renders four benchmark WebPs at their published dimensions and compares RGBA on the pinned macOS reference", async t => {
  const chrome = await localChromium();
  const modules = spawnSync(python, ["-c", "from playwright.async_api import async_playwright; from PIL import features; assert features.check('webp')"]);
  const missing = !chrome ? "Chromium executable unavailable (set OPENQUANTUM_CHROMIUM or CHROME)"
    : modules.status !== 0 ? "Python requires Playwright and Pillow with WebP support" : null;
  if (missing) {
    if (process.env.CI === "true" || process.env.OPENQUANTUM_REQUIRE_KEYNOTE_RENDER === "1" || process.env.OPENQUANTUM_REQUIRE_KEYNOTE_PIXEL_MATCH === "1") {
      assert.fail("Required keynote render: " + missing);
    }
    return t.skip(missing);
  }
  try {
    const { stdout } = await run(python, ["-B", script, "Keynote.test_render"], { env: { ...process.env, CHROME: chrome } });
    t.diagnostic(stdout.trim());
  } catch (error) {
    if (error.stdout) t.diagnostic(error.stdout.trim());
    throw error;
  }
});
