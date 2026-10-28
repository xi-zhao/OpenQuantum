// Test only the actual launcher against local HTTP fixtures; no user data or model.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createServer } = require('node:http');
const { setTimeout: wait } = require('node:timers/promises');
const { app, BrowserWindow } = require('electron');
const [bundle, profile, root] = process.argv.slice(2);
app.setPath('userData', profile);
app.commandLine.appendSwitch('disable-background-networking');
app.on('window-all-closed', () => {});

let host, child, window;
async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return 'http://127.0.0.1:' + server.address().port; }
async function until(read) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) { if (await read()) return; await wait(20); }
  assert.ok(await read(), 'expected launcher state did not appear');
}
async function main() {
  const { createLearningHandler } = await import(pathToFileURL(path.join(root, 'runtime/openquantum/web-learning/index.mjs')));
  const javascript = await fs.readFile(bundle, 'utf8');
  let ready = false, healthy = true, opens = 0, checks = 0, loads = 0, parentOrigin, origin;
  child = createServer((request, response) => {
    response.setHeader('content-type', 'text/html');
    if (request.url === '/ready') { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ ready })); return; }
    loads++;
    response.end('<textarea aria-label="draft"></textarea><script>let announced=false;setInterval(async()=>{const state=await fetch("/ready").then(r=>r.json());if(state.ready&&!announced){announced=true;parent.postMessage({channel:"openquantum.learning.theme.v1",type:"ready"},' + JSON.stringify(parentOrigin) + ');}},20);</script>');
  });
  origin = await listen(child);
  const handler = createLearningHandler({
    requestRejection: () => undefined,
    dispatch: () => assert.fail('no course or model action is allowed in the launcher check'),
    openUi: (parent) => { opens++; assert.equal(parent, parentOrigin); return { parent, origin, url: origin + '/' }; },
    uiStatus: (parent) => { checks++; assert.equal(parent, parentOrigin); return { state: healthy ? 'ready' : 'unavailable' }; },
  });
  host = createServer((request, response) => {
    if (request.url === '/openquantum/api/learning') { void handler(request, response); return; }
    response.setHeader('content-type', 'text/html');
    response.end('<div id="root"></div><script>window.frameLoads=0;document.addEventListener("load",e=>{if(e.target.tagName==="IFRAME")window.frameLoads++;},true);' + javascript + '</script>');
  });
  parentOrigin = await listen(host);
  window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const js = code => window.webContents.executeJavaScript(code);
  await window.loadURL(parentOrigin);
  await until(() => js('Boolean(document.querySelector("[aria-label=打开量子学习通]"))'));
  await js('document.querySelector("[aria-label=打开量子学习通]").click()');
  await until(() => js('window.frameLoads>0'));
  assert.equal(await js('Boolean(document.querySelector(".oq-learning-loading"))'), true, 'iframe load alone must not mark a page ready');
  await js('window.postMessage({channel:"openquantum.learning.theme.v1",type:"ready"},"*")');
  await wait(80);
  assert.equal(await js('Boolean(document.querySelector(".oq-learning-loading"))'), true, 'wrong-window ready message ignored');
  ready = true;
  await until(() => js('Boolean(document.querySelector("iframe"))&&!document.querySelector(".oq-learning-loading")'));
  await js('window.oldClassroomPeer=document.querySelector("iframe").contentWindow;undefined');
  const classroomFrame = window.webContents.mainFrame.frames.find(frame => frame.url.startsWith(origin));
  assert.ok(classroomFrame);
  await classroomFrame.executeJavaScript('document.querySelector("textarea").value="unsaved classroom draft"');
  healthy = false;
  await until(() => js('document.querySelector("[role=alert]")?.textContent.includes("课堂暂时不可用")'));
  assert.equal(await js('document.querySelector("iframe")?.contentWindow===window.oldClassroomPeer'), true);
  assert.equal(await classroomFrame.executeJavaScript('document.querySelector("textarea").value'), 'unsaved classroom draft');
  await wait(80); assert.equal(opens, 1, 'connection failure must not start another course or reopen automatically');
  assert.equal(loads, 1, 'background health failure must retain the existing iframe');
  healthy = true; ready = false;
  await js('document.querySelector(".oq-learning-notice button").click()');
  await until(() => js('window.frameLoads===2'));
  await js('window.dispatchEvent(new MessageEvent("message",{source:window.oldClassroomPeer,origin:' + JSON.stringify(origin) + ',data:{channel:"openquantum.learning.theme.v1",type:"ready"}}))');
  await wait(80);
  assert.equal(await js('Boolean(document.querySelector(".oq-learning-loading"))'), true, 'the previous iframe cannot ready the replacement');
  ready = true;
  await until(() => js('Boolean(document.querySelector("iframe"))&&!document.querySelector(".oq-learning-loading")'));
  assert.equal(opens, 2);
  await js('document.querySelector(".oq-learning-return").click()');
  await until(() => js('!document.querySelector("iframe")'));
  await wait(80); const closedChecks = checks; await wait(80); assert.equal(checks, closedChecks, 'polling stops with the launcher');
  console.log(JSON.stringify({ openRequests: opens, frameLoads: loads, genericLoadNotReady: true, foreignPeerIgnored: true, previousPeerIgnored: true, disconnectionExposed: true, unsavedDraftPreserved: true, explicitRetryRestores: true, pollingStopsOnClose: true }));
}
app.whenReady().then(main).then(() => {
  window?.destroy(); host?.closeAllConnections(); child?.closeAllConnections(); host?.close(); child?.close(); app.exit(0);
}).catch(error => { console.error(error.stack); window?.destroy(); host?.closeAllConnections(); child?.closeAllConnections(); host?.close(); child?.close(); app.exit(1); });
