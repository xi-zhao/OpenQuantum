"use client";

import { useState } from "react";

import type { HarnessUiPort } from "@/harness/interface";
import type { OpenQuantumSettingsPort } from "@/settings/interface";

import { ConversationPanel } from "./ConversationPanel";
import { HeroHeader } from "./HeroHeader";
import { InteractionPanel } from "./InteractionPanel";
import { PromptComposer } from "./PromptComposer";
import { RuntimeOverview } from "./RuntimeOverview";
import { ScientificActivityPanel } from "./ScientificActivityPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAgentWorkspace } from "./use-agent-workspace";
import { SettingsDialog } from "./settings/SettingsDialog";

export interface OpenQuantumAppProps {
  port: HarnessUiPort;
  settingsPort: OpenQuantumSettingsPort;
}

export function OpenQuantumApp({ port, settingsPort }: OpenQuantumAppProps) {
  const [prompt, setPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const agent = useAgentWorkspace(port);
  const runtimeControlsDisabled = !agent.runtimeIsReady;
  const showConversation =
    agent.isLoadingHistory ||
    (agent.activeSessionId !== null &&
      (agent.messages.length > 0 ||
        agent.scientificActivities.length > 0 ||
        agent.pendingInteractions.length > 0 ||
        agent.isSending));

  async function handleSend() {
    if (runtimeControlsDisabled) {
      return;
    }

    const sent = await agent.sendPrompt(prompt);

    if (sent) {
      setPrompt("");
    }
  }

  return (
    <div className="relative pb-[calc(var(--oq-tabbar-height)+var(--oq-safe-bottom))] lg:pb-0">
      <div className="flex h-dvh">
        <Sidebar
          isOpen={sidebarOpen}
          sessions={agent.sessions}
          activeSessionId={agent.activeSessionId}
          isCreating={agent.isCreating}
          isRuntimeReady={agent.runtimeIsReady}
          onClose={() => setSidebarOpen(false)}
          onCreateConversation={() => {
            void agent.createConversation();
            setSidebarOpen(false);
          }}
          onSelectSession={(sessionId) => void agent.selectSession(sessionId)}
          onOpenSettings={() => {
            setSettingsOpen(true);
            setSidebarOpen(false);
          }}
        />

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            runtimeStatus={agent.runtimeStatus}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <section
              id="workspace"
              className="oq-workspace relative min-h-full pb-24"
            >
              <div className="oq-enter mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                {agent.error ? (
                  <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#efb8bd] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f2633]">
                    <span>{agent.error}</span>
                    <button
                      type="button"
                      className="shrink-0 font-medium underline underline-offset-2"
                      onClick={agent.clearError}
                    >
                      关闭
                    </button>
                  </div>
                ) : null}

                {showConversation ? (
                  <div className="pt-6 sm:pt-8">
                    <div className="flex items-center justify-between border-b border-[#dce5ea] pb-4">
                      <div>
                        <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#0b776e]">
                          AGENT SESSION
                        </div>
                        <h1 className="mt-1 text-lg font-semibold text-[#162936]">
                          OpenQuantum 对话
                        </h1>
                      </div>
                      {agent.isSending ? (
                        <button
                          type="button"
                          disabled={runtimeControlsDisabled}
                          onClick={() => void agent.cancelTurn()}
                          className="rounded-lg border border-[#d3dfe5] bg-white px-3 py-1.5 text-xs font-medium text-[#526673] hover:border-[#efb8bd] hover:text-[#9f2633] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          停止
                        </button>
                      ) : null}
                    </div>

                    <ConversationPanel
                      messages={agent.messages}
                      isLoading={agent.isLoadingHistory}
                      isSending={
                        agent.isSending && !agent.isWaitingForInteraction
                      }
                    />
                    <ScientificActivityPanel
                      activities={agent.scientificActivities}
                    />
                    {agent.runtimeIsReady ? (
                      <InteractionPanel
                        interactions={agent.pendingInteractions}
                        submittingInteractionIds={
                          agent.submittingInteractionIds
                        }
                        interactionErrors={agent.interactionErrors}
                        onAnswer={agent.answerInteraction}
                      />
                    ) : null}
                    <div className="sticky bottom-4 pb-2">
                      <div
                        aria-disabled={
                          agent.isWaitingForInteraction || undefined
                        }
                        inert={agent.isWaitingForInteraction || undefined}
                        className={
                          agent.isWaitingForInteraction
                            ? "pointer-events-none opacity-55"
                            : undefined
                        }
                      >
                        <PromptComposer
                          prompt={prompt}
                          placeholder={
                            runtimeControlsDisabled
                              ? "Harness 连接就绪后可继续提问"
                              : agent.isWaitingForInteraction
                              ? "请先完成上方回应"
                              : "继续向 OpenQuantum 提问"
                          }
                          disabled={runtimeControlsDisabled}
                          isSending={agent.isSending}
                          onPromptChange={setPrompt}
                          onSend={() => void handleSend()}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <HeroHeader />
                    <PromptComposer
                      prompt={prompt}
                      placeholder="描述你的科研问题，相关 Skill 将由 Harness 按需加载"
                      disabled={runtimeControlsDisabled}
                      isSending={agent.isSending}
                      onPromptChange={setPrompt}
                      onSend={() => void handleSend()}
                    />
                    <RuntimeOverview />
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      <SettingsDialog
        open={settingsOpen}
        port={settingsPort}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
