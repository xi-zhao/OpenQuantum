// Keep the originating click alive only in this page. A reload, cancellation,
// or teardown must never resume an earlier authorization into a new Star.
export function createGitHubStarController({ request, render, openAuthorization = () => {}, uuid = () => crypto.randomUUID(), schedule = setTimeout, unschedule = clearTimeout }) {
  let active, timer, closed = false, busy = false;
  let value = { state: "loading", message: "正在读取 GitHub 状态…" };
  const show = next => { value = next; if (!closed) render(value); };
  const cancelRequest = id => request({ action: "github.cancel", flowId: id }).catch(() => {});
  const isActive = intent => !closed && active === intent;
  const finish = next => { active = null; busy = false; show(next); };
  async function advance(intent, next) {
    if (!isActive(intent)) { await cancelRequest(intent.id); return; }
    if (["authorizing", "ready"].includes(next.state) && next.flowId !== intent.id) throw new Error("GitHub 授权与此次点击不一致，请重试。");
    if (next.state === "authorizing") {
      busy = false; show(next);
      if (!intent.opened) { intent.opened = true; void openAuthorization(next.verificationUrl); }
      timer = schedule(() => void step(intent, "github.poll"), Math.max(1000, next.pollAfterMs));
    } else if (next.state === "ready") {
      busy = true; show({ ...next, state: "submitting", message: `正在使用 ${next.account} 为 OpenQuantum 点 Star…` });
      await step(intent, "github.star");
    } else finish(next);
  }
  async function step(intent, action) {
    try { await advance(intent, await request({ action, flowId: intent.id })); }
    catch (error) {
      if (!isActive(intent)) return;
      await cancelRequest(intent.id);
      if (isActive(intent)) finish({ state: "error", message: error.message });
    }
  }
  async function refresh() {
    if (busy || active || closed) return;
    busy = true; show({ state: "loading", message: "正在读取 GitHub 状态…" });
    try { show(await request({ action: "github.status" })); }
    catch (error) { show({ state: "error", message: error.message }); }
    finally { busy = false; }
  }
  async function start() {
    if (busy || active || closed) return;
    active = { id: uuid(), opened: false }; busy = true;
    show({ state: "starting", message: "正在准备 GitHub Star…" });
    await step(active, "github.start");
  }
  async function cancel() {
    if (!active || closed || value.state === "submitting") return;
    const intent = active; active = null; busy = true; unschedule(timer);
    show({ state: "canceling", message: "正在取消此次 Star…" });
    try { show(await request({ action: "github.cancel", flowId: intent.id })); }
    catch { show({ state: "error", message: "无法确认取消结果，请刷新 Star 状态。本页面不会继续提交。" }); }
    finally { busy = false; }
  }
  async function disconnect() {
    if (busy || active || closed) return;
    busy = true; show({ state: "disconnecting", message: "正在移除本机授权…" });
    try { show(await request({ action: "github.disconnect" })); }
    catch (error) { show({ state: "error", message: error.message }); }
    finally { busy = false; }
  }
  async function close() {
    closed = true; unschedule(timer);
    const intent = active; active = null;
    if (intent) await cancelRequest(intent.id);
  }
  render(value);
  return { refresh, start, cancel, disconnect, close };
}

export function mountGitHubStar({ request, openLink, root = document }) {
  const $ = selector => root.querySelector(selector);
  const status = $("#github-status"), linkNotice = $("#github-link-notice");
  async function open(url) {
    linkNotice.textContent = "";
    try { await openLink(url); }
    catch { linkNotice.textContent = `未能打开 GitHub，请复制地址到浏览器：${url}`; }
  }
  $("#github-link").onclick = event => { event.preventDefault(); void open(event.currentTarget.href); };
  $("#github-authorize").onclick = event => { event.preventDefault(); void open(event.currentTarget.href); };
  const controller = createGitHubStarController({ request, openAuthorization: open, render: value => {
    const working = ["loading", "starting", "authorizing", "submitting", "canceling", "disconnecting"].includes(value.state);
    const starred = value.state === "starred";
    $("#github-star").disabled = working || starred || ["unavailable", "busy"].includes(value.state);
    $("#github-star").textContent = starred ? "★ 已 Star，感谢支持" : value.state === "submitting" ? "正在点 Star…" : "☆ 给 OpenQuantum 点个 Star";
    $("#github-refresh").disabled = working;
    $("#github-disconnect").disabled = working || value.state === "unavailable";
    $("#github-disconnect").hidden = ["loading", "unavailable", "signed_out"].includes(value.state);
    $("#github-auth").hidden = value.state !== "authorizing";
    $("#github-code").textContent = value.state === "authorizing" ? value.userCode : "";
    status.textContent = value.message;
    status.classList.toggle("error", value.state === "error");
  } });
  $("#github-star").onclick = controller.start;
  $("#github-refresh").onclick = controller.refresh;
  $("#github-cancel").onclick = controller.cancel;
  $("#github-disconnect").onclick = controller.disconnect;
  return controller;
}
