"use client";

import type {
  WorkspaceAcceptanceStatus,
  WorkspaceScientificActivity,
  WorkspaceScientificRuntimeStatus,
  WorkspaceScientificStatus,
} from "@/harness/interface";

interface ScientificActivityPanelProps {
  activities: readonly WorkspaceScientificActivity[];
}

const RUNTIME_LABELS: Record<WorkspaceScientificRuntimeStatus, string> = {
  running: "运行：执行中",
  completed: "运行：已完成",
  failed: "运行：失败",
};

const SCIENTIFIC_LABELS: Record<WorkspaceScientificStatus, string> = {
  not_available: "科学：暂无结论",
  not_evaluated: "科学：尚未验收",
  observations_available: "科学：已有逐项观察",
  acceptance_available: "科学：已有整体验收",
};

const ACCEPTANCE_LABELS: Record<WorkspaceAcceptanceStatus, string> = {
  passed: "验收：通过",
  conditional: "验收：有条件",
  failed: "验收：未通过",
};

function runtimeTone(status: WorkspaceScientificRuntimeStatus): string {
  if (status === "failed") {
    return "border-[#efb8bd] bg-[#fff5f5] text-[#9f2633]";
  }
  if (status === "running") {
    return "border-[#f1d48b] bg-[#fffaf0] text-[#86620d]";
  }
  return "border-[#b9ddd8] bg-[#f1fbf9] text-[#0b776e]";
}

function acceptanceTone(status: WorkspaceAcceptanceStatus): string {
  if (status === "passed") {
    return "border-[#b9ddd8] bg-[#f1fbf9] text-[#0b776e]";
  }
  if (status === "conditional") {
    return "border-[#f1d48b] bg-[#fffaf0] text-[#86620d]";
  }
  return "border-[#efb8bd] bg-[#fff5f5] text-[#9f2633]";
}

export function ScientificActivityPanel({
  activities,
}: ScientificActivityPanelProps) {
  if (activities.length === 0) return null;

  return (
    <section
      aria-label="科学结果与验收状态"
      className="space-y-3 border-t border-[#e1e8ec] py-6"
    >
      <div>
        <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0b776e]">
          SCIENTIFIC RECORDS
        </div>
        <h2 className="mt-1 text-sm font-semibold text-[#243845]">
          Harness 科学工具记录
        </h2>
      </div>

      {activities.map((activity) => (
        <article
          key={activity.id}
          className="rounded-2xl border border-[#dce5ea] bg-white/90 p-4 shadow-[0_8px_28px_rgba(7,19,31,.04)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#6a7f8c]">
                {activity.capabilityId} · {activity.operation}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-[#162936]">
                {activity.title}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
              <span
                className={`rounded-full border px-2.5 py-1 ${runtimeTone(
                  activity.runtimeStatus,
                )}`}
              >
                {RUNTIME_LABELS[activity.runtimeStatus]}
              </span>
              <span className="rounded-full border border-[#d3dfe5] bg-[#f7fafb] px-2.5 py-1 text-[#526673]">
                {SCIENTIFIC_LABELS[activity.scientificStatus]}
              </span>
              {activity.acceptanceStatus ? (
                <span
                  className={`rounded-full border px-2.5 py-1 ${acceptanceTone(
                    activity.acceptanceStatus,
                  )}`}
                >
                  {ACCEPTANCE_LABELS[activity.acceptanceStatus]}
                </span>
              ) : null}
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#526673]">
            {activity.summary}
          </p>

          {activity.details.length > 0 ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {activity.details.map((item) => (
                <div
                  key={`${item.label}:${item.value}`}
                  className="rounded-xl bg-[#f7fafb] px-3 py-2"
                >
                  <dt className="text-[10px] font-medium text-[#6a7f8c]">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-[#243845]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </article>
      ))}
    </section>
  );
}
