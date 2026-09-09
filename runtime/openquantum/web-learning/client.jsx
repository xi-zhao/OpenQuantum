import React, { useEffect, useRef, useState } from "react";
import css from "./learning.css";
import { acceptsMessage, classroomRequirements, CHANNEL } from "../../../src/learning/ui-bridge.mjs";

function unwrap(response) {
  const result = response.result;
  if (!result?.ok) throw new Error(result?.error?.message || "会话暂时不可用，请重试");
  return result.value;
}
async function command(value) {
  const response = await fetch("/openquantum/api/learning", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "课堂暂时不可用");
  return data;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function LearningApp({ api, sessions, onClose }) {
  const frame = useRef(null);
  const active = useRef(null);
  const [service, setService] = useState(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState(null);
  const [working, setWorking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError("");
    command({ action: "open-ui" }).then((value) => { if (!disposed) setService(value); })
      .catch((e) => { if (!disposed) setError(e.message); });
    return () => { disposed = true; };
  }, [attempt]);

  useEffect(() => {
    if (!service) return;
    let disposed = false;
    const respond = (requestId, result, failure) => frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "response", requestId, result, error: failure }, service.origin);
    async function receive(event) {
      if (!acceptsMessage(event, frame.current?.contentWindow, service.origin)) return;
      const { type, requestId, payload } = event.data;
      if (type === "generate" && active.current === requestId) return;
      let ownsTask = false;
      try {
        if (type === "library") {
          const { courses } = await command({ action: "list" });
          const completed = [];
          for (const course of courses.filter((item) => item.hasClassroom)) completed.push(await command({ action: "get", id: course.id }));
          if (!disposed) respond(requestId, completed);
          return;
        }
        if (type !== "generate") return;
        if (active.current) throw new Error("已有建课任务正在执行，请等待完成或停止后再创建。");
        const requirements = classroomRequirements(payload);
        active.current = requestId;
        ownsTask = true;
        const course = await command({ action: "create", requirements, sessionId: `session-learning-${requestId}` });
        if (course.document) { respond(requestId, course); return; }
        setTask(course);
        setWorking(true);
        const state = unwrap(await api.sessions.list({}));
        const existing = state.items.find((item) => item.sessionId === course.sessionId);
        if (!existing?.running) {
          unwrap(await api.sessions.create({ sessionId: course.sessionId, agentPreset: "quantum-learning" }));
          unwrap(await api.sessions.rename({ sessionId: course.sessionId, title: `建课：${requirements.topic}` }));
          unwrap(await api.sessions.prompt({ sessionId: course.sessionId, mode: "queue", content: [{ type: "text", text: `请使用 generate_quantum_classroom 生成课堂，courseId=${course.id}。用户已在 OpenMAIC 原版界面发起建课。` }] }));
        }
        const deadline = Date.now() + 15 * 60_000;
        while (!disposed && Date.now() < deadline) {
          await delay(2500);
          const saved = await command({ action: "get", id: course.id });
          if (saved.document) { respond(requestId, saved); return; }
          const list = unwrap(await api.sessions.list({}));
          const session = list.items.find((item) => item.sessionId === course.sessionId);
          if (session && !session.running && !session.blank) {
            throw new Error("本次生成未完成。请在生成记录中检查当前模型连接后重试。建课要求已保存。");
          }
        }
        if (!disposed) throw new Error("生成尚未结束，可查看生成记录。完成的课堂会在下次打开时导入。");
      } catch (e) {
        if (!disposed) { setError(e.message); respond(requestId, null, e.message); }
      } finally {
        if (ownsTask && active.current === requestId) { active.current = null; if (!disposed) setWorking(false); }
      }
    }
    window.addEventListener("message", receive);
    return () => { disposed = true; window.removeEventListener("message", receive); };
  }, [service, api]);
  return <div className="oq-learning-shell">
    <header className="oq-learning-bar"><strong>量子学习通</strong><small>OpenMAIC · 原版课堂</small>
      {task && <><span>{working ? "正在生成课堂…" : "最近建课"}</span><button onClick={() => { try { sessions.open(task.sessionId); onClose(); } catch { setError("会话记录尚未同步，请稍后再打开。"); } }}>查看生成记录</button>{working && <button onClick={async () => { try { unwrap(await api.sessions.cancel({ sessionId: task.sessionId })); } catch (e) { setError(e.message); } }}>停止生成</button>}</>}
      <button className="oq-learning-return" onClick={onClose}>返回 OpenQuantum</button>
    </header>
    {error && <div role="alert" className="oq-learning-notice">{error}</div>}
    {service ? <div className="oq-learning-frame-wrap"><iframe ref={frame} className="oq-learning-frame" src={service.url} title="OpenMAIC 原版课堂 · 量子学习通" onLoad={() => setFrameLoaded(true)} allow="fullscreen; clipboard-write" allowFullScreen />{!frameLoaded && <div className="oq-learning-loading" role="status">正在载入 OpenMAIC 原版界面…</div>}</div>
      : <div className="oq-learning-status">{error ? <button onClick={() => setAttempt(attempt + 1)}>重新打开</button> : "正在启动 OpenMAIC 原版界面，首次打开需要加载…"}</div>}
  </div>;
}

function LearningEntry({ api, sessions, wide }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <><style>{css}</style><button className="oq-learning-launch" title="量子学习通" aria-label="打开量子学习通" onClick={() => setOpen(true)}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 6.5C8.4 4.8 5.5 4.8 3 5.5v14c3-.8 6-.6 9 1 3-1.6 6-1.8 9-1v-14c-2.5-.7-5.4-.7-9 1Z"/><path d="M12 6.5v14"/></svg>{wide && <span>量子学习通</span>}</button>
    <dialog className="oq-learning-dialog" ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>{open && <LearningApp api={api} sessions={sessions} onClose={() => setOpen(false)} />}</dialog>
  </>;
}

export const inject = ["slots", "connection", "sessions"];
export function apply(ctx) {
  const connection = ctx.get("connection");
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action", id: "openquantum-learning", order: 5,
    inject: () => ({ api: connection.api, sessions: ctx.get("sessions") }),
  }, LearningEntry));
}
