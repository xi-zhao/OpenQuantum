import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  apply,
  brandHarnessIndex,
} from "../runtime/openquantum/web-branding/index.mjs";

const HARNESS_INDEX = `<!doctype html>
<html>
  <head>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>DeepSeek Harness</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

test("brands the official Harness index without replacing its application shell", () => {
  const branded = brandHarnessIndex(HARNESS_INDEX);

  assert.match(branded, /<title>OpenQuantum<\/title>/);
  assert.match(branded, /data-openquantum-branding/);
  assert.match(branded, /content: "OpenQuantum"/);
  assert.match(branded, /content: "OQ"/);
  assert.match(branded, /src="\/openquantum-branding\.js"/);
  assert.match(branded, /<div id="root"><\/div>/);
  assert.match(branded, /href="\/favicon\.svg"/);
  assert.equal(brandHarnessIndex(branded), branded);
});

test("registers branding through the Harness webServer index tap", () => {
  let transform;
  const routes = [];
  const effectLabels = [];
  const dispose = () => {};
  const ctx = {
    webServer: {
      tapIndex(nextTransform) {
        transform = nextTransform;
        return dispose;
      },
      register(route) {
        routes.push(route);
        return dispose;
      },
    },
    effect(register, label) {
      effectLabels.push(label);
      assert.equal(register(), dispose);
    },
  };

  apply(ctx);

  assert.deepEqual(effectLabels, [
    "openquantum: native Harness Web branding",
    "openquantum: favicon",
    "openquantum: web manifest",
    "openquantum: product copy",
  ]);
  assert.equal(typeof transform, "function");
  assert.match(transform(HARNESS_INDEX), /<title>OpenQuantum<\/title>/);
  assert.deepEqual(
    routes.map((route) => route.path),
    ["/favicon.svg", "/manifest.webmanifest", "/openquantum-branding.js"],
  );

  const copyRoute = routes.find(
    (route) => route.path === "/openquantum-branding.js",
  );
  assert(copyRoute);
  let body = "";
  copyRoute.handler(
    { method: "GET" },
    {
      writeHead(status, headers) {
        assert.equal(status, 200);
        assert.equal(headers["content-type"], "text/javascript; charset=utf-8");
      },
      end(value = "") {
        body = value;
      },
    },
  );
  assert.match(body, /探索开放量子世界/);
  assert.match(body, /Explore the open quantum world/);
  assert.match(body, /配置提供方的 API 地址和凭据/);
  assert.match(body, /Configure each provider endpoint and credential/);
  assert.match(body, /连接与模型设置/);
  assert.match(body, /details\.open = true/);
  assert.match(body, /heroPreviewLabels/);
  assert.match(body, /parent\.remove\(\)/);
});

test("replaces the upstream developer notice through the native onboarding slot", async () => {
  const [manifestText, client] = await Promise.all([
    readFile(
      new URL("../runtime/openquantum/web-branding/package.json", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../runtime/openquantum/web-branding/client.js", import.meta.url),
      "utf8",
    ),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.exports["./client"], "./client.js");
  assert.equal(manifest.dsh.client.platform, "web");
  assert.match(client, /settings\.onboarding/);
  assert.match(client, /id: "welcome-notice"/);
  assert.match(client, /priority: -1000/);
  assert.match(client, /return null/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});

test("fails loudly if a future Harness shell no longer has an HTML head", () => {
  assert.throws(
    () => brandHarnessIndex("<main>missing head</main>"),
    /requires a Harness HTML head/,
  );
});
