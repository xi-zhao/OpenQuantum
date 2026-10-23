import path from "node:path";
import os from "node:os";
import { skillEnabled } from "./application.mjs";
import { Environments } from "./environments.mjs";
import { Credentials } from "./credentials.mjs";
import { serviceById, serviceValues, missingFields } from "./service-catalog.mjs";
import { preparedPythonLaunch } from "../../lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../lib/local-json-process.mjs";
import { redactCredentialValues } from "./redaction.mjs";

const commands = {
  device: ["--project-id", "--region", "--device", "--out"],
  submit: ["--plan", "--receipt", "--approve-plan", "--parent-receipt"],
  recover: ["--receipt", "--batch-id", "--plan"],
  close: ["--receipt", "--confirm"], cancel: ["--receipt", "--confirm"],
  harvest: ["--receipt", "--out"],
};
const required = {
  device: ["--project-id", "--device", "--out"], submit: ["--plan", "--receipt", "--approve-plan"],
  recover: ["--receipt"], close: ["--receipt", "--confirm"], cancel: ["--receipt", "--confirm"], harvest: ["--receipt", "--out"],
};
export function validatePasqalCommand(args) {
  const options = commands[args[0]], seen = new Set();
  if (!options || args.length > 20) throw new Error("此入口仅支持 Pasqal 云端操作；本地准备和分析使用原有 Python 入口。");
  for (let i = 1; i < args.length; i++) {
    const option = args[i];
    if (!options.includes(option) || seen.has(option)) throw new Error("Pasqal 操作参数无效。");
    seen.add(option);
    if (option === "--confirm") continue;
    const value = args[++i];
    if (typeof value !== "string" || !value.trim() || value.startsWith("-") || value.length > 4096 || /[\r\n\0]/.test(value)) throw new Error("Pasqal 操作参数无效。");
    if (option === "--region" && !["fr", "sa"].includes(value)) throw new Error("Pasqal region 必须是 fr 或 sa。");
  }
  if (required[args[0]].some(key => !seen.has(key))) throw new Error("Pasqal 操作缺少必要参数或明确确认。");
}

// A credential boundary for the existing reviewed workflow, invoked by the
// host's code Tool. Never a generic SDK executor or a secret-export endpoint.
export async function runPasqalWorkflow(args, {
  root, pluginRoot, directory = process.env.OPENQUANTUM_PLUGIN_SETTINGS_HOME || path.join(os.homedir(), ".openquantum/plugins/codex"),
  settings,
  credentials = new Credentials(process.env.OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE ? { service: process.env.OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE } : {}),
  environments = new Environments({ root, directory }), execute = runLocalJsonProcess, launch = preparedPythonLaunch,
  cwd = process.cwd(), signal, stateRoot = process.env.OPENQUANTUM_PASQAL_STATE_ROOT, authorizeOperation = async () => true,
} = {}) {
  validatePasqalCommand(args);
  if (stateRoot && (!path.isAbsolute(stateRoot) || /[\r\n\0]/.test(stateRoot))) throw new Error("Pasqal 提交记录目录必须是有效绝对路径。");
  signal?.throwIfAborted();
  const authorize = async () => {
    if (!await authorizeOperation()) throw new Error("用户已禁止此 Pasqal Tool 或 MCP，操作未执行。");
    if (!settings) throw new Error("Pasqal 缺少插件使用策略，请检查安装。");
    const { config, codex } = await settings.read();
    const allowed = settings.skillPolicy ? settings.skillPolicy.enabled(codex, "pasqal-experiments")
      : skillEnabled(codex, "pasqal-experiments", path.join(pluginRoot, "skills"));
    if (!allowed) throw new Error("Pasqal Skill 已关闭，请先在设置中启用。");
    if (!settings.sdkAllowed(config, codex, "pulser-dynamics")) throw new Error("用户已禁止关联的 Skill、Tool 或 MCP；不能通过 Pasqal 工作流绕过。");
    signal?.throwIfAborted();
  };
  await authorize();
  const lease = await environments.acquire("pulser-dynamics", `pasqal:${args[0]}`);
  try {
    await authorize();
    const service = serviceById("pasqal_cloud");
    const values = await serviceValues(credentials, service);
    if (missingFields(service, values).length) throw new Error("请在 OpenQuantum 设置 → 凭据 → Pasqal Cloud 保存 Token，或配齐用户名与密码。");
    const authentication = values.PASQAL_AUTH_TOKEN ? { PASQAL_AUTH_TOKEN: values.PASQAL_AUTH_TOKEN }
      : { PASQAL_USERNAME: values.PASQAL_USERNAME, PASQAL_PASSWORD: values.PASQAL_PASSWORD };
    const runner = path.join(root, ".agents/skills/pasqal-experiments/scripts/experiment.py");
    // -I excludes cwd, user site and PYTHON* injection. Only the fixed bundled
    // directory is re-added; no caller script/module can run with these secrets.
    const bootstrap = "import pathlib,runpy,sys; p=sys.argv.pop(1); sys.path.insert(0,str(pathlib.Path(p).parent)); runpy.run_path(p,run_name='__main__')";
    const python = await launch({ skillRoot: path.join(root, ".agents/skills/pulser-dynamics"),
      environment: environments.environment, args: ["-I", "-c", bootstrap, runner, ...args] });
    const env = { ...environments.environment, ...(stateRoot ? { OPENQUANTUM_PASQAL_STATE_ROOT: stateRoot } : {}), ...authentication };
    let result;
    try {
      await authorize();
      const output = await execute({ command: python.command, args: python.args, cwd, env, signal, input: null,
        timeoutMs: 0, maxOutputBytes: 2 * 1024 * 1024, label: "Pasqal cloud", notFoundMessage: "Pasqal Python 环境不可用，请在设置中检查。" });
      result = { exitCode: 0, stdout: JSON.stringify(output) + "\n", stderr: "" };
    } catch (error) {
      // The shared process adapter reaps its owned process tree before settling.
      result = { exitCode: 1, stdout: "",
        stderr: signal?.aborted ? "操作已中断；云端结果可能未知，请保留收据并恢复查询，不要直接重发。\n"
          : `${error.message}\nPasqal 操作未完成，请检查环境和收据；本次不会自动重试。\n` };
    }
    return redactCredentialValues(result, Object.values(values));
  } finally { await lease.release(); }
}
