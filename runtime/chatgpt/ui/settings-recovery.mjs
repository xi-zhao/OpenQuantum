const savedActions = new Set(["skill.set", "tool.set", "tool.operation.set", "provider.set", "connection.add", "connection.update", "connection.remove", "connection.set", "connection.tool.set"]);

export function isSettingsSave(input) { return savedActions.has(input.action); }

export function sameConnectionDestination(actual, expected) {
  if (!actual || actual.id !== expected.id || actual.transport !== expected.transport || actual.authentication !== expected.authentication) return false;
  if (expected.transport === "http") {
    try { return actual.url === new URL(expected.url).href; } catch { return false; }
  }
  return actual.command === expected.command && JSON.stringify(actual.args) === JSON.stringify(expected.args)
    && (expected.authentication !== "token" || actual.tokenEnv === expected.tokenEnv);
}

// A lost reply is not a failed save. Check the requested state against a fresh
// snapshot without resubmitting the command or accepting a replacement owner.
export function settingsSaveMatches(input, before, after, receipt) {
  if (input.action.endsWith(".set") && typeof input.enabled !== "boolean") return false;
  const previous = before?.connections?.find(item => item.id === input.id);
  const connection = after?.connections?.find(item => item.id === (input.id ?? input.connection?.id));
  if (receipt && input.action.startsWith("connection.") && input.action !== "connection.remove") {
    const saved = receipt.connections?.find(item => item.id === (input.id ?? input.connection?.id));
    if (!saved || saved.instance !== connection?.instance) return false;
  }
  switch (input.action) {
    case "skill.set": return after?.skills?.find(item => item.id === input.id)?.enabled === input.enabled;
    case "tool.set": return after?.tools?.find(item => item.id === input.id)?.enabled === input.enabled;
    case "provider.set": return after?.providers?.find(item => item.id === input.id)?.enabled === input.enabled;
    case "tool.operation.set": return after?.tools?.find(item => item.id === input.id)?.operationOverrides?.find(item => item.id === input.tool)?.enabled === input.enabled;
    case "connection.add": return Boolean(receipt) && !before?.connections?.some(item => item.id === input.connection.id) && sameConnectionDestination(connection, input.connection) && connection.enabled === false;
    case "connection.update": return Boolean(previous) && Boolean(receipt) && sameConnectionDestination(connection, input.connection)
      && (connection.instance === previous.instance || (connection.enabled === false && connection.tools?.length === 0))
      && (!input.resetCredential || connection.credential?.configured === false);
    case "connection.remove": return Boolean(previous) && !connection;
    case "connection.set": return Boolean(previous) && connection?.instance === previous.instance && connection.enabled === input.enabled;
    case "connection.tool.set": return Boolean(previous) && connection?.instance === previous.instance
      && connection.tools?.find(item => item.name === input.tool)?.enabled === input.enabled;
    default: return false;
  }
}

// The queue owns reads and save recovery. Re-reading is safe; retrying an
// unacknowledged command is not. Commands keep the revision visible at click.
export class SettingsSession {
  constructor(request) { this.request = request; this.queue = Promise.resolve(); this.snapshot = undefined; this.pending = null; }
  update(input) {
    const before = this.snapshot;
    const command = { ...input, ...(before && input.action !== "snapshot" ? { revision: before.revision } : {}) };
    if (input.action.startsWith("connection.") && input.id && input.connectionInstance === undefined) {
      command.connectionInstance = before?.connections?.find(item => item.id === input.id)?.instance;
    }
    const next = this.queue.catch(() => {}).then(() => this.perform(command, before));
    this.queue = next;
    return next;
  }
  async refresh() {
    this.snapshot = await this.request({ action: "snapshot" });
    const pending = this.pending;
    this.pending = null;
    return { snapshot: this.snapshot, ...(pending ? { save: pending.input,
      confirmed: settingsSaveMatches(pending.input, pending.before, this.snapshot, pending.receipt), recovered: true } : {}) };
  }
  async perform(input, before) {
    if (input.action === "snapshot") return this.refresh();
    if (this.pending) throw new Error("上次保存结果尚未确认，请先刷新核对；不会重复提交。");
    if (!isSettingsSave(input)) {
      this.snapshot = await this.request(input);
      return { snapshot: this.snapshot };
    }
    this.pending = { input, before };
    try {
      this.pending.receipt = await this.request(input);
      const result = await this.refresh();
      return { ...result, recovered: false };
    } catch (error) {
      try { const result = await this.refresh(); return { ...result, ...(!result.confirmed ? { error: error.message } : {}) }; }
      catch { throw new Error("保存结果暂时无法确认。草稿已保留，请刷新核对后再操作。", { cause: error }); }
    }
  }
}
