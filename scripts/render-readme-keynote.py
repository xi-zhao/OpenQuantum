#!/usr/bin/env python3
"""Render light/dark keynote visual plates for the OpenQuantum README.

Measured values come from the frozen local demo in docs/examples/ and benchmarks
in experiments/. The visual motifs reuse official assets in site/assets/ and
packages/openquantum-web-branding/assets/.

Usage:
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    python3 scripts/render-readme-keynote.py
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "images" / "readme"
FONTS = ROOT / "public" / "openquantum" / "fonts"
BRAND = ROOT / "packages" / "openquantum-web-branding" / "assets"
SITE_ASSETS = ROOT / "site" / "assets"
SCALE = 2
CSS_W = 900  # 2x -> 1800px output width


def frozen_json(path: str, sha256: str) -> dict:
    try:
        raw = (ROOT / path).read_bytes()
    except FileNotFoundError as error:
        raise ValueError(f"Missing frozen evidence: {path}") from error
    if hashlib.sha256(raw).hexdigest() != sha256:
        raise ValueError(f"Frozen evidence changed: {path} (expected SHA-256 {sha256})")
    return json.loads(raw)


def scientific_html(value: float) -> str:
    mantissa, exponent = f"{value:.2e}".split("e")
    return f"{mantissa}×10<sup>{str(int(exponent)).replace('-', '−')}</sup>"


def load_data() -> dict:
    demo = frozen_json("docs/examples/quantum-ground-state-local-demo-2026-09-12.json",
                       "d646fdf691d945839c53da2d2820f4bab7c8a625a099f19de3965fc4ed78aeeb")["output"]
    qutip = frozen_json("experiments/qutip-rust-wigner/results/summary.json",
                        "a3b315e771103df017aa82c287a30a04f0166961247a57485270f9107cb82ce0")
    penny_all = frozen_json("experiments/pennylane-rust-commutator/results/benchmark.json",
                            "df203869e17f04ea65d3701d97272b9f6a08bdc058278ba67e6d85486b37a526")
    validation = frozen_json("experiments/pennylane-rust-commutator/results/validation.json",
                             "1f884052c54f1b4a92f20df523e6b4ea438450b79354e0c4f5a2a2de5a55f834")
    penny = next(c for c in penny_all["cases"] if c["id"] == "local-32q-pool512")
    p_base = penny["timings"]["pennylane"]["median_seconds"] * 1000
    p_opt = penny["timings"]["rust_end_to_end"]["median_seconds"] * 1000
    return {
        "vqe": demo["result"],
        "review": demo["scientificReview"],
        "q_error": scientific_html(qutip["max_default_error"]),
        "q_task": qutip["task"],
        "q_cpu": qutip["hardware"],
        "q_base": f"{qutip['baseline_ms']:.2f}",
        "q_opt": f"{qutip['rust_ms']:.2f}",
        "q_speedup": f"{qutip['baseline_ms'] / qutip['rust_ms']:.2f}×",
        "q_ratio": qutip["rust_ms"] / qutip["baseline_ms"],
        "q_checks": qutip["checks"],
        "p_base": f"{p_base:.2f}",
        "p_opt": f"{p_opt:.2f}",
        "p_speedup": f"{p_base / p_opt:.2f}×",
        "p_ratio": p_opt / p_base,
        "p_cases": len(penny_all["cases"]),
        "p_cpu": penny_all["cpu"],
        "p_qubits": penny["qubits"],
        "p_h_terms": penny["actual_left_terms"],
        "p_a_terms": penny["actual_right_terms"],
        "p_pairs": validation["exhaustive_word_pairs"],
        "p_random": validation["random_complex_pairs"],
        "p_error": scientific_html(validation["worst_independent_matrix_error"]),
    }


def common_css() -> str:
    return f"""
@font-face {{
  font-family: "Inter";
  src: url("{(FONTS / 'inter-latin.woff2').as_uri()}") format("woff2");
  font-weight: 100 900;
  font-display: block;
}}
@font-face {{
  font-family: "JB Mono";
  src: url("{(FONTS / 'jetbrains-mono-latin.woff2').as_uri()}") format("woff2");
  font-weight: 100 800;
  font-display: block;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{
  background: transparent;
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}}
.mono {{ font-family: "JB Mono", ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; }}
.num {{ font-variant-numeric: tabular-nums; }}
"""


def wrap_doc(body: str, extra_css: str, lang: str = "zh-CN") -> str:
    return (
        f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8">'
        f"<style>{common_css()}\n{extra_css}</style></head><body>{body}</body></html>"
    )


def hero_plate(dark: bool, lang: str = "zh") -> str:
    field_uri = (SITE_ASSETS / "quantum-field-v3.png").as_uri()
    state_uri = (SITE_ASSETS / "quantum-state-v2.png").as_uri()
    en = lang == "en"
    title_text = "Quantum Agent" if en else "量子智能体"
    subtitle_text = (
        "Turn research ideas into verified quantum computation."
        if en
        else "让研究思路，有路可走。"
    )
    desc_html = (
        "Start from a physics question, a paper, or a circuit.<br />"
        "Run real local calculations across pinned specialist SDKs with independent checking."
        if en
        else "从一个问题、一篇论文或一段程序出发，<br />自动调用专业量子软件在本地完成真实计算，并独立核对结果。"
    )
    foot_html = (
        '<span><b>194</b> SKILLS</span><span class="dot"></span>'
        '<span><b>91</b> MCP</span><span class="dot"></span>'
        '<span><b>122</b> PINNED ENVS</span><span class="dot"></span>'
        '<span><b>MIT</b> OPEN</span>'
        if en
        else '<span><b>194</b> SKILLS</span><span class="dot"></span>'
        '<span><b>91</b> MCP</span><span class="dot"></span>'
        '<span><b>122</b> 锁定环境</span><span class="dot"></span>'
        '<span><b>MIT</b> 开源</span>'
    )
    title_size = "52px" if en else "56px"
    subtitle_size = "20px" if en else "22px"
    desc_size = "15px" if en else "15.5px"
    if not dark:
        css = f"""
#shot {{
  position: relative; width: {CSS_W}px; height: 420px; border-radius: 26px; overflow: hidden;
  background: #F4F9FD;
  border: 1px solid rgba(15, 23, 42, 0.08);
}}
.bg-field {{
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;
  opacity: 0.92;
}}
.veil {{
  position: absolute; inset: 0;
  background: linear-gradient(95deg, rgba(255,255,255,0.92) 0%, rgba(248,252,255,0.82) 50%, rgba(244,249,253,0.18) 100%);
}}
.sphere {{
  position: absolute; right: 24px; top: 50%; transform: translateY(-50%);
  width: 344px; height: 344px; object-fit: contain;
  mix-blend-mode: multiply; opacity: 0.94;
  filter: contrast(1.04) saturate(1.06);
}}
.content {{
  position: relative; z-index: 2; height: 100%;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 46px 54px 36px; max-width: 590px;
}}
.title {{
  font-size: {title_size}; font-weight: 600; letter-spacing: -0.035em; line-height: 1.1; color: #0B1522;
}}
.subtitle {{
  margin-top: 15px; font-size: {subtitle_size}; font-weight: 500; letter-spacing: -0.015em; line-height: 1.38; color: #164E63;
}}
.desc {{
  margin-top: 14px; font-size: {desc_size}; line-height: 1.72; color: #334155; max-width: 515px;
}}
.foot {{
  display: flex; align-items: center; gap: 16px; padding-top: 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.10);
  font-size: 12px; color: #475569; letter-spacing: 0.02em; white-space: nowrap;
}}
.foot b {{ color: #0B1522; font-weight: 600; }}
.dot {{ width: 3px; height: 3px; border-radius: 50%; background: rgba(15, 23, 42, 0.28); }}
"""
        body = f"""
<div id="shot">
  <img class="bg-field" src="{field_uri}" alt="" />
  <div class="veil"></div>
  <img class="sphere" src="{state_uri}" alt="" />
  <div class="content">
    <div>
      <div class="title">{title_text}</div>
      <div class="subtitle">{subtitle_text}</div>
      <p class="desc">{desc_html}</p>
    </div>
    <div class="foot mono">{foot_html}</div>
  </div>
</div>
"""
        return wrap_doc(body, css, "en" if en else "zh-CN")

    # Dark observatory keynote hero
    css = f"""
#shot {{
  position: relative; width: {CSS_W}px; height: 420px; border-radius: 26px; overflow: hidden;
  background: #070D16;
  border: 1px solid rgba(255, 255, 255, 0.10);
}}
.glow-a {{
  position: absolute; right: -80px; top: -60px; width: 580px; height: 540px;
  background: radial-gradient(circle at 55% 48%, rgba(34, 211, 238, 0.22) 0%, rgba(14, 116, 144, 0.13) 38%, rgba(7, 13, 22, 0) 72%);
}}
.glow-b {{
  position: absolute; left: -120px; bottom: -180px; width: 520px; height: 380px;
  background: radial-gradient(circle, rgba(24, 122, 145, 0.16) 0%, rgba(7, 13, 22, 0) 70%);
}}
.orbit-svg {{
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  width: 390px; height: 390px; opacity: 0.96;
}}
.content {{
  position: relative; z-index: 2; height: 100%;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 46px 54px 36px; max-width: 580px;
}}
.title {{
  font-size: {title_size}; font-weight: 600; letter-spacing: -0.035em; line-height: 1.1; color: #F8FAFC;
}}
.subtitle {{
  margin-top: 15px; font-size: {subtitle_size}; font-weight: 500; letter-spacing: -0.015em; line-height: 1.38; color: #67E8F9;
}}
.desc {{
  margin-top: 14px; font-size: {desc_size}; line-height: 1.72; color: #94A3B8; max-width: 510px;
}}
.foot {{
  display: flex; align-items: center; gap: 16px; padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.10);
  font-size: 12px; color: #94A3B8; letter-spacing: 0.02em; white-space: nowrap;
}}
.foot b {{ color: #F1F5F9; font-weight: 600; }}
.dot {{ width: 3px; height: 3px; border-radius: 50%; background: rgba(148, 163, 184, 0.4); }}
"""
    # Precision geometric Bloch-sphere + phase wave vector artwork (pure geometry, zero amateur sketch)
    orbit_svg = """
<svg class="orbit-svg" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="core" cx="50%" cy="46%" r="48%">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#0E7490" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="#070D16" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ringA" x1="60" y1="60" x2="340" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#67E8F9" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#22D3EE" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.72"/>
    </linearGradient>
    <linearGradient id="ringB" x1="340" y1="70" x2="70" y2="330" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" stop-opacity="0.65"/>
      <stop offset="50%" stop-color="#22D3EE" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#22D3EE" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="wave" x1="88" y1="200" x2="312" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#A5F3FC" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#22D3EE" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <circle cx="200" cy="200" r="168" fill="url(#core)"/>
  <circle cx="200" cy="200" r="134" stroke="rgba(226,232,240,0.16)" stroke-width="1"/>
  <circle cx="200" cy="200" r="134" stroke="url(#ringA)" stroke-width="1.25" stroke-dasharray="3 6" opacity="0.5"/>
  <line x1="200" y1="42" x2="200" y2="358" stroke="rgba(148,163,184,0.18)" stroke-width="1"/>
  <line x1="42" y1="200" x2="358" y2="200" stroke="rgba(148,163,184,0.18)" stroke-width="1"/>
  <ellipse cx="200" cy="200" rx="134" ry="44" stroke="url(#ringA)" stroke-width="1.4"/>
  <ellipse cx="200" cy="200" rx="134" ry="52" transform="rotate(-34 200 200)" stroke="url(#ringB)" stroke-width="1.5"/>
  <ellipse cx="200" cy="200" rx="134" ry="48" transform="rotate(56 200 200)" stroke="rgba(226,232,240,0.28)" stroke-width="1.1"/>
  <path d="M 88 200 C 122 146, 158 146, 200 200 C 242 254, 278 254, 312 200" stroke="url(#wave)" stroke-width="2" fill="none"/>
  <path d="M 88 200 C 126 162, 162 162, 200 200 C 238 238, 274 238, 312 200" stroke="rgba(103,232,249,0.42)" stroke-width="1.1" fill="none"/>
  <path d="M 88 200 C 132 178, 168 178, 200 200 C 232 222, 268 222, 312 200" stroke="rgba(103,232,249,0.22)" stroke-width="1" fill="none"/>
  <line x1="200" y1="200" x2="262" y2="128" stroke="#67E8F9" stroke-width="1.8"/>
  <circle cx="200" cy="200" r="3.2" fill="#E2E8F0"/>
  <circle cx="262" cy="128" r="10" fill="#22D3EE" fill-opacity="0.22"/>
  <circle cx="262" cy="128" r="4.5" fill="#F8FAFC"/>
  <text x="200" y="32" text-anchor="middle" fill="#64748B" font-family="JB Mono, monospace" font-size="11">|0⟩</text>
  <text x="200" y="376" text-anchor="middle" fill="#64748B" font-family="JB Mono, monospace" font-size="11">|1⟩</text>
  <text x="278" y="124" fill="#A5F3FC" font-family="JB Mono, monospace" font-size="11.5">|ψ⟩</text>
</svg>
"""
    body = f"""
<div id="shot">
  <div class="glow-a"></div>
  <div class="glow-b"></div>
  {orbit_svg}
  <div class="content">
    <div>
      <div class="title">{title_text}</div>
      <div class="subtitle">{subtitle_text}</div>
      <p class="desc">{desc_html}</p>
    </div>
    <div class="foot mono">{foot_html}</div>
  </div>
</div>
"""
    return wrap_doc(body, css, "en" if en else "zh-CN")


def launch_card_plate(dark: bool, lang: str = "zh") -> str:
    icon_uri = (BRAND / "mark-inverse.svg").as_uri()
    en = lang == "en"
    bg = "#161E2B" if dark else "#0E131B"
    border = "rgba(255, 255, 255, 0.11)" if dark else "rgba(15, 23, 42, 0.12)"
    icon_bg = "linear-gradient(155deg, #162233 0%, #0A1019 100%)"
    btn_bg = "#F4F1EA"
    btn_ink = "#0E131B"
    line1 = "Standalone quantum research workbench + native Codex plugin." if en else "独立量子科研桌面工作台，同步提供 Codex 原生插件。"
    line2 = "Open-source &amp; local-first · Bring any Tool Calling model provider" if en else "开源免费 · 本地优先 · 接入任意支持 Tool Calling 的模型服务"
    cta = "Download macOS" if en else "下载 macOS 版"
    css = f"""
#shot {{
  width: {CSS_W}px; height: 184px; border-radius: 24px;
  background: {bg};
  border: 1px solid {border};
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 42px; gap: 28px;
  position: relative; overflow: hidden;
}}
.sheen {{
  position: absolute; inset: 0;
  background: radial-gradient(60% 140% at 12% 0%, rgba(34, 211, 238, 0.12) 0%, rgba(14, 19, 27, 0) 65%);
  pointer-events: none;
}}
.left {{ display: flex; align-items: center; gap: 26px; position: relative; z-index: 2; }}
.app-icon {{
  width: 82px; height: 82px; border-radius: 20px; flex: none;
  background: {icon_bg};
  border: 1px solid rgba(255, 255, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.14);
}}
.app-icon img {{ width: 52px; height: 52px; display: block; }}
.heading {{
  font-size: 31px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; color: #F8FAFC;
}}
.heading span {{
  font-family: "JB Mono", monospace; font-size: 14px; font-weight: 500;
  color: #67E8F9; margin-left: 10px; letter-spacing: 0; vertical-align: 3px;
}}
.line1 {{ margin-top: 8px; font-size: 15px; color: #E2E8F0; line-height: 1.45; }}
.line2 {{ margin-top: 3px; font-size: 13.5px; color: #94A3B8; line-height: 1.45; }}
.cta {{
  position: relative; z-index: 2; flex: none;
  background: {btn_bg}; color: {btn_ink};
  padding: 14px 26px; border-radius: 999px;
  font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em;
  display: inline-flex; align-items: center; gap: 10px; white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}}
"""
    body = f"""
<div id="shot">
  <div class="sheen"></div>
  <div class="left">
    <div class="app-icon"><img src="{icon_uri}" alt="" /></div>
    <div>
      <div class="heading">OpenQuantum Desktop<span>v0.8.11</span></div>
      <div class="line1">{line1}</div>
      <div class="line2">{line2}</div>
    </div>
  </div>
  <div class="cta">{cta} <span>↗</span></div>
</div>
"""
    return wrap_doc(body, css, "en" if en else "zh-CN")


def workflow_plate(dark: bool, d: dict, lang: str = "zh") -> str:
    mark_uri = (BRAND / ("mark-inverse.svg" if dark else "mark.svg")).as_uri()
    en = lang == "en"
    outer_bg = "#101620" if dark else "#F6F8FB"
    outer_bd = "rgba(255,255,255,0.10)" if dark else "rgba(15,23,42,0.08)"
    win_bg = "#0B1018" if dark else "#FFFFFF"
    win_bd = "rgba(255,255,255,0.10)" if dark else "rgba(15,23,42,0.09)"
    bar_bg = "#121A26" if dark else "#F8FAFC"
    ink = "#F1F5F9" if dark else "#0F172A"
    sub = "#94A3B8" if dark else "#475569"
    muted = "#64748B"
    bubble_bg = "#1A2638" if dark else "#EEF4F9"
    bubble_ink = "#F1F5F9" if dark else "#0F172A"
    step_bg = "#111A27" if dark else "#F8FAFC"
    step_bd = "rgba(255,255,255,0.08)" if dark else "rgba(15,23,42,0.08)"
    ok_bg = "rgba(16, 185, 129, 0.14)" if dark else "#E6F7EF"
    ok_ink = "#34D399" if dark else "#047857"
    accent = "#22D3EE" if dark else "#0E7490"
    res_bg = "#111926" if dark else "#F4F8FB"
    rail_bg = "#131C2A" if dark else "#FFFFFF"
    vqe, review = d["vqe"], d["review"]
    passed = review["observations"]["pass"]
    copy = (
        {
            "s1t": "Ask in plain language",
            "s1d": "Describe a physics question, paste a paper or circuit—no boilerplate setup first.",
            "s2t": "Compute locally in pinned SDKs",
            "s2d": "Matches the right library and runs deterministic numerical calculations on your machine.",
            "s3t": "Verify independently",
            "s3d": "Separates completed tool execution from scientific acceptance with exact references.",
            "win": "OpenQuantum · H₂ Ground-State VQE Local Demo",
            "badge": f'{passed} PASS · {review["observations"]["not_checked"]} NOT_CHECKED',
            "user": "Solve the 2-qubit H₂ Pauli Hamiltonian in the fixed particle sector and cross-check against exact diagonalization.",
            "sub": "Local deterministic solver · Independent numerical checks",
            "t1": "Load sector constraints &amp; VQE workflow",
            "t2": f'Converge noiseless statevector VQE ({vqe["evaluationCount"]} evals)',
            "t3": f'Exact diagonalization · {passed} local checks; provenance {review["provenance"]}',
            "t3code": "validator",
            "t3status": "OBSERVED",
            "m1": "VQE sector ground energy",
            "m2": "Absolute diff vs. exact ref",
            "m3val": "NOT DERIVED",
            "m3": "Provenance checked in DSH L3",
            "ev": "Reproduce locally (no API key):",
        }
        if en
        else {
            "s1t": "用自然语言提问",
            "s1d": "直接提出物理问题、贴入论文或线路，不必先学几十套软件。",
            "s2t": "本地自动实算",
            "s2d": "按任务匹配锁定环境与量子库，在本机完成真实数值计算。",
            "s3t": "独立科学核验",
            "s3d": "把“代码跑通”与“科学验收”严格拆开，留存误差与来源边界。",
            "win": "OpenQuantum · H₂ 分子基态 VQE 本机复算示例",
            "badge": f"{passed} 项通过 · 来源未核查",
            "user": "求解给定 H₂ 二量子位哈密顿量在固定粒子扇区的基态能量，并用精确对角化核对误差。",
            "sub": "本机确定性求解 · 独立数值检查（验收由 DSH 会话另行推导）",
            "t1": "加载扇区约束与 VQE 流程",
            "t2": f'无噪 statevector VQE 优化收敛（{vqe["evaluationCount"]} 次评估）',
            "t3": f'独立精确对角化 · {passed} 项计算检查通过，来源链保留 {review["provenance"]}',
            "t3code": "validator",
            "t3status": "OBSERVED",
            "m1": "VQE 扇区基态能量",
            "m2": "与精确参考绝对差",
            "m3val": "NOT DERIVED",
            "m3": "独立观测已产出 · DSH 推导验收",
            "ev": "本机一键零密钥复跑：",
        }
    )
    css = f"""
#shot {{
  width: {CSS_W}px; border-radius: 24px; padding: 28px;
  background: {outer_bg}; border: 1px solid {outer_bd};
}}
.grid {{
  display: grid; grid-template-columns: 248px 1fr; gap: 22px; align-items: stretch;
}}
.rail {{
  display: flex; flex-direction: column; justify-content: space-between; gap: 14px;
}}
.step-card {{
  flex: 1; background: {rail_bg}; border: 1px solid {step_bd}; border-radius: 16px;
  padding: 18px 20px; display: flex; flex-direction: column; justify-content: center;
}}
.step-card.active {{ border-color: {accent}; }}
.step-title {{ font-size: 15.5px; font-weight: 600; color: {ink}; letter-spacing: -0.015em; }}
.step-desc {{ margin-top: 6px; font-size: 13px; line-height: 1.58; color: {sub}; }}
.win {{
  background: {win_bg}; border: 1px solid {win_bd}; border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: {"0 24px 60px rgba(0,0,0,0.45)" if dark else "0 18px 46px rgba(15,23,42,0.08)"};
}}
.topbar {{
  height: 40px; background: {bar_bg}; border-bottom: 1px solid {step_bd};
  display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
}}
.lights {{ display: flex; gap: 7px; }}
.lights i {{ width: 10px; height: 10px; border-radius: 50%; background: {"rgba(255,255,255,0.16)" if dark else "#CBD5E1"}; display: block; }}
.wintitle {{ font-size: 12.5px; color: {muted}; font-weight: 500; }}
.badge-live {{
  font-size: 11px; padding: 3px 9px; border-radius: 999px;
  background: {ok_bg}; color: {ok_ink}; font-weight: 600;
}}
.chat {{ padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 14px; }}
.user-row {{ display: flex; justify-content: flex-end; }}
.user-msg {{
  background: {bubble_bg}; color: {bubble_ink}; border-radius: 16px 16px 4px 16px;
  padding: 11px 16px; font-size: 13.5px; line-height: 1.55; max-width: 86%;
}}
.agent-head {{ display: flex; align-items: center; gap: 9px; }}
.agent-head img {{ width: 20px; height: 20px; }}
.agent-head b {{ font-size: 13.5px; font-weight: 600; color: {ink}; }}
.agent-head span {{ font-size: 12px; color: {muted}; }}
.trace {{
  background: {step_bg}; border: 1px solid {step_bd}; border-radius: 12px; padding: 11px 14px;
  display: flex; flex-direction: column; gap: 8px;
}}
.trow {{
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font-size: 12px; color: {sub};
}}
.tleft {{ display: flex; align-items: center; gap: 8px; min-width: 0; }}
.chk {{
  width: 15px; height: 15px; border-radius: 50%; background: {ok_bg}; color: {ok_ink};
  display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex: none;
}}
.tcode {{ color: {ink}; font-size: 11.5px; white-space: nowrap; }}
.tstatus {{ color: {ok_ink}; font-size: 11px; font-weight: 600; white-space: nowrap; }}
.metrics {{
  background: {res_bg}; border: 1px solid {step_bd}; border-radius: 14px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; overflow: hidden;
}}
.mcell {{ padding: 14px 15px; border-right: 1px solid {step_bd}; }}
.mcell:last-child {{ border-right: 0; }}
.mval {{ font-size: 18px; font-weight: 600; color: {ink}; letter-spacing: -0.02em; white-space: nowrap; }}
.mval.ok {{ color: {ok_ink}; }}
.mval sup {{ font-size: 11px; }}
.munit {{ font-size: 12px; font-weight: 500; color: {sub}; margin-left: 3px; }}
.mlabel {{ margin-top: 4px; font-size: 11.5px; color: {muted}; }}
.evidence {{
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  font-size: 12px; color: {sub}; padding-top: 2px;
}}
.pill-file {{
  padding: 4px 10px; border-radius: 8px; background: {step_bg}; border: 1px solid {step_bd};
  color: {ink}; font-size: 11.5px; white-space: nowrap;
}}
"""
    body = f"""
<div id="shot">
  <div class="grid">
    <div class="rail">
      <div class="step-card">
        <div class="step-title">{copy["s1t"]}</div>
        <div class="step-desc">{copy["s1d"]}</div>
      </div>
      <div class="step-card">
        <div class="step-title">{copy["s2t"]}</div>
        <div class="step-desc">{copy["s2d"]}</div>
      </div>
      <div class="step-card active">
        <div class="step-title">{copy["s3t"]}</div>
        <div class="step-desc">{copy["s3d"]}</div>
      </div>
    </div>
    <div class="win">
      <div class="topbar">
        <div class="lights"><i></i><i></i><i></i></div>
        <div class="wintitle">{copy["win"]}</div>
        <div class="badge-live mono">{copy["badge"]}</div>
      </div>
      <div class="chat">
        <div class="user-row"><div class="user-msg">{copy["user"]}</div></div>
        <div class="agent-head">
          <img src="{mark_uri}" alt="" />
          <b>OpenQuantum</b>
          <span>{copy["sub"]}</span>
        </div>
        <div class="trace">
          <div class="trow">
            <div class="tleft"><span class="chk">✓</span><span class="tcode mono">quantum-ground-state</span><span>{copy["t1"]}</span></div>
            <span class="tstatus mono">READY</span>
          </div>
          <div class="trow">
            <div class="tleft"><span class="chk">✓</span><span class="tcode mono">solve_and_validate_ground_state</span><span>{copy["t2"]}</span></div>
            <span class="tstatus mono">DONE</span>
          </div>
          <div class="trow">
            <div class="tleft"><span class="chk">✓</span><span class="tcode mono">{copy["t3code"]}</span><span>{copy["t3"]}</span></div>
            <span class="tstatus mono">{copy["t3status"]}</span>
          </div>
        </div>
        <div class="metrics">
          <div class="mcell">
            <div class="mval mono">{vqe["energyHartree"]:.8f}<span class="munit">Ha</span></div>
            <div class="mlabel">{copy["m1"]}</div>
          </div>
          <div class="mcell">
            <div class="mval mono">{scientific_html(vqe["absoluteErrorHartree"])}<span class="munit">Ha</span></div>
            <div class="mlabel">{copy["m2"]}</div>
          </div>
          <div class="mcell">
            <div class="mval ok mono" style="font-size:16px">{copy["m3val"]}</div>
            <div class="mlabel">{copy["m3"]}</div>
          </div>
        </div>
        <div class="evidence">
          <span>{copy["ev"]}</span>
          <span class="pill-file mono">npm run demo:quantum-ground-state</span>
        </div>
      </div>
    </div>
  </div>
</div>
"""
    return wrap_doc(body, css, "en" if en else "zh-CN")


def benchmarks_plate(dark: bool, d: dict, lang: str = "zh") -> str:
    wigner_uri = (SITE_ASSETS / "wigner-comparison.svg").as_uri()
    en = lang == "en"
    bg = "#0E141E" if dark else "#F6F8FB"
    bd = "rgba(255,255,255,0.10)" if dark else "rgba(15,23,42,0.08)"
    card_bg = "#131C2A" if dark else "#FFFFFF"
    card_bd = "rgba(255,255,255,0.09)" if dark else "rgba(15,23,42,0.08)"
    ink = "#F8FAFC" if dark else "#0F172A"
    sub = "#94A3B8" if dark else "#475569"
    muted = "#64748B"
    accent = "#22D3EE" if dark else "#0E7490"
    bar_track = "rgba(148,163,184,0.22)" if dark else "#DCE4EC"
    fig_bg = "#FFFFFF"
    copy = (
        {
            "q_name": "QuTiP Wigner Function",
            "q_scope": f'{d["q_task"]["dimension"]}-dim Fock space · {d["q_task"]["nx"]}×{d["q_task"]["ny"]} grid · {d["q_cpu"]}',
            "speed_label": "end-to-end speedup",
            "orig": "Baseline",
            "opt_bar": "Optimized",
            "q_checks": f'Max pointwise diff <b class="mono">{d["q_error"]}</b><br /><b>{d["q_checks"]}</b> independent, analytic &amp; rejection checks passed',
            "p_name": "PennyLane Pauli Commutator",
            "p_scope": f'One commutator [H, A] · {d["p_h_terms"]}-term H and one {d["p_a_terms"]}-term operator sum A<br />{d["p_qubits"]} qubits · {d["p_cpu"]}',
            "p_right": f'<b>{d["p_cases"]} benchmark inputs</b> match exactly<br />{d["p_pairs"]:,} Pauli pairs &amp; {d["p_random"]} random matrices max err <b class="mono">{d["p_error"]}</b>',
            "foot": "Single-threaded median of 9 warm runs including object conversion; excludes setup &amp; compilation. Applies strictly to declared inputs.",
        }
        if en
        else {
            "q_name": "QuTiP Wigner 函数",
            "q_scope": f'{d["q_task"]["dimension"]} 维单模 Fock 空间 · {d["q_task"]["nx"]}×{d["q_task"]["ny"]} 网格 · {d["q_cpu"]}',
            "speed_label": "完整调用提速",
            "orig": "原库",
            "opt_bar": "优化后",
            "q_checks": f'完整网格最大绝对差 <b class="mono">{d["q_error"]}</b><br /><b>{d["q_checks"]} 项</b>独立、解析与拒绝路径检查全部通过',
            "p_name": "PennyLane Pauli 对易子",
            "p_scope": f'一次对易子 [H, A] · {d["p_h_terms"]} 项 H 与一个 {d["p_a_terms"]} 项算符和 A<br />{d["p_qubits"]} 量子位 · {d["p_cpu"]}',
            "p_right": f'<b>{d["p_cases"]} 组基准输入</b>输出算符与系数逐项一致<br />{d["p_pairs"]:,} 对 Pauli 与 {d["p_random"]} 组复系数随机矩阵最大误差 <b class="mono">{d["p_error"]}</b>',
            "foot": "单线程 9 轮热运行中位数，包含输入/输出对象转换，不含环境准备与编译；提速仅对应各报告定义的固定输入与硬件条件。",
        }
    )
    # The published canvas includes the last fractional CSS pixel of the artwork.
    # Give it a fixed size so fallback-font metrics cannot resize the WebP.
    css = f"""
#shot {{ width: {CSS_W}px; height: {641 if en else 649}px; }}
.benchmark-plate {{
  min-height: calc(100% - 1px); max-height: 100%; border-radius: 26px; padding: 26px;
  background: {bg}; border: 1px solid {bd};
  display: flex; flex-direction: column; gap: 18px;
}}
.qutip-card {{
  background: {card_bg}; border: 1px solid {card_bd}; border-radius: 20px;
  padding: 28px 30px;
  display: grid; grid-template-columns: 350px 1fr; gap: 26px; align-items: center;
}}
.name {{ font-size: 20px; font-weight: 600; color: {ink}; letter-spacing: -0.02em; }}
.scope {{ margin-top: 5px; font-size: 13px; color: {muted}; }}
.hero-x {{ margin-top: 20px; display: flex; align-items: baseline; gap: 12px; }}
.hero-x strong {{ font-size: 62px; font-weight: 600; letter-spacing: -0.045em; line-height: 1; color: {ink}; }}
.hero-x span {{ font-size: 14.5px; color: {accent}; font-weight: 600; white-space: nowrap; }}
.times {{ margin-top: 18px; display: flex; align-items: baseline; gap: 10px; font-size: {"13px" if en else "14.5px"}; color: {sub}; white-space: nowrap; }}
.times b {{ color: {ink}; font-weight: 600; }}
.bars {{ margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }}
.bar-row {{ display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: {muted}; }}
.bar-row span {{ width: 68px; flex: none; }}
.track {{ flex: 1; height: 7px; background: {bar_track}; border-radius: 999px; overflow: hidden; }}
.fill-base {{ width: 100%; height: 100%; background: {"rgba(148,163,184,0.45)" if dark else "#94A3B8"}; border-radius: 999px; }}
.fill-opt {{ height: 100%; background: {accent}; border-radius: 999px; }}
.checks {{ margin-top: 18px; padding-top: 14px; border-top: 1px solid {card_bd}; font-size: 12.5px; line-height: 1.65; color: {sub}; }}
.checks b {{ color: {ink}; font-weight: 600; }}
.checks sup, .penny-right sup {{ font-size: 10px; }}
.fig-wrap {{ background: {fig_bg}; border-radius: 14px; padding: 14px 16px 12px; border: 1px solid rgba(15,23,42,0.08); }}
.fig-wrap img {{ width: 100%; height: auto; display: block; }}
.penny-card {{
  background: {card_bg}; border: 1px solid {card_bd}; border-radius: 20px;
  padding: 22px 28px;
  display: grid; grid-template-columns: 168px 1fr 258px; gap: 24px; align-items: center;
}}
.penny-x strong {{ font-size: 46px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; color: {ink}; }}
.penny-x span {{ display: block; margin-top: 6px; font-size: 12.5px; color: {accent}; font-weight: 600; }}
.penny-mid .name {{ font-size: 18px; }}
.penny-mid .times {{ margin-top: 10px; font-size: 13.5px; gap: 10px; white-space: nowrap; }}
.penny-mid .bars {{ margin-top: 10px; }}
.penny-right {{ border-left: 1px solid {card_bd}; padding-left: 20px; font-size: 12.5px; line-height: 1.7; color: {sub}; }}
.penny-right b {{ color: {ink}; font-weight: 600; }}
.foot-note {{ font-size: 11.5px; color: {muted}; text-align: center; padding: 0 12px; }}
"""
    body = f"""
<div id="shot"><div class="benchmark-plate">
  <div class="qutip-card">
    <div>
      <div class="name">{copy["q_name"]}</div>
      <div class="scope">{copy["q_scope"]}</div>
      <div class="hero-x">
        <strong class="num">{d["q_speedup"]}</strong>
        <span>{copy["speed_label"]}</span>
      </div>
      <div class="times mono">
        <span>{copy["orig"]} {d["q_base"]} ms</span>
        <span>→</span>
        <b>OpenQuantum {d["q_opt"]} ms</b>
      </div>
      <div class="bars">
        <div class="bar-row"><span>QuTiP</span><div class="track"><div class="fill-base"></div></div></div>
        <div class="bar-row"><span>{copy["opt_bar"]}</span><div class="track"><div class="fill-opt" style="width:{d['q_ratio']*100:.1f}%"></div></div></div>
      </div>
      <div class="checks">{copy["q_checks"]}</div>
    </div>
    <div class="fig-wrap">
      <img src="{wigner_uri}" alt="QuTiP Wigner phase-space comparison" />
    </div>
  </div>

  <div class="penny-card">
    <div class="penny-x">
      <strong class="num">{d["p_speedup"]}</strong>
      <span>{copy["speed_label"]}</span>
    </div>
    <div class="penny-mid">
      <div class="name">{copy["p_name"]}</div>
      <div class="scope">{copy["p_scope"]}</div>
      <div class="times mono">
        <span>{copy["orig"]} {d["p_base"]} ms</span>
        <span>→</span>
        <b>OpenQuantum {d["p_opt"]} ms</b>
      </div>
      <div class="bars">
        <div class="bar-row"><span>PennyLane</span><div class="track"><div class="fill-base"></div></div></div>
        <div class="bar-row"><span>{copy["opt_bar"]}</span><div class="track"><div class="fill-opt" style="width:{d['p_ratio']*100:.1f}%"></div></div></div>
      </div>
    </div>
    <div class="penny-right">{copy["p_right"]}</div>
  </div>

  <div class="foot-note">{copy["foot"]}</div>
</div></div>
"""
    return wrap_doc(body, css, "en" if en else "zh-CN")


def keynote_plates() -> dict[str, str]:
    d = load_data()
    return {
        "hero-zh-light": hero_plate(False, "zh"),
        "hero-zh-dark": hero_plate(True, "zh"),
        "launch-card-light": launch_card_plate(False, "zh"),
        "launch-card-dark": launch_card_plate(True, "zh"),
        "workflow-zh-light": workflow_plate(False, d, "zh"),
        "workflow-zh-dark": workflow_plate(True, d, "zh"),
        "benchmarks-zh-light": benchmarks_plate(False, d, "zh"),
        "benchmarks-zh-dark": benchmarks_plate(True, d, "zh"),
        "hero-en-light": hero_plate(False, "en"),
        "hero-en-dark": hero_plate(True, "en"),
        "launch-card-en-light": launch_card_plate(False, "en"),
        "launch-card-en-dark": launch_card_plate(True, "en"),
        "workflow-en-light": workflow_plate(False, d, "en"),
        "workflow-en-dark": workflow_plate(True, d, "en"),
        "benchmarks-en-light": benchmarks_plate(False, d, "en"),
        "benchmarks-en-dark": benchmarks_plate(True, d, "en"),
    }


async def render_plates(plates: dict[str, str], output: Path) -> None:
    from PIL import Image
    from playwright.async_api import async_playwright

    output.mkdir(parents=True, exist_ok=True)
    chrome = os.environ.get("CHROME") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        async with async_playwright() as p:
            options = {"args": ["--no-sandbox", "--allow-file-access-from-files"]}
            if Path(chrome).exists():
                options["executable_path"] = chrome
            browser = await p.chromium.launch(**options)
            for name, markup in plates.items():
                src = workdir / f"{name}.html"
                src.write_text(markup, encoding="utf-8")
                tab = await browser.new_page(
                    viewport={"width": 1200, "height": 1200},
                    device_scale_factor=SCALE,
                    reduced_motion="reduce",
                )
                await tab.goto(src.as_uri())
                await tab.wait_for_load_state("networkidle")
                await tab.evaluate("document.fonts.ready")
                await tab.wait_for_timeout(200)
                shot_png = workdir / f"{name}.png"
                await (await tab.query_selector("#shot")).screenshot(path=str(shot_png), omit_background=True)
                await tab.close()
                im = Image.open(shot_png)
                target = output / f"{name}.webp"
                im.save(target, "WEBP", quality=92, method=6)
                print(f"{target.name}  {im.width}×{im.height}  {target.stat().st_size // 1024} KB")
            await browser.close()


if __name__ == "__main__":
    asyncio.run(render_plates(keynote_plates(), OUT))
