"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  HarnessUiSessionId,
  WorkspaceSessionSummary,
} from "@/harness/interface";

import {
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";

const navigationItems = [
  { label: "工作台", href: "/#workspace", active: true },
  { label: "运行底座", href: "/#runtime", active: false },
  { label: "量子 Skill / MCP", href: "/#runtime", active: false },
] as const;

export interface SidebarProps {
  isOpen: boolean;
  sessions: readonly WorkspaceSessionSummary[];
  activeSessionId: HarnessUiSessionId | null;
  isCreating: boolean;
  isRuntimeReady: boolean;
  onClose: () => void;
  onCreateConversation: () => void;
  onSelectSession: (sessionId: HarnessUiSessionId) => void;
}

function sessionTime(updatedAt: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

export function Sidebar({
  isOpen,
  sessions,
  activeSessionId,
  isCreating,
  isRuntimeReady,
  onClose,
  onCreateConversation,
  onSelectSession,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const visibleSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return sessions;
    }

    return sessions.filter((session) =>
      session.title.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, sessions]);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="关闭侧栏"
          className="fixed inset-0 z-40 bg-[#07131f]/45 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-[#173042] bg-[#07131f] text-white transition-transform duration-150 ease-[cubic-bezier(.4,0,.2,1)] lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-3 border-b border-[#173042] p-3">
          <div className="flex w-full items-center gap-1 px-2 py-1.5">
            <Link
              href="/"
              aria-label="返回 openquantum 首页"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 transition-colors duration-150 hover:bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/openquantum/mark.svg"
                alt=""
                width="32"
                height="32"
                className="h-8 w-8 shrink-0"
              />
              <span className="min-w-0">
                <span className="block truncate text-[15px] leading-5 font-semibold tracking-[-0.025em] text-white">
                  openquantum
                </span>
                <span className="block font-mono text-[9px] leading-3 tracking-[0.16em] text-[#7fa2ae]">
                  RESEARCH CONSOLE
                </span>
              </span>
            </Link>

            <div className="group/nav relative shrink-0">
              <button
                type="button"
                aria-label="站内导航"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs leading-4 text-[#9bb3bc] transition-colors duration-150 hover:bg-white/5 hover:text-white"
              >
                <span>功能</span>
                <ChevronDownIcon className="text-[#6d8b96]" />
              </button>

              <div className="invisible absolute left-0 top-full z-30 w-36 pt-1 opacity-0 transition duration-150 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100">
                <nav
                  aria-label="站内链接"
                  className="rounded-xl border border-[#dce5ea] bg-white py-1 shadow-[0_18px_48px_rgba(7,19,31,.22)]"
                >
                  {navigationItems.map((item) => {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        aria-current={item.active ? "page" : undefined}
                        onClick={onClose}
                        className={
                          item.active
                            ? "block bg-[#e8f8f5] px-3 py-2 text-sm font-medium leading-5 text-[#0b776e] transition-colors"
                            : "block px-3 py-2 text-sm leading-5 text-[#526673] transition-colors hover:bg-[#f3f7f8] hover:text-[#07131f]"
                        }
                      >
                        {item.label}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isCreating || !isRuntimeReady}
            onClick={onCreateConversation}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#2dd4bf] py-2 text-sm font-semibold leading-5 text-[#07131f] shadow-[0_8px_24px_rgba(45,212,191,.16)] transition-colors duration-150 hover:bg-[#5ee4d2] disabled:cursor-not-allowed disabled:opacity-65"
          >
            <PlusIcon />
            {isCreating ? "正在创建…" : "新建对话"}
          </button>

          <div className="relative">
            <SearchIcon className="absolute top-3 left-3 text-[#668590]" />
            <input
              type="text"
              placeholder="搜索"
              aria-label="搜索历史对话"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#1b3647] bg-[#0d2230] py-2 pr-3 pl-9 text-sm leading-5 text-white outline-none placeholder:text-[#668590] focus:border-[#2dd4bf]"
            />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {visibleSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const hasPendingInteraction =
              session.pendingInteractionCount > 0;

            return (
              <button
                key={session.id}
                type="button"
                disabled={!isRuntimeReady}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                  isActive
                    ? "border-[#2b5a60] bg-[#11313d]"
                    : "border-transparent hover:border-[#1b3647] hover:bg-[#0d2230]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      hasPendingInteraction
                        ? "animate-pulse bg-[#f4bd55]"
                        : session.running
                          ? "animate-pulse bg-[#2dd4bf]"
                          : "bg-[#466571]"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#dbe8ec]">
                    {session.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {hasPendingInteraction ? (
                      <span className="rounded-full bg-[#f4bd55] px-2 py-0.5 text-[9px] font-bold text-[#402d0c] shadow-[0_0_0_2px_rgba(244,189,85,.12)]">
                        待回应 {session.pendingInteractionCount}
                      </span>
                    ) : null}
                    <span className="font-mono text-[9px] text-[#668590]">
                      {sessionTime(session.updatedAt)}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}

          {visibleSessions.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-dashed border-[#1b3647] px-4 py-8 text-center text-sm leading-5 text-[#668590]">
              <div>{query ? "没有匹配的会话" : "还没有会话"}</div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#173042] p-4 font-mono text-[9px] tracking-[0.14em] text-[#57737e]">
          OPEN SCIENCE · LOCAL FIRST
        </div>
      </aside>
    </>
  );
}
