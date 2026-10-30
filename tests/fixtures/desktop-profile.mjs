import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { initProfile, PROFILE_TEMPLATES } from "@deepseek-ai/dsh-app-boot";
import { DESKTOP_PROFILE_BUNDLE, DESKTOP_PROFILE_DIRECTORY } from "../../scripts/lib/desktop-profile-bundle.mjs";

// Use installed runtime packages and local extension links. Tests never invoke
// pnpm or fetch a dependency merely to exercise Home preparation.
export async function linkDesktopProfile(home) {
  const profile = path.join(home, "profiles/desktop");
  initProfile(profile, PROFILE_TEMPLATES.web);
  const manifestFile = path.join(profile, "package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const names = ["harness-web-security", "harness-capability-host", "harness-web-branding", "harness-web-capabilities", "harness-web-learning", "harness-web-locales", "harness-web-updates", "harness-desktop-profile"];
  for (const name of names) {
    const target = name === "harness-desktop-profile" ? path.join(home, DESKTOP_PROFILE_DIRECTORY) : path.join(home, ".openquantum-extensions", name);
    const link = path.join(profile, "node_modules/@openquantum", name);
    await mkdir(path.dirname(link), { recursive: true });
    await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    manifest.dependencies[`@openquantum/${name}`] = `link:${target.replaceAll("\\", "/")}`;
  }
  manifest.dsh.profile.bundles.push(DESKTOP_PROFILE_BUNDLE);
  await writeFile(manifestFile, JSON.stringify(manifest));
}
