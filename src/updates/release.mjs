/** Versioned, data-only contract shared by the release job and update reader. */
export const UPDATE_MANIFEST_NAME = "openquantum-update.json";
export const RELEASES_URL = "https://github.com/xi-zhao/OpenQuantum/releases";
export const DEFAULT_UPDATE_FEED = `${RELEASES_URL}/latest/download/${UPDATE_MANIFEST_NAME}`;
export const MAX_MANIFEST_BYTES = 64 * 1024;

export function parseVersion(value) {
  if (typeof value !== "string" || value.length > 128) return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split(".") ?? [];
  if (prerelease.some((part) => /^0\d+$/.test(part))) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) throw new TypeError("Invalid release version");
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  }
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return BigInt(x) > BigInt(y) ? 1 : -1;
    if (xn !== yn) return xn ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}

export function httpsUrl(value, { allowFragment = false } = {}) {
  if (typeof value !== "string" || value.length > 2048) throw new TypeError("Invalid update URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !allowFragment && url.hash) throw new TypeError("Invalid HTTPS update URL");
  return url.href;
}

export function validateRelease(value) {
  if (!value || value.schemaVersion !== 1 || value.product !== "openquantum" || value.channel !== "stable") throw new TypeError("Unsupported update manifest");
  const version = parseVersion(value.version);
  if (!version || version.prerelease.length) throw new TypeError("The stable channel requires a stable version");
  if (typeof value.publishedAt !== "string" || !Number.isFinite(Date.parse(value.publishedAt))) throw new TypeError("Invalid publication date");
  if (!parseVersion(value.compatibility?.harness) || !parseVersion(value.compatibility?.desktop)) throw new TypeError("Missing dependency compatibility versions");
  if (!Array.isArray(value.artifacts) || value.artifacts.length > 12) throw new TypeError("Invalid release artifacts");
  const artifacts = value.artifacts.map((artifact) => {
    if (artifact?.kind !== "installer" || !["darwin", "win32", "linux"].includes(artifact.platform)
      || !["arm64", "x64"].includes(artifact.arch) || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new TypeError("Invalid installer metadata");
    return { kind: "installer", platform: artifact.platform, arch: artifact.arch, url: httpsUrl(artifact.url), sha256: artifact.sha256 };
  });
  return {
    schemaVersion: 1, product: "openquantum", channel: "stable", version: value.version,
    publishedAt: new Date(value.publishedAt).toISOString(), releaseUrl: httpsUrl(value.releaseUrl, { allowFragment: true }),
    upgradeUrl: httpsUrl(value.upgradeUrl, { allowFragment: true }),
    compatibility: { harness: value.compatibility.harness, desktop: value.compatibility.desktop }, artifacts,
  };
}

/** Follow only bounded HTTPS redirects (GitHub release assets use a CDN). */
export async function fetchRelease(feedUrl, { request = fetch, signal } = {}) {
  let url = httpsUrl(feedUrl);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await request(url, { method: "GET", redirect: "manual", signal, headers: { accept: "application/json" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Missing update redirect");
      url = httpsUrl(new URL(location, url).href);
      continue;
    }
    if (response.status === 404) { await response.body?.cancel(); return null; }
    if (response.status !== 200 || Number(response.headers.get("content-length")) > MAX_MANIFEST_BYTES) {
      await response.body?.cancel();
      throw new Error("Update feed is unavailable");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty update manifest");
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_MANIFEST_BYTES) { await reader.cancel(); throw new Error("Update manifest is too large"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return validateRelease(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  }
  throw new Error("Too many update redirects");
}
