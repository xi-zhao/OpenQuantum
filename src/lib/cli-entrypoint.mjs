import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function canonicalPath(filename) {
  try { return (realpathSync.native ?? realpathSync)(filename); }
  catch (error) {
    if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
    return path.resolve(filename);
  }
}

// Resolve both sides: Node may preserve URL casing while argv (or a symlink)
// identifies the same file through another spelling. Never lowercase paths on
// case-sensitive filesystems, where those spellings can be different files.
export function isMainModule(moduleUrl, invokedPath = process.argv[1]) {
  return Boolean(invokedPath) && canonicalPath(invokedPath) === canonicalPath(fileURLToPath(moduleUrl));
}
