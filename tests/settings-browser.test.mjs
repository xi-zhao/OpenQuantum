import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
import { PROJECT_ROOT as root } from "../runtime/chatgpt/catalog.mjs";
import { credentialEntries } from "../runtime/chatgpt/ui/credential-groups.mjs";
import { buildChatgpt } from "../scripts/build-chatgpt.mjs";
import { buildHomepage } from "../scripts/build-homepage.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { Credentials } from "../src/settings/codex/credentials.mjs";
import { serviceCredentialRef } from "../src/settings/codex/service-catalog.mjs";
import { createDesktopApplication } from "../src/settings/desktop/application.mjs";
import { launchChromium, localChromium } from "./helpers/chromium.mjs";

const ibmOwners = ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"];
const pasqalOwner = { Codex: "pasqal-experiments", Desktop: "pasqal_cloud" };
const row = id => `.catalog-item[data-entry-id="${id}"]`;
const readIds = () => [...document.querySelectorAll(".catalog-item")].map(node => node.dataset.entryId).sort();

async function filter(page, selector, value) {
  await page.evaluate(([selector, value]) => {
    const control = document.querySelector(selector);
    control.value = value;
    control.dispatchEvent(new Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  }, [selector, value]);
}

async function openAccount(page, owner, title) {
  return page.evaluate(([owner, title]) => {
    const back = document.querySelector(".back-to-list");
    if (back?.checkVisibility()) back.click();
    const row = document.querySelector(`.catalog-item[data-entry-id="${owner}"]`);
    if (!row?.checkVisibility()) throw new Error(`Missing catalog row for ${owner}`);
    row.click();
    const card = document.querySelector(`#catalog-detail article[aria-label="${title}"]`);
    if (!card?.checkVisibility()) throw new Error(`Missing ${title} form in ${owner}`);
    const fields = new Set();
    const collect = () => {
      for (const input of card.querySelectorAll("input")) {
        if (input.checkVisibility() && !input.disabled) fields.add(input.id.split("-credential-").at(-1));
      }
    };
    const select = card.querySelector("select");
    if (select) for (const option of select.options) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      collect();
    }
    collect();
    return { fields: [...fields].sort(), state: card.querySelector("summary .oq-cap-badge").textContent };
  }, [owner, title]);
}

async function realHosts(t, dir, bundle) {
  const saved = new Set();
  let unread = false;
  const desktop = await createDesktopApplication({ root, directory: path.join(dir, "desktop"), credentials: {
    async resolve(ref) {
      if (unread && ref === "PASQAL_AUTH_TOKEN") throw new Error("Credential store unavailable");
      return saved.has(ref) ? { value: "fixture", source: "fixture" } : undefined;
    },
    describe: async ref => ({ configured: saved.has(ref), writable: true, source: "fixture" }),
  } });
  t.after(() => desktop.close());
  const backend = await createBackend();
  const codex = new Settings({ backend, codexHome: path.join(dir, "codex-home"), directory: path.join(dir, "codex"),
    skillRoot: path.join(bundle, "skills"), componentDirectory: JSON.parse(await readFile(path.join(bundle, "components.json"))),
    credentials: new Credentials({ entry: ref => ({ getPassword: async () => {
      if (ref === serviceCredentialRef("pasqal_cloud") && unread) throw new Error("Credential store unavailable");
      if (ref === "shared-QISKIT_IBM_TOKEN" && saved.has("QISKIT_IBM_TOKEN")) return JSON.stringify({ value: "fixture" });
      for (const [service, field] of [["quantum_hardware", "IONQ_API_KEY"], ["pasqal_cloud", "PASQAL_AUTH_TOKEN"]]) {
        if (ref === serviceCredentialRef(service) && saved.has(field)) return JSON.stringify({ [field]: "fixture" });
      }
      return null;
    } }) }) });
  t.after(async () => { await codex.environments.close(); await backend.close(); });
  return async (host, fields = [], unavailable = false) => {
    saved.clear(); for (const field of fields) saved.add(field);
    unread = unavailable;
    const snapshot = host === "Desktop" ? await desktop.request({ action: "snapshot" }) : await codex.snapshot();
    assert.equal(snapshot.host, host);
    assert.equal(Boolean(snapshot.components), host === "Codex");
    return snapshot;
  };
}

async function geometry(page) {
  const home = pathToFileURL(path.join(await buildHomepage(), "index.html")).href;
  for (const width of [320, 375]) {
    await page.viewport(width);
    await page.navigate(home, () => !!document.querySelector(".wf-tabs:not([hidden])"));
    assert.equal(await page.accessibleName('.community-contact[role="group"][aria-label="联系作者"]'), "联系作者");
    for (const [panel, expected] of [["vqe", "solve_and_validate_ground_state"], ["lean", "Physlib.Relativity.PauliMatrices.Basic"]]) {
      const result = await page.evaluate(async ([panel, expected]) => {
        await document.fonts.ready;
        document.querySelector(`button[data-wf="${panel}"]`).click();
        const win = document.querySelector(`#wf-panel-${panel} .wf-window`);
        const box = win.getBoundingClientRect();
        const walker = document.createTreeWalker(win, NodeFilter.SHOW_TEXT);
        let found = false;
        const clipped = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (node.textContent.includes(expected) && rect.width > 0) found = true;
            if (rect.left < box.left - 1 || rect.right > box.right + 1) clipped.push(node.textContent.trim());
          }
        }
        const panelOverflow = Math.max(...[win, ...win.querySelectorAll(".wf-prompt, .wf-trace")].map(el => el.scrollWidth - el.clientWidth));
        return { found, clipped, panelOverflow, pageOverflow: document.documentElement.scrollWidth - innerWidth };
      }, [panel, expected]);
      assert.deepEqual(result, { found: true, clipped: [], panelOverflow: 0, pageOverflow: 0 }, `${width}px ${panel}: ${JSON.stringify(result)}`);
    }
  }
}

test("CI and explicit browser gates fail when their selected Chromium is missing", () => {
  const file = fileURLToPath(import.meta.url);
  for (const [ci, required] of [["true", "0"], ["false", "1"]]) {
    const env = { ...process.env, CI: ci, OPENQUANTUM_REQUIRE_BROWSER_TESTS: required, OPENQUANTUM_CHROMIUM: path.join(file, "missing") };
    delete env.NODE_TEST_CONTEXT; // Launch a fresh node --test CLI, outside the parent's test worker.
    const result = spawnSync(process.execPath, ["--test", "--test-name-pattern=^offline Chromium", file], {
      encoding: "utf8", env,
    });
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 1, output);
    assert.match(output, /Required browser tests: Chromium executable unavailable/);
  }
});

test("offline Chromium exercises the built homepage and both hosts' settings projections", async t => {
  const chrome = await localChromium();
  if (!chrome) {
    const reason = "Chromium executable unavailable. Install Chromium or point OPENQUANTUM_CHROMIUM or CHROME at its executable.";
    if (process.env.CI === "true" || process.env.OPENQUANTUM_REQUIRE_BROWSER_TESTS === "1") assert.fail("Required browser tests: " + reason);
    return t.skip(reason);
  }
  const dir = await mkdtemp(path.join(tmpdir(), "oq-browser-"));
  const page = await launchChromium(t, chrome, path.join(dir, "profile"));
  t.diagnostic(page.product);
  await t.test("320px and 375px expose the named contact group and contain every visible Lean and VQE text fragment", () => geometry(page));
  await page.viewport(1100);

  // Build from current UI source even when a previous standalone test left a bundle in dist.
  let bundle = path.join(root, "dist/chatgpt");
  if (await access(path.join(bundle, "release.json")).then(() => true, () => false)) {
    bundle = path.join(dir, "bundle");
    await buildChatgpt({ output: bundle, backend: await createBackend() });
  } else await buildChatgpt();
  const snapshotFor = await realHosts(t, dir, bundle);
  const html = await readFile(path.join(bundle, "app.html"), "utf8");
  let snapshot, sequence = 0;
  const server = createServer(async (req, res) => {
    const [route] = req.url.split("?");
    if (req.method === "GET" && ["/Codex", "/Desktop"].includes(route)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(route === "/Desktop" ? html.replace("<head>", '<head><meta name="openquantum-host" content="Desktop">') : html);
    } else if (req.method === "POST" && route === (snapshot.host === "Desktop" ? "/openquantum/api/preparation" : "/settings")) {
      let body = "";
      for await (const chunk of req) body += chunk;
      if (body !== JSON.stringify({ action: "snapshot" })) { res.writeHead(405).end(); return; }
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(snapshot));
    } else res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { address, port } = server.address();
  const origin = `http://${address}:${port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const click = selector => page.evaluate(selector => document.querySelector(selector).click(), selector);
  const clickAccountMetric = () => page.evaluate(() => [...document.querySelectorAll(".metric-card")].find(card => card.innerText.includes("云端服务账户")).click());
  async function open(value) {
    snapshot = value;
    const url = `${origin}/${value.host}?case=${++sequence}`;
    await page.navigate(url + (value.host === "Codex" ? "#preview=fixture" : ""), () => !!document.querySelector(".metric-card"));
  }

  for (const host of ["Codex", "Desktop"]) {
    const empty = await snapshotFor(host);
    await t.test(`${host} account titles lead to all 12 forms and 23 input fields from MCP and Skills`, async () => {
      const groups = credentialEntries(empty.services);
      assert.equal(groups.length, 12);
      for (const tab of ["mcp", "skills"]) {
        await open(empty);
        if (tab === "mcp") await clickAccountMetric(); else { await click("#tab-skills"); await filter(page, "#state", "accounts"); }
        const fields = new Set();
        for (const group of groups) {
          await filter(page, "#search", group.title);
          const expected = tab === "skills" ? empty.skills.filter(skill => skill.relations.credentialServiceIds.some(id => group.serverNames.includes(id))).map(s => s.id)
            : group.serverNames.filter(id => empty.providers.some(p => p.id === id));
          if (tab === "mcp" && group.id === "pasqal_cloud") assert.deepEqual(expected, host === "Codex" ? [] : ["pasqal_cloud"]);
          if (tab === "mcp" && !expected.length) expected.push(...empty.skills
            .filter(skill => skill.relations.credentialServiceIds.some(id => group.serverNames.includes(id))).map(skill => skill.id));
          if (group.id === "ibm_quantum" && tab === "mcp") assert.deepEqual([...expected].sort(), ibmOwners);
          assert.deepEqual(await page.evaluate(readIds), expected.sort(), `${host} ${tab} ${group.title}`);
          for (const owner of expected) {
            const form = await openAccount(page, owner, group.title);
            assert.deepEqual(form.fields, group.fields.map(f => f.name).sort(), `${host} ${owner} ${group.title}`);
            form.fields.forEach(name => fields.add(name));
          }
        }
        assert.equal(fields.size, 23);
      }
    });

    await t.test(`${host} saved IonQ and shared IBM accounts open by title`, async () => {
      for (const [title, field, owners] of [["IonQ", "IONQ_API_KEY", ["quantum_hardware"]], ["IBM Quantum", "QISKIT_IBM_TOKEN", ibmOwners]]) {
        const saved = await snapshotFor(host, [field]);
        for (const width of [375, 1100]) {
          await page.viewport(width);
          await open(saved);
          await clickAccountMetric(); await filter(page, "#state", "configured"); await filter(page, "#search", title);
          assert.deepEqual(await page.evaluate(readIds), owners);
          for (const owner of owners) assert.deepEqual(await openAccount(page, owner, title), { fields: [field], state: "已保存" });
          await filter(page, "#search", title === "IonQ" ? "IBM Quantum" : "IonQ");
          assert.deepEqual(await page.evaluate(readIds), [], "another account on the same owner is still unsaved");
        }
      }
    });

    await t.test(`${host} management includes Pasqal Cloud in all three account views`, async () => {
      await open(await snapshotFor(host, ["PASQAL_AUTH_TOKEN"]));
      await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "管理 MCP 与账户").click());
      assert.equal(await page.evaluate(() => document.querySelector("#state").value), "all");
      await filter(page, "#search", "Pasqal Cloud");
      for (const state of ["all", "accounts", "configured"]) {
        if (state !== "all") await filter(page, "#state", state);
        assert.deepEqual(await page.evaluate(readIds), [pasqalOwner[host]], state);
        assert.equal(await page.evaluate(() => document.querySelector("#catalog-detail .oq-service-credential")?.ariaLabel), "Pasqal Cloud");
        const form = await openAccount(page, pasqalOwner[host], "Pasqal Cloud");
        assert.deepEqual(form, { fields: ["PASQAL_AUTH_TOKEN", "PASQAL_PASSWORD", "PASQAL_USERNAME"], state: "已保存" });
      }
    });

    if (host === "Codex") await t.test("Codex default account details accept spaces and tabs in a pasted Pasqal Cloud title", async () => {
      const saved = await snapshotFor(host, ["PASQAL_AUTH_TOKEN"]);
      for (const width of [375, 1100]) {
        await page.viewport(width);
        for (const query of ["Pasqal Cloud", "Pasqal  Cloud", "Pasqal\tCloud"]) {
          await open(saved);
          await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent === "管理 MCP 与账户").click());
          assert.equal(await page.evaluate(() => document.querySelector("#state").value), "all");
          await filter(page, "#search", query);
          assert.deepEqual(await page.evaluate(readIds), ["pasqal-experiments"], JSON.stringify({ width, query }));
          const selection = await page.evaluate(() => {
            const detail = document.querySelector("#catalog-detail");
            const card = detail.querySelector("article.oq-service-credential");
            return [detail.dataset.entryKey, card?.ariaLabel, card?.querySelector("details")?.open];
          });
          assert.deepEqual(selection, ["skill:pasqal-experiments", "Pasqal Cloud", true]);
        }
      }
    });

    await t.test(`${host} overview distinguishes empty and unread groups and refreshes after recovery`, async () => {
      for (const saved of [[], ["QISKIT_IBM_TOKEN", "IONQ_API_KEY"]]) {
        await open(await snapshotFor(host, saved, true));
        const metric = () => [...document.querySelectorAll(".metric-card")].find(card => card.innerText.includes("云端服务账户")).innerText;
        assert.match(await page.evaluate(metric), new RegExp(`${saved.length}\\s*/ 12`));
        assert.ok((await page.evaluate(metric)).includes(`${saved.length} 已确认保存，1 未读取`));
        assert.ok((await page.accessibleName(".home-metrics .metric-card:last-child")).includes(`${saved.length} 已确认保存，1 未读取`));
        await clickAccountMetric(); await filter(page, "#search", "Pasqal Cloud");
        assert.equal((await openAccount(page, pasqalOwner[host], "Pasqal Cloud")).state, "未读取");
        snapshot = await snapshotFor(host, saved);
        await click("#refresh");
        for (let i = 0; i < 100 && await page.evaluate(() => document.querySelector("#content").getAttribute("aria-busy") === "true"); i++)
          await new Promise(resolve => setTimeout(resolve, 40));
        await click("#tab-runtime");
        assert.doesNotMatch(await page.evaluate(metric), /未读取/);
      }
    });

    await t.test(`${host} row accessibility and detail show all five readiness states`, async () => {
      for (const [firstReady, second, tone, label] of [
        [false, "not_installed", "pending", "关联 Tool 待准备"], [true, "not_installed", "partial", "1 / 2 个 Tool 已准备"],
        [true, "ready", "ready", "关联 Tool 已准备"], [true, "preparing", "working", "正在安装，1 / 2 个 Tool 已准备"],
        [true, "cancelling", "working", "正在取消，1 / 2 个 Tool 已准备"],
      ]) {
        const value = structuredClone(empty);
        Object.assign(value.environments.find(env => env.id === "mcp-qiskit"), { ready: firstReady, state: firstReady ? "ready" : "not_installed" });
        Object.assign(value.environments.find(env => env.id === "mcp-qiskit-docs"), { ready: second === "ready", state: second });
        await open(value); await click("#tab-skills"); await filter(page, "#search", "qiskit-circuit-workbench");
        const selector = row("qiskit-circuit-workbench");
        assert.ok((await page.accessibleName(selector)).includes(label), `${host} accessible row: ${label}`);
        assert.equal(await page.evaluate(s => document.querySelector(s).dataset.tone, selector + " .catalog-dot"), tone);
        await click(selector);
        const pill = await page.evaluate(() => { const p = document.querySelector(".detail-hero .status-pill"); return [p.dataset.tone, p.innerText]; });
        assert.deepEqual(pill, [tone, label]);
        assert.equal(await page.accessibleName(".detail-hero .status-pill", { textNode: true }), label);
      }
    });
  }
});
