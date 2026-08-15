import assert from "node:assert/strict";
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
  ]);
  assert.equal(typeof transform, "function");
  assert.match(transform(HARNESS_INDEX), /<title>OpenQuantum<\/title>/);
  assert.deepEqual(
    routes.map((route) => route.path),
    ["/favicon.svg", "/manifest.webmanifest"],
  );
});

test("fails loudly if a future Harness shell no longer has an HTML head", () => {
  assert.throws(
    () => brandHarnessIndex("<main>missing head</main>"),
    /requires a Harness HTML head/,
  );
});
