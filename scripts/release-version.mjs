import { checkReleaseVersions, setReleaseVersion } from "./lib/release-version.mjs";

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("Usage: node scripts/release-version.mjs <version> | --check");
const version = args[0] === "--check" ? await checkReleaseVersions() : await setReleaseVersion(args[0]);
console.log(`OpenQuantum ${version}: Desktop, Codex plugin and installer versions match`);
