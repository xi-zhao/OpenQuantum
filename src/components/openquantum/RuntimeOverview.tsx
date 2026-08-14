const runtimeItems = [
  {
    label: "HARNESS",
    title: "DeepSeek Harness",
    description: "会话、工具、审批与事件日志",
  },
  {
    label: "SKILL",
    title: "原生量子 Skill",
    description: "领域规则、MCP、Validator 与评测",
  },
  {
    label: "MODEL",
    title: "云模型路由",
    description: "Kimi / GLM 通过服务端安全接入",
  },
] as const;

export function RuntimeOverview() {
  return (
    <section id="runtime" className="mt-8 pt-2">
      <div className="mb-3 px-1">
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0b776e]">
          PLATFORM FOUNDATION
        </p>
        <h2 className="mt-1 text-sm font-semibold text-[#162936]">
          复用 Harness，扩展量子科研能力
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {runtimeItems.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#dce5ea] bg-white/80 px-4 py-4 shadow-[0_8px_28px_rgba(7,19,31,.035)]"
          >
            <div className="font-mono text-[9px] font-semibold tracking-[0.18em] text-[#0f9f91]">
              {item.label}
            </div>
            <div className="mt-2 text-sm font-semibold text-[#162936]">
              {item.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-[#647884]">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
