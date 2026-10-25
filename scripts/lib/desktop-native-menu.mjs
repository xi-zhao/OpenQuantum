import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, promisify } from "node:util";

const patch = fileURLToPath(new URL("../patches/dsh-desktop-2.0.0-tray-menu.patch", import.meta.url));
const exec = promisify(execFile);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

async function evidence(directory) {
  const lib = path.join(directory, "dsh-plugin-desktop/lib");
  const runtime = (await readdir(lib)).filter(name => /^electron-runtime-[\w-]+\.js$/.test(name));
  if (runtime.length !== 1) throw new Error("Expected exactly one compiled Desktop native runtime; rebuild with desktop:setup.");
  const files = {};
  for (const name of ["main.js", ...runtime]) files[name] = hash(await readFile(path.join(lib, name)));
  return {
    patchSha256: hash(await readFile(patch)),
    files,
  };
}

/** Compile the reviewed Desktop presentation extension, then restore source bytes. */
export async function buildDesktopNativeMenu(directory, build) {
  await exec("git", ["apply", "--check", patch], { cwd: directory });
  await exec("git", ["apply", patch], { cwd: directory });
  try {
    await build();
    return await evidence(directory);
  } finally {
    // Never reset the checkout: reverse only our patch, retaining unrelated work.
    await exec("git", ["apply", "--reverse", "--check", patch], { cwd: directory });
    await exec("git", ["apply", "--reverse", patch], { cwd: directory });
  }
}

export async function verifyDesktopNativeMenu(directory, marker) {
  const actual = await evidence(directory);
  if (actual.patchSha256 !== marker?.patchSha256 || !isDeepStrictEqual(actual.files, marker?.files)) {
    throw new Error("Desktop native menu build differs from the reviewed source patch; rebuild with desktop:setup.");
  }
}
