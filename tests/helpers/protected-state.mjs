import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";

// Harness permits writes to OS temp roots. Homes and interpreter fixtures
// therefore live with the protected test installation, away from research.
// The caller removes this directory after stopping its Harness process.
export async function createProtectedState(root) {
  const directory = path.join(root, "temp");
  await mkdir(directory, { recursive: true });
  return mkdtemp(path.join(directory, "harness-private-"));
}
