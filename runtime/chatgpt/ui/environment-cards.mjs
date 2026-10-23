import { environmentState } from "./settings-model.mjs";

export function environmentLabel(environment) { return environmentState(environment).label; }

export function environmentPanel(environment, { element, button, run, drafts, expanded }) {
  const panel = element("section", undefined, "environment-panel");
  panel.setAttribute("aria-label", "运行环境");
  const running = ["preparing", "cancelling"].includes(environment.state);
  const unavailable = environment.state === "unsupported_platform";
  const invoke = operation => run({ action: `environment.${operation}`, id: environment.id, ...(operation === "cancel" ? { jobId: environment.job.id } : {}) });
  const actions = element("div", undefined, "environment-actions");
  const state = environmentState(environment);
  const note = environment.requirements.note;
  panel.append(element("strong", `${environment.title} · ${state.label}`, environment.ready ? "hint prepared" : "hint"));
  if (environment.state === "unreadable") panel.append(element("p", "请检查环境目录的读取与执行权限，再重新检查。", "environment-error"));
  if (running) {
    const progress = element("div", undefined, "environment-progress");
    progress.setAttribute("role", "status");
    progress.append(element("span", undefined, "progress-dot"), element("span", environment.job?.phase || "准备操作"));
    panel.append(progress, element("p", "关闭页面不会中断操作，重新打开可继续查看进度。", "hint"));
    const cancel = button(environment.state === "cancelling" ? "等待进程退出…" : "取消操作", () => invoke("cancel"));
    cancel.disabled = environment.state === "cancelling"; actions.append(cancel);
  } else if (state.action && !unavailable) actions.append(button(state.actionLabel, () => invoke(state.action), "primary"));
  if (environment.job?.message && environment.state === "failed") panel.append(element("p", environment.job.message, "environment-error"));
  if (actions.childElementCount) panel.append(actions);
  const fields = environment.requirements.fields;
  if (fields.length) {
    const details = element("details", undefined, "environment-configuration");
    const key = `environment:${environment.id}`;
    details.open = expanded.get(key) ?? environment.state === "needs_configuration";
    details.ontoggle = () => { if (details.isConnected) expanded.set(key, details.open); };
    details.append(element("summary", environment.state === "needs_configuration" ? "修正配置" : "可选配置"));
    if (environment.state === "needs_configuration") details.append(element("p", "配置文件已不存在。请选择有效文件，或清空后使用默认环境。", "environment-error"));
    const draft = drafts.get(environment.id) ?? { revision: environment.configurationRevision, values: { ...environment.configuration } };
    const form = element("form");
    const conflict = draft.revision !== environment.configurationRevision;
    if (conflict) form.append(element("p", "配置已在另一页面更新。请载入最新配置后重新编辑。", "environment-error"),
      button("载入最新配置", () => { drafts.delete(environment.id); run({ action: "snapshot" }); }));
    for (const field of fields) {
      const label = element("label", `${field.title}（${field.required ? "必填" : "可选"}）`);
      const input = element("input"); input.type = "text"; input.placeholder = field.placeholder;
      input.value = draft.values[field.name] ?? "";
      input.dataset.focusKey = `${environment.id}:${field.name}`;
      input.disabled = running || unavailable;
      input.oninput = () => { draft.values[field.name] = input.value; drafts.set(environment.id, draft); };
      label.append(input, element("span", field.description, "hint")); form.append(label);
    }
    const save = element("button", "保存配置", "primary"); save.type = "submit"; save.disabled = running || unavailable || conflict;
    form.append(element("p", "保存后按页面提示完成准备，已有启用选择会保留。", "hint"), save);
    form.onsubmit = event => { event.preventDefault(); run({ action: "environment.configure", id: environment.id,
      configuration: draft.values, configurationRevision: draft.revision }); };
    details.append(form); panel.append(details);
  }
  const maintenance = element("details", undefined, "environment-maintenance");
  const key = `maintenance:${environment.id}`;
  maintenance.open = expanded.get(key) ?? false;
  maintenance.ontoggle = () => { if (maintenance.isConnected) expanded.set(key, maintenance.open); };
  maintenance.append(element("summary", "环境详情"), element("p", note, "hint"));
  if (environment.requirements.prerequisite) maintenance.append(element("p", environment.requirements.prerequisite, "hint"));
  if (environment.checkedAt) maintenance.append(element("p", `最近检查：${new Date(environment.checkedAt).toLocaleString()}`, "hint"));
  for (const check of environment.checks ?? []) maintenance.append(element("p", check, "hint"));
  if (environment.job?.message && !running && environment.job.status !== "completed") maintenance.append(element("p", `上次操作：${environment.job.message}`, "hint"));
  if (!running && !unavailable) {
    if (state.action !== "check") maintenance.append(button(environment.ready ? "重新检查" : "检查已有环境", () => invoke("check")));
    if (state.action !== "install" && !["needs_configuration", "unreadable"].includes(environment.state)) maintenance.append(button("重新安装环境", () => invoke("install")));
  }
  panel.append(maintenance);
  return panel;
}
