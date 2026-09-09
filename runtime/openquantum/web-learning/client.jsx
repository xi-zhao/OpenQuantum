import React, { useEffect, useRef, useState } from "react";
import { SlideCanvas } from "@openmaic/renderer";
import css from "./learning.css";
import rendererCss from "openquantum:renderer-css";

const styles = `${css}\n@scope (.oq-learning) { ${rendererCss} }`;
const LEVELS = ["初级", "中级", "高级"];

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

function BookIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M12 6.5C8.4 4.8 5.5 4.8 3 5.5v14c3-.8 6-.6 9 1 3-1.6 6-1.8 9-1v-14c-2.5-.7-5.4-.7-9 1Z"/><path d="M12 6.5v14M6 9h3M6 12h3M15 9h3M15 12h3"/>
  </svg>;
}

function CreationForm({ onCreate, busy }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("初级");
  const [goal, setGoal] = useState("");
  const [material, setMaterial] = useState("");
  const [slideCount, setSlideCount] = useState(4);
  const [fileError, setFileError] = useState("");
  async function loadText(event) {
    setFileError("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 100_000) { setFileError("请选择不超过 24,000 字的 TXT 或 Markdown 文字材料"); return; }
    const value = await file.text();
    if (value.length > 24_000) { setFileError("文字材料不能超过 24,000 字"); return; }
    setMaterial(value);
  }
  return <form className="ql-create" onSubmit={(event) => { event.preventDefault(); onCreate({ topic, level, goal, material, slideCount }); }}>
    <div className="ql-kicker">OPEN QUANTUM · LEARNING</div>
    <h2>从你的问题，开始一堂课</h2>
    <p className="ql-lead">选择适合自己的深度，把一个量子主题变成讲义、讲解和练习。</p>
    <label>想学什么？<input autoFocus required value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="例如：量子纠缠为什么不能用来超光速通信？" /></label>
    <fieldset><legend>学习深度</legend><div className="ql-levels">
      {LEVELS.map((item, i) => <button key={item} type="button" className={level === item ? "selected" : ""} aria-pressed={level === item} onClick={() => setLevel(item)}>
        <b>{item}</b><span>{["概念与基础方法", "理论推导与应用", "研究问题与前沿"][i]}</span>
      </button>)}
    </div></fieldset>
    <div className="ql-grid"><label>已有基础与学习目标 <span>选填</span><textarea rows={3} maxLength={2000} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="例如：已学过线性代数，希望推导 Bell 不等式，并理解实验检验。" /></label>
      <label>课堂长度<select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}><option value={2}>简短 · 2 页讲义 + 练习</option><option value={4}>标准 · 4 页讲义 + 练习</option><option value={6}>深入 · 6 页讲义 + 练习</option></select><p className="ql-note">可直接选择任一深度，课程会参考你填写的基础。</p></label></div>
    <details className="ql-material"><summary>加入参考材料 <span>选填 · 文字或 Markdown</span></summary>
      <p className="ql-note">填写你有权使用的材料。主题和材料将发送给当前配置的模型；公开资源库不会自动用于建课。</p>
      <input type="file" aria-label="导入文字材料" accept=".txt,.md,text/plain,text/markdown" onChange={loadText} />
      {fileError && <p role="alert" className="ql-error">{fileError}</p>}
      <textarea aria-label="参考材料" rows={7} maxLength={24000} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="粘贴讲义片段、知识要点或原创内容…" />
      <small>{material.length.toLocaleString()} / 24,000 字</small>
    </details>
    <div className="ql-submit"><span>由 OpenMAIC 生成，通常需要几分钟。<br/>生成后可逐页学习，课程内容需要审阅。</span><button className="ql-primary" disabled={busy || !topic.trim()} type="submit">{busy ? "正在创建…" : "生成课堂 →"}</button></div>
  </form>;
}

function Quiz({ questions }) {
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState(false);
  const choose = (q, value) => setAnswers((old) => {
    const previous = old[q.id] || [];
    return { ...old, [q.id]: q.type === "single" ? [value] : previous.includes(value) ? previous.filter((v) => v !== value) : [...previous, value] };
  });
  const correct = (q) => JSON.stringify([...(answers[q.id] || [])].sort()) === JSON.stringify([...q.answer].sort());
  return <div className="ql-quiz"><div className="ql-kicker">检查理解</div><h3>随堂练习</h3>
    {questions.map((q, i) => <fieldset key={q.id}><legend>{i + 1}. {q.question}</legend>
      {q.type === "short_answer" ? <textarea aria-label={`第 ${i + 1} 题回答`} rows={4} disabled={graded} /> : q.options.map((option) => <label className="ql-option" key={option.value}>
        <input type={q.type === "single" ? "radio" : "checkbox"} name={q.id} checked={(answers[q.id] || []).includes(option.value)} disabled={graded} onChange={() => choose(q, option.value)} />{option.label}
      </label>)}
      {graded && <div className="ql-feedback">{q.hasAnswer ? <b>{correct(q) ? "✓ 回答正确" : `参考答案：${q.answer.join("、")}`}</b> : <b>开放题 · 请对照解析自行检查</b>}<p>{q.analysis || "本题暂无解析。"}</p></div>}
    </fieldset>)}
    <button className="ql-primary" onClick={() => setGraded(!graded)}>{graded ? "重新作答" : "检查答案"}</button>
    <p className="ql-note">题目和参考答案由 AI 生成，作答结果仅用于自我检查。</p>
  </div>;
}

class SlideBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <p className="ql-error">此页暂时无法展示，请查看讲解或生成记录。</p> : this.props.children; }
}

function Classroom({ course, running, failure, onStart, onStop, onOpenSession, busy }) {
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const scenes = course.document?.scenes;
  const scene = scenes?.[index];
  const narration = scene?.actions?.filter((a) => a.type === "speech").map((a) => a.text).join("\n\n") || "";
  useEffect(() => () => globalThis.speechSynthesis?.cancel(), [index]);
  function readAloud() {
    if (!globalThis.speechSynthesis) return;
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = "zh-CN";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); speechSynthesis.speak(utterance);
  }
  function download() {
    const blob = new Blob([JSON.stringify({ ...course.document, provenance: course.provenance }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `quantum-classroom-${course.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="ql-classroom">
    <div className="ql-course-heading"><div><div className="ql-kicker">{course.requirements.level} · {scenes ? "AI 草稿 · 待审阅" : "建课请求"}</div><h2>{course.document?.stage.name || course.requirements.topic}</h2></div>
      <button className="ql-text-button" onClick={onOpenSession}>查看生成记录 ↗</button></div>
    {!scenes ? <div className="ql-pending"><div className={running ? "ql-orbit spinning" : "ql-orbit"}>Ψ</div><h3>{running ? "正在构建你的课堂" : "课堂尚未生成"}</h3>
      <p>{running ? "正在生成提纲、讲义、讲解与练习。可以关闭窗口，任务仍在会话中继续。" : failure || "建课要求已保存。可查看生成记录，或使用原会话开始／重试。"}</p>
      {running ? <button disabled={busy} onClick={onStop}>停止生成</button> : <button disabled={busy} className="ql-primary" onClick={onStart}>{busy ? "正在启动…" : "开始／重试生成"}</button>}
    </div> : <>
      <div className="ql-page-tabs" aria-label="课堂页面">{scenes.map((s, i) => <button key={s.id} onClick={() => { setIndex(i); setSpeaking(false); }} aria-current={index === i ? "step" : undefined} className={index === i ? "selected" : ""}>{s.type === "quiz" ? "练习" : `${i + 1}`}</button>)}<span>{scene.title}</span></div>
      {scene.type === "slide" ? <SlideBoundary key={scene.id}><div className="ql-canvas"><SlideCanvas slide={scene.content.canvas} canvasPercentage={98} /></div></SlideBoundary> : <Quiz key={scene.id} questions={scene.content.questions} />}
      {narration && <section className="ql-narration"><div><h3>本页讲解</h3>{globalThis.speechSynthesis && <button onClick={readAloud}>{speaking ? "停止朗读" : "朗读"}</button>}</div><p>{narration}</p></section>}
      <div className="ql-classroom-footer"><button onClick={download}>导出课堂 JSON</button><span>{index + 1} / {scenes.length}</span><div><button disabled={!index} onClick={() => { setIndex(index - 1); setSpeaking(false); }}>上一页</button><button disabled={index === scenes.length - 1} onClick={() => { setIndex(index + 1); setSpeaking(false); }}>下一页 →</button></div></div>
    </>}
  </div>;
}

function LearningApp({ api, sessions, onClose }) {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [course, setCourse] = useState(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let timer;
    async function refresh() {
      try {
        const list = await command({ action: "list" });
        if (disposed) return;
        setCourses(list.courses);
        if (selected) {
          const loaded = await command({ action: "get", id: selected });
          const state = unwrap(await api.sessions.list({}));
          if (disposed) return;
          setCourse(loaded);
          const session = state.items.find((item) => item.sessionId === loaded.sessionId);
          setRunning(Boolean(session?.running));
          setFailure("");
          if (!loaded.document && session && !session.running && !session.blank) {
            const history = unwrap(await api.sessions.history({ sessionId: loaded.sessionId, maxMessages: 10 }));
            if (disposed) return;
            const reason = history.events.findLast((entry) => entry.event?.type === "turn/end")?.event.data.reason;
            const messages = { TIMEOUT: "当前模型请求超时，尚未生成课堂。请检查模型服务后重试，原建课要求已保留。", AUTH: "当前模型的认证未通过。请检查模型设置后重试。", RATE_LIMIT: "当前模型服务暂时限流，请稍后重试。" };
            setFailure(messages[reason?.error?.code] || "本次生成未完成。请查看生成记录；确认原因后可用原要求重试。");
          }
        }
      } catch (e) { if (!disposed) setError(e.message); }
      if (!disposed) timer = setTimeout(refresh, 5000);
    }
    refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, [api, selected]);

  async function start(value) {
    const current = unwrap(await api.sessions.list({})).items.find((s) => s.sessionId === value.sessionId);
    if (current?.running) return;
    unwrap(await api.sessions.create({ sessionId: value.sessionId, agentPreset: "quantum-learning" }));
    unwrap(await api.sessions.rename({ sessionId: value.sessionId, title: `建课：${value.requirements.topic}` }));
    unwrap(await api.sessions.prompt({ sessionId: value.sessionId, mode: "queue", content: [{ type: "text", text: `请使用 generate_quantum_classroom 生成已创建的课堂，courseId=${value.id}。这是用户已明确发起的建课请求，输入材料已在课堂应用中保存。` }], clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    const state = unwrap(await api.sessions.list({}));
    setRunning(Boolean(state.items.find((s) => s.sessionId === value.sessionId)?.running));
  }
  async function operation(fn) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function create(requirements) {
    await operation(async () => {
      const value = await command({ action: "create", requirements, sessionId: `session-learning-${crypto.randomUUID()}` });
      setSelected(value.id); setCourse(value);
      await start(value);
    });
  }
  function openSession() {
    try { sessions.open(course.sessionId); onClose(); }
    catch { setError("生成记录尚未同步，请稍后重试，或从侧栏打开对应的建课会话。"); }
  }
  return <div className="oq-learning ql-app">
    <header className="ql-header"><div className="ql-brand"><span><BookIcon /></span><div><h1>量子学习通</h1><small>Powered by OpenMAIC</small></div></div><button onClick={onClose} aria-label="关闭量子学习通" className="ql-close">×</button></header>
    <div className="ql-body"><aside className="ql-library"><button className="ql-new" disabled={busy} onClick={() => { setSelected(null); setCourse(null); setError(""); }}>＋ 创建课堂</button>
      <div className="ql-library-label">我的课堂 <span>{courses.length}</span></div>
      <nav>{courses.map((item) => <button className={`ql-course-card ${selected === item.id ? "active" : ""}`} key={item.id} onClick={() => { setSelected(item.id); setCourse(null); setError(""); }}><span className="ql-level-tag">{item.level}</span><strong>{item.title}</strong><small>{item.hasClassroom ? `${item.sceneCount} 页 · 待审阅` : "建课请求已保存"}</small></button>)}</nav>
      {!courses.length && <p className="ql-empty">你的课堂会保存在这里。<br/>从一个感兴趣的问题开始。</p>}
      <p className="ql-library-bottom">理解概念 · 推导理论 · 探索研究</p>
    </aside><main className="ql-main">{error && <div className="ql-error" role="alert">{error}</div>}
      {!selected ? <CreationForm onCreate={create} busy={busy} /> : course ? <Classroom key={course.id} course={course} running={running} failure={failure} busy={busy} onStart={() => operation(() => start(course))} onStop={() => operation(async () => { unwrap(await api.sessions.cancel({ sessionId: course.sessionId })); })} onOpenSession={openSession} /> : <p className="ql-loading">正在打开课堂…</p>}
    </main></div>
  </div>;
}

function LearningEntry({ api, sessions, wide }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <><style>{styles}</style><button className="oq-learning-launch" title="量子学习通" aria-label="打开量子学习通" onClick={() => setOpen(true)}><BookIcon />{wide && <span>量子学习通</span>}</button>
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
