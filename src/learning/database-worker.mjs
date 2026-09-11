import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

// PostgreSQL initdb briefly materializes a password file. Keep that file and
// every database file private, without changing the parent Harness umask.
process.umask(0o077);
let database, stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await database?.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
process.on("disconnect", stop);
process.once("message", async (config) => {
  try {
    database = new EmbeddedPostgres({
      ...config, persistent: true, createPostgresUser: false, authMethod: "scram-sha-256",
      postgresFlags: ["-h", "127.0.0.1", "-k", "", "-c", "shared_buffers=32MB", "-c", "max_connections=40"],
      onLog() {}, onError() {},
    });
    if (!existsSync(path.join(config.databaseDir, "PG_VERSION"))) await database.initialise();
    if (stopping) return;
    await database.start();
    process.send?.({ ready: true });
  } catch {
    process.send?.({ ready: false });
    await stop();
  }
});
