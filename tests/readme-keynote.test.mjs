import { execFile, spawnSync } from "node:child_process";
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

test("reference Chromium reproduces every pixel of the four published benchmark plates", async t => {
  // Chinese type and antialiasing in the published plates come from macOS. The
  // paired input/output signatures above also run on systems with other fonts.
  if (process.platform !== "darwin") return t.skip("macOS reference fonts unavailable");
  const chrome = await localChromium();
  if (!chrome) return t.skip("local Chromium unavailable");
  const modules = spawnSync(python, ["-c", "import PIL, playwright"]);
  if (modules.status !== 0) return t.skip("renderer needs Pillow and Playwright");
  const { stdout } = await run(python, ["-B", script, "Keynote.test_reference_render"], { env: { ...process.env, CHROME: chrome } });
  t.diagnostic(stdout.trim());
});
