import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { credentialRef } from "./application.mjs";
import { withLock } from "./storage.mjs";

const HTML = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenQuantum · MCP 凭据</title><link rel="stylesheet" href="/credential.css"><main><p>OPENQUANTUM</p><h1>MCP 连接凭据</h1><p id="connection"></p><p>Token 直接保存到本机系统凭据库。不会发送到聊天中，已有值不会回显。</p><form><label>输入新 Token<input name="token" type="password" autocomplete="new-password" maxlength="8192"></label><button type="submit">保存 Token</button><button type="button" id="remove">移除 Token</button></form><p id="status" role="status"></p></main><script src="/credential.js"></script></html>`;
const CSS = `body{font:16px system-ui;background:#f5f8fc;color:#102c44;margin:0}main{max-width:520px;margin:12vh auto;padding:32px;background:white;border-radius:18px}p{line-height:1.7}label,input{display:block}input{box-sizing:border-box;margin:12px 0 20px;width:100%;padding:12px;border:1px solid #b9cbd7;border-radius:8px}button{padding:11px 18px;margin-right:10px;border:0;border-radius:8px;background:#0a706f;color:white;cursor:pointer}#remove{background:#e5ecf2;color:#243e54}`;
const JS = `const nonce=location.hash.slice(1);history.replaceState(null,'',location.pathname);const status=document.querySelector('#status');const input=document.querySelector('input');async function send(action){status.textContent='正在处理…';try{const r=await fetch('/credential',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce,action,value:action==='set'?input.value:undefined})});const data=await r.json();input.value='';status.textContent=data.message;if(r.ok)document.querySelectorAll('button').forEach(b=>b.disabled=true);}catch{input.value='';status.textContent='保存失败，请重新从 OpenQuantum 设置页打开。';}}document.querySelector('form').onsubmit=e=>{e.preventDefault();if(input.value)send('set');};document.querySelector('#remove').onclick=()=>send('remove');fetch('/credential-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})}).then(r=>r.json()).then(v=>document.querySelector('#connection').textContent=v.connection||v.message).catch(()=>{});`;

export async function createCredentialWindow({ settings, credentials }) {
  const sessions = new Map();
  let origin;
  const server = createServer(async (request, response) => {
    const reply = (status, value, type = "application/json") => {
      response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      response.end(type === "application/json" ? JSON.stringify(value) : value);
    };
    if (request.headers.host !== new URL(origin).host) return reply(403, { message: "无效请求" });
    if (request.method === "GET") {
      if (request.url === "/credentials") return reply(200, HTML, "text/html; charset=utf-8");
      if (request.url === "/credential.js") return reply(200, JS, "text/javascript; charset=utf-8");
      if (request.url === "/credential.css") return reply(200, CSS, "text/css; charset=utf-8");
      return reply(404, { message: "页面不存在" });
    }
    if (request.method !== "POST" || request.headers.origin !== origin || !request.headers["content-type"]?.startsWith("application/json") || !["/credential", "/credential-info"].includes(request.url)) return reply(403, { message: "无效请求" });
    try {
      let body = "";
      for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 16384) return reply(413, { message: "输入过大" }); }
      const input = JSON.parse(body);
      const session = sessions.get(input.nonce);
      if (!session || session.expires < Date.now()) return reply(403, { message: "窗口已过期，请从 OpenQuantum 设置页重新打开" });
      await withLock(settings.file, async () => {
      if (sessions.get(input.nonce) !== session) return reply(403, { message: "窗口已过期，请重新打开" });
      const { config } = await settings.read();
      const connection = config.connections.find(value => value.id === session.id);
      if (!connection || connection.instance !== session.instance || connection.authentication !== "token") return reply(409, { message: "连接配置已变化，请刷新设置页" });
      if (request.url === "/credential-info") return reply(200, { connection: `连接：${connection.id} · ${connection.transport === "http" ? connection.url : [connection.command, ...connection.args].join(" ")}` });
      if (input.action === "remove" && connection.enabled) return reply(409, { message: "请先关闭连接再移除 Token" });
      if (!["set", "remove"].includes(input.action)) return reply(400, { message: "无效操作" });
      // Single-use capability; neither raw credentials nor exceptions cross MCP.
      sessions.delete(input.nonce);
      if (input.action === "set") await credentials.set(credentialRef(session.id), input.value);
      else await credentials.remove(credentialRef(session.id));
      settings.statuses.delete(session.id);
      reply(200, { message: input.action === "set" ? "已保存到系统凭据库，可以关闭此窗口并测试连接。" : "Token 已移除，可以关闭此窗口。" });
      });
      await settings.changed();
    } catch { reply(400, { message: "凭据操作失败，请检查输入或系统凭据库权限后重新打开窗口" }); }
  });
  server.requestTimeout = 15000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    async open(id) {
      const { config } = await settings.read();
      const connection = config.connections.find(value => value.id === id && value.authentication === "token");
      if (!connection) throw new Error("连接不需要 Token 或不存在");
      for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
      if (sessions.size >= 32) throw new Error("凭据窗口数量已达上限");
      const nonce = randomBytes(32).toString("hex");
      sessions.set(nonce, { id, instance: connection.instance, expires: Date.now() + 10 * 60 * 1000 });
      return `${origin}/credentials#${nonce}`;
    },
    close() { sessions.clear(); server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); },
  };
}
