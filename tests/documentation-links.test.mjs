import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parse, postprocess, preprocess } from "micromark";

const root = fileURLToPath(new URL("..", import.meta.url));

function included(file) {
  if (file.startsWith(".agents/skills/pasqal-experiments/upstream/")
      || file.startsWith("docs/integrations/evidence/")) return false;
  return /^[^/]+\.md$/i.test(file)
    || /^docs\/.+\.md$/i.test(file)
    || /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(file);
}

// CommonMark permits an unclosed fence through EOF. Inspect concrete tokens to
// reject that case without confusing longer fences, list/quote containers or
// indented code with independent fenced blocks. These parsers already ship in
// the locked dependency tree; this test adds no production dependency.
function unclosedFences(source) {
  const events = postprocess(parse().document().write(preprocess()(source, undefined, true)));
  const errors = [];
  let block;
  for (const [event, token] of events) {
    if (event === "enter" && token.type === "codeFenced") {
      block = { line: token.start.line, fences: 0 };
    } else if (event === "enter" && token.type === "codeFencedFence") {
      block.fences += 1;
    } else if (event === "exit" && token.type === "codeFenced") {
      if (block.fences !== 2) errors.push(block.line);
      block = undefined;
    }
  }
  return errors;
}

function linkDestinations(source) {
  const links = [];
  function visit(node) {
    if (["link", "image", "definition"].includes(node.type)) {
      links.push({ url: node.url, line: node.position.start.line });
    }
    if (node.type === "html") {
      const html = node.value.replace(/<!--[\s\S]*?-->/g, "");
      for (const match of html.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        links.push({ url: match[1] ?? match[2] ?? match[3], line: node.position.start.line });
      }
    }
    // Code and inlineCode are leaves: their apparent links are never visited.
    for (const child of node.children ?? []) visit(child);
  }
  visit(fromMarkdown(source));
  return links;
}

function relativeDestination(url) {
  const value = url.trim();
  if (!value || value.startsWith("#") || value.startsWith("/")
      || /^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  // Explicit template values, including URL-encoded placeholders, are examples.
  const decoded = decodeURIComponent(value);
  if (/\$\{|\{\{|\}\}|<[^>]*>|(?:^|\/)\*+(?:\/|$)/.test(decoded)) return null;
  const local = value.split(/[?#]/, 1)[0];
  return local ? decodeURIComponent(local) : null;
}

const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0").filter(included);
const documents = await Promise.all(files.map(async (file) => ({
  file, source: await readFile(path.join(root, file), "utf8"),
})));

test("documentation guard covers tracked roots, docs and owned Skill instructions", () => {
  for (const file of ["README.md", "CURRENT.md", "docs/README.md", ".agents/skills/qpanda-qubo/SKILL.md"]) {
    assert.ok(files.includes(file), file);
  }
  for (const file of ["docs/integrations/evidence/example.md", ".agents/skills/pasqal-experiments/upstream/SKILL.md", "node_modules/demo/README.md"]) {
    assert.equal(included(file), false, file);
  }
});

test("documentation guard understands fence containers and genuine missing closures", () => {
  assert.deepEqual(unclosedFences("````md\n```js\nx\n```\n````\n> ~~~\n> x\n> ~~~\n- ```\n  x\n  ```"), []);
  assert.deepEqual(unclosedFences("```js\nx"), [1]);
  assert.deepEqual(unclosedFences("```js\nx\n    ```"), [1]);
  assert.deepEqual(unclosedFences("~~~\nx\n~~"), [1]);
  assert.deepEqual(unclosedFences("    ```\n    not a fenced block"), []);
});

test("documentation guard finds inline, image, reference and HTML links outside code", () => {
  const source = "[one](../file.md#part) ![two](<img space.png>) [ref][r]\n\n[r]: data/local.json\n\n<img src='assets/a.svg'>\n\n`[inline](ignored.md)`\n\n```md\n[x](ignored.md)\n```";
  assert.deepEqual(linkDestinations(source).map(({ url }) => url), ["../file.md#part", "img space.png", "data/local.json", "assets/a.svg"]);
  for (const external of ["https://example.org", "mailto:me@example.org", "data:image/png;base64,abc", "#section", "plugin://example", "${ROOT}/example", "{{path}}", "docs/<name>.md"]) {
    assert.equal(relativeDestination(external), null, external);
  }
  assert.equal(relativeDestination("assets/img%20space.png?size=2#part"), "assets/img space.png");
});

test("all tracked documentation fenced code blocks close", (t) => {
  const failures = documents.flatMap(({ file, source }) => unclosedFences(source)
    .map((line) => `${file}:${line}: unclosed fenced code block`));
  t.diagnostic(`Scanned ${documents.length} tracked Markdown files`);
  assert.deepEqual(failures, []);
});

test("all tracked documentation local links and images resolve inside the repository", async (t) => {
  const failures = [];
  let checked = 0;
  for (const { file, source } of documents) {
    for (const { url, line } of linkDestinations(source)) {
      try {
        const relative = relativeDestination(url);
        if (relative === null) continue;
        checked += 1;
        const target = path.resolve(root, path.dirname(file), relative);
        const within = path.relative(root, target);
        assert.ok(within !== ".." && !within.startsWith(`..${path.sep}`) && !path.isAbsolute(within), "target escapes repository");
        const info = await stat(target);
        assert.ok(info.isFile() || info.isDirectory(), "target is not a file or directory");
      } catch (error) {
        failures.push(`${file}:${line}: ${url} (${error.code ?? error.message})`);
      }
    }
  }
  t.diagnostic(`Checked ${checked} local links across ${documents.length} tracked Markdown files`);
  assert.deepEqual(failures, []);
});
