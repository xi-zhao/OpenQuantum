import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Installed Host packages and presets carry a deployment location. Finder and
// the upstream Desktop are free to choose their own working directory.
const marker = new URL("./openquantum-project.json", import.meta.url);
const deployment = existsSync(marker) ? JSON.parse(readFileSync(marker, "utf8")) : null;
export const projectRoot = deployment?.projectRoot ?? fileURLToPath(new URL("../../", import.meta.url));
const runtimeFile = path.join(projectRoot, ".openquantum/runtime.json");
const runtime = existsSync(runtimeFile) ? JSON.parse(readFileSync(runtimeFile, "utf8")) : null;
export const nodeExecutable = deployment?.nodeExecutable ?? runtime?.nodeExecutable ?? process.execPath;
if (typeof projectRoot !== "string" || !path.isAbsolute(projectRoot)) throw new Error("OpenQuantum requires an absolute project root");
