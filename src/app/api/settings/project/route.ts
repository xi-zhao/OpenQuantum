import {
  parseHarnessRequest,
} from "../../../../harness/server/browser-boundary.mjs";
import {
  registerMcpSettings,
  ProjectSettingsConflictError,
  readProjectSettings,
  removeMcpSettings,
  removeSkillSettings,
  updateMcpSettings,
  updateSkillSettings,
} from "../../../../settings/server/project-settings.mjs";

export const dynamic = "force-dynamic";

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const { body, error } = await parseHarnessRequest(request);
  if (error) {
    return error;
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "设置请求必须是对象" }, 400);
  }
  const command = body as Record<string, unknown>;

  try {
    switch (command.action) {
      case "snapshot":
        return json(await readProjectSettings(process.cwd()));
      case "skill.update":
        return json(await updateSkillSettings(process.cwd(), command));
      case "skill.remove":
        return json(await removeSkillSettings(process.cwd(), command));
      case "mcp.update":
        return json(await updateMcpSettings(process.cwd(), command));
      case "mcp.register":
        return json(await registerMcpSettings(process.cwd(), command));
      case "mcp.remove":
        return json(await removeMcpSettings(process.cwd(), command));
      default:
        return json({ error: "未知设置命令" }, 400);
    }
  } catch (caught) {
    if (caught instanceof ProjectSettingsConflictError) {
      return json({ error: caught.message }, 409);
    }
    if (caught instanceof TypeError) {
      return json({ error: caught.message }, 400);
    }
    console.error("OpenQuantum project settings failed", caught);
    return json({ error: "项目设置暂时不可用" }, 500);
  }
}
