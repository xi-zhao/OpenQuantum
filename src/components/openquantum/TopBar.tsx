"use client";

import { LayoutSidebarIcon } from "./icons";
import type { WorkspaceConnectionStatus } from "@/harness/interface";

export interface TopBarProps {
  runtimeStatus: WorkspaceConnectionStatus;
  onOpenSidebar: () => void;
}

const STATUS_LABELS: Record<WorkspaceConnectionStatus, string> = {
  reconnecting: "正在连接",
  online: "Harness 在线",
  offline: "Harness 离线",
};

export function TopBar({ runtimeStatus, onOpenSidebar }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#dce5ea]/80 bg-[#f7fafb]/80 px-3 py-2 backdrop-blur-xl lg:px-4">
      <button
        type="button"
        aria-label="打开侧栏"
        className="rounded-xl border border-[#dce5ea] bg-white p-2 text-[#162936] shadow-sm transition-colors duration-150 hover:border-[#83dacf] lg:hidden"
        onClick={onOpenSidebar}
      >
        <LayoutSidebarIcon />
      </button>

      <div className="hidden flex-1 lg:block" />

      <div className="relative flex items-center gap-3">
        <span className="hidden font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6a7f8c] sm:inline">
          openquantum console
        </span>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#d3dfe5] bg-white px-3 py-1.5 text-xs font-medium leading-4 text-[#314653] shadow-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              runtimeStatus === "online"
                ? "bg-[#18b7a5]"
                : runtimeStatus === "offline"
                  ? "bg-[#e05a67]"
                  : "animate-pulse bg-[#d4a72c]"
            }`}
          />
          {STATUS_LABELS[runtimeStatus]}
        </div>
      </div>
    </header>
  );
}
