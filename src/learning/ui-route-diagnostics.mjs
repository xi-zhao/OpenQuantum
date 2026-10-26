import { lstat, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function fileState(filename) {
  try { return (await stat(filename)).isFile() ? "file" : "not_file"; }
  catch (error) { return error.code === "ENOENT" ? "missing" : "unavailable"; }
}

/** Fixed paths and finite metadata only: never log manifest values or errors. */
export async function inspectLearningUiRoutes(directory) {
  const output = path.join(directory, ".next/dev/server");
  const report = {
    phase: "ui-route-diagnostic",
    sourceStatusRoute: await fileState(path.join(directory, "app/api/openquantum/status/route.ts")),
    buildDirectory: "unavailable",
    manifest: "unavailable",
    manifestEntries: null,
    statusManifestEntry: "missing",
    compiledStatusRoute: "not_listed",
  };
  try {
    const entry = await lstat(path.join(directory, ".next"));
    report.buildDirectory = entry.isSymbolicLink() ? "symlink" : entry.isDirectory() ? "directory" : "other";
  } catch (error) { if (error.code === "ENOENT") report.buildDirectory = "missing"; }
  try {
    const manifest = JSON.parse(await readFile(path.join(output, "app-paths-manifest.json"), "utf8"));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      report.manifest = "invalid";
      return report;
    }
    report.manifest = "available";
    report.manifestEntries = Object.keys(manifest).length;
    const entry = manifest["/api/openquantum/status/route"];
    // Only inspect the exact output emitted by the pinned Next application.
    // Do not follow an arbitrary path supplied in a corrupted manifest.
    if (entry !== undefined) report.statusManifestEntry = entry === "app/api/openquantum/status/route.js" ? "expected" : "unexpected";
    if (report.statusManifestEntry === "expected") report.compiledStatusRoute = await fileState(path.join(output, entry));
  } catch (error) {
    report.manifest = error.code === "ENOENT" ? "missing" : error instanceof SyntaxError ? "invalid" : "unavailable";
  }
  return report;
}

/** A first startup 404 schedules one observation, without deciding readiness. */
export function createLearningUiDiagnosticObserver(directory, { report, isActive = () => true, inspect = inspectLearningUiRoutes }) {
  let scheduled = false;
  const deliver = (value) => {
    if (isActive()) { try { report(value); } catch { /* Diagnostics must not interrupt the application. */ } }
  };
  return (value) => {
    if (!isActive()) return;
    deliver(value);
    if (!scheduled && value.phase === "ui-readiness" && value.state === "http_error" && value.httpStatus === 404) {
      scheduled = true;
      Promise.resolve().then(() => inspect(directory)).then(deliver, () => {});
    }
  };
}
