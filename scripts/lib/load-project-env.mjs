import fs from "node:fs";
import path from "node:path";

/**
 * Load the repository-local .env file when it exists.
 *
 * Node's loadEnvFile keeps values already present in process.env, so explicit
 * shell or deployment configuration remains authoritative over local defaults.
 */
export function loadProjectEnv(projectRoot) {
  const envFile = path.join(projectRoot, ".env");
  if (!fs.existsSync(envFile)) return false;

  process.loadEnvFile(envFile);
  return true;
}
