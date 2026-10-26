import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { z } from "zod";
import { createRequire } from "node:module";

const proxyAddr = createRequire(import.meta.url)("proxy-addr");
test("invalid mapped IPv6 subnets do not trust unrelated IPv4 peers", () => {
  const request = { socket: { remoteAddress: "203.0.113.7" }, headers: { "x-forwarded-for": "10.0.0.1" } };
  assert.equal(proxyAddr(request, proxyAddr.compile("::ffff:10.0.0.0/8")), "203.0.113.7");
  assert.equal(proxyAddr(request, proxyAddr.compile("::/1")), "203.0.113.7");
});

test("correctly scoped trusted proxies still resolve their forwarded clients", () => {
  const request = { socket: { remoteAddress: "10.0.0.2" }, headers: { "x-forwarded-for": "203.0.113.7" } };
  assert.equal(proxyAddr(request, proxyAddr.compile("10.0.0.0/8")), "203.0.113.7");
  assert.equal(proxyAddr(request, proxyAddr.compile("::ffff:10.0.0.0/104")), "203.0.113.7");
});

const root = new URL("../", import.meta.url);
const patched = { "body-parser": "2.4.0", undici: "8.12.2", zod: "4.6.6", "fast-uri": "3.1.9" };
const run = promisify(execFile);

for (const directory of ["", "distributions/codex-plugin/", "distributions/codex-installer/"]) {
  test(`${directory || "root"} locks patched HTTP parsing and schema dependencies`, async () => {
    const manifest = JSON.parse(await readFile(new URL(`${directory}package.json`, root), "utf8"));
    const lock = JSON.parse(await readFile(new URL(`${directory}package-lock.json`, root), "utf8"));
    for (const [name, version] of Object.entries(patched)) {
      const entries = Object.entries(lock.packages).filter(([filename]) => filename.endsWith(`node_modules/${name}`));
      if (!entries.length && name === "undici") continue;
      assert.ok(entries.length, `${directory}: missing ${name}`);
      assert.equal(manifest.overrides?.[name], version, `${directory}: keep the reviewed security override`);
      for (const [filename, entry] of entries) assert.equal(entry.version, version, `${directory}${filename}: vulnerable transitive dependency`);
    }
  });
}

test("oversized schema collections fail before validating their elements", () => {
  let parsed = 0;
  const schema = z.array(z.string().refine(() => { parsed++; return true; })).max(2);
  const result = schema.safeParse(Array(1024).fill("bounded fixture"));
  assert.equal(result.success, false);
  assert.equal(parsed, 0);
  assert.deepEqual(result.error.issues.map(issue => issue.code), ["too_big"]);
  for (const [schema, value] of [
    [z.map(z.string(), z.string()).max(1), new Map([[1, 1], [2, 2]])],
    [z.set(z.string()).max(1), new Set([1, 2])],
  ]) assert.deepEqual(schema.safeParse(value).error.issues.map(issue => issue.code), ["too_big"]);
});

// Keep bounded crash regressions in children, not in the test runner process.
async function survives(program) {
  const { stdout } = await run(process.execPath, ["--input-type=module", "--eval", program], {
    cwd: fileURLToPath(root), timeout: 10_000, maxBuffer: 64 * 1024,
  });
  assert.match(stdout, /SECURITY_FIXTURE_SURVIVED/);
}

test("a completed compressed request cannot crash the HTTP parser with trailing bytes", async () => {
  await survives(`
    import http from 'node:http';
    import { gzipSync } from 'node:zlib';
    import bodyParser from 'body-parser';
    const parser = bodyParser.json();
    const server = http.createServer((req, res) => parser(req, res, error => {
      res.statusCode = error ? 400 : 200;
      res.end(JSON.stringify(req.body ?? {}));
    }));
    server.listen(0, '127.0.0.1', () => {
      const body = Buffer.concat([gzipSync('{"value":1}'), Buffer.from([0]), Buffer.alloc(100 * 1024, 0x58)]);
      const req = http.request({ host:'127.0.0.1', port:server.address().port, method:'POST',
        headers:{'Content-Type':'application/json','Content-Encoding':'gzip','Content-Length':body.length} }, res => {
        res.resume();
        res.on('end', () => setTimeout(() => server.close(() => console.log('SECURITY_FIXTURE_SURVIVED')), 200));
      });
      req.on('error', error => { throw error; });
      req.end(body);
    });
  `);
});

test("excess content codings and a truncated response cannot crash a caught fetch", {
  skip: !existsSync(new URL("../node_modules/undici/package.json", import.meta.url)) && "The pinned 0.1.0 runtime has no undici package",
}, async () => {
  await survives(`
    import net from 'node:net';
    import { fetch } from 'undici';
    const server = net.createServer(socket => socket.once('data', () => socket.end(
      'HTTP/1.1 200 OK\\r\\nContent-Encoding: gzip, gzip, gzip, gzip, gzip, gzip\\r\\nContent-Length: 20\\r\\nConnection: close\\r\\n\\r\\n'
    )));
    server.listen(0, '127.0.0.1', async () => {
      try { const response = await fetch('http://127.0.0.1:' + server.address().port); await response.arrayBuffer(); } catch {}
      setTimeout(() => server.close(() => console.log('SECURITY_FIXTURE_SURVIVED')), 200);
    });
  `);
});
