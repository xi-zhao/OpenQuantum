import React, { useEffect, useRef, useState } from "react";
import css from "./learning.css";
import { acceptsMessage, CHANNEL } from "../../../src/learning/ui-bridge.mjs";

async function command(value) {
  const response = await fetch("/openquantum/api/learning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "课堂暂时不可用");
  return data;
}

function LearningApp({ onClose }) {
  const frame = useRef(null);
  const [service, setService] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError("");
    command({ action: "open-ui" }).then((value) => { if (!disposed) setService(value); }).catch((e) => { if (!disposed) setError(e.message); });
    return () => { disposed = true; };
  }, [attempt]);
  useEffect(() => {
    if (!service) return;
    let disposed = false;
    async function receive(event) {
      if (!acceptsMessage(event, frame.current?.contentWindow, service.origin)) return;
      const { requestId } = event.data;
      const reply = (result, failure) => { if (!disposed) frame.current?.contentWindow?.postMessage({ channel: CHANNEL, type: "response", requestId, result, error: failure }, service.origin); };
      try {
        const { courses } = await command({ action: "list" });
        const completed = [];
        for (const course of courses.filter((item) => item.hasClassroom)) completed.push(await command({ action: "get", id: course.id }));
        reply(completed);
      } catch (e) { reply(null, e.message); }
    }
    window.addEventListener("message", receive);
    return () => { disposed = true; window.removeEventListener("message", receive); };
  }, [service]);
  return <div className="oq-learning-shell">
    <header className="oq-learning-bar"><strong>量子学习通</strong><small>OpenMAIC</small><button className="oq-learning-return" onClick={onClose}>返回 OpenQuantum</button></header>
    {error && <div role="alert" className="oq-learning-notice">{error}</div>}
    {service ? <div className="oq-learning-frame-wrap"><iframe ref={frame} className="oq-learning-frame" src={service.url} title="OpenMAIC · 量子学习通" onLoad={() => setLoaded(true)} allow="fullscreen; clipboard-write; microphone" allowFullScreen />{!loaded && <div className="oq-learning-loading" role="status">正在载入 OpenMAIC…</div>}</div>
      : <div className="oq-learning-status">{error ? <button onClick={() => setAttempt(attempt + 1)}>重新打开</button> : "正在启动课堂与课程存储，首次打开需要加载…"}</div>}
  </div>;
}

function LearningEntry({ wide }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <><style>{css}</style><button className="oq-learning-launch" title="量子学习通" aria-label="打开量子学习通" onClick={() => setOpen(true)}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 6.5C8.4 4.8 5.5 4.8 3 5.5v14c3-.8 6-.6 9 1 3-1.6 6-1.8 9-1v-14c-2.5-.7-5.4-.7-9 1Z"/><path d="M12 6.5v14"/></svg>{wide && <span>量子学习通</span>}</button>
    <dialog className="oq-learning-dialog" ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>{open && <LearningApp onClose={() => setOpen(false)} />}</dialog>
  </>;
}

export const inject = ["slots"];
export function apply(ctx) {
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "openquantum-learning", order: 5 }, LearningEntry));
}
