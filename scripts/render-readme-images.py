#!/usr/bin/env python3
"""Render the README banner and benchmark cards from the product homepage.

The images reuse the homepage markup, styles and assets byte for byte, so the
README and https://xi-zhao.github.io/OpenQuantum/ share one visual source.
Numbers on the benchmark cards come from the homepage, which tests/homepage.test.mjs
checks against the frozen experiment data.

Optional tooling, not a project dependency:
  pip install playwright pillow   # plus a local Chrome or `playwright install chromium`
  python3 scripts/render-readme-images.py

Set CHROME to a Chrome/Chromium executable to use it instead of Playwright's browser.
"""

from __future__ import annotations

import asyncio
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "dist" / "homepage"
OUTPUT = ROOT / "docs" / "images" / "readme"
SCALE = 2
WIDTH = 1800  # output pixels; GitHub shows README images at roughly 880 CSS px

STYLE = """
html, body { background: transparent !important; margin: 0; }
.banner { position: relative; width: 1200px; height: 600px; border-radius: 28px; overflow: hidden;
  background: #f2f8fe; display: flex; align-items: center; justify-content: center; }
.banner .hero-figure figcaption { left: 40px; bottom: 26px; }
.banner .hero-copy { max-width: 760px; }
.banner h1 { font-size: 76px; font-weight: 450; line-height: 1.25; letter-spacing: -.035em; }
.banner .hero-description { max-width: 520px; margin: 30px auto 0; font-size: 20px; line-height: 1.85; color: #3f5264; }
.banner .hero-note { margin: 26px auto 0; font-size: 16px; color: #3f5264; }
.banner .hero-tags { position: absolute; right: 40px; bottom: 26px; z-index: 2; font-size: 14px; color: #536779; }
.cases { width: 920px; }
.cases .case-panel { margin: 0; padding: 32px; }
.cases .case-result p { font-size: 16px; }
"""

BANNER = """<section class="banner" id="shot">
  <figure class="hero-figure"><div class="hero-field"><img src="./assets/quantum-field-v3.png" alt=""></div>
    <figcaption>量子波场 · 概念视觉</figcaption></figure>
  <div class="hero-copy">
    <h1>共建可信的<br>量子科研智能</h1>
    <p class="hero-description">开源开放的量子科研 AI 平台，汇聚社区的优秀软件与方法，推进可核对的研究。</p>
    <p class="hero-note">把量子科研的专业积累，汇聚到一个 OpenQuantum。</p>
  </div>
  <span class="hero-tags">Codex 插件 · Desktop · 开源 MIT</span>
</section>"""


def page(body: str) -> str:
    return (
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
        f'<base href="{SITE.as_uri()}/"><link rel="stylesheet" href="./style.css">'
        f"<style>{STYLE}</style></head><body>{body}</body></html>"
    )


def case_panel(html: str, case: str) -> str:
    article = re.search(rf'<article class="case-panel" id="case-{case}".*?</article>', html, re.S).group(0)
    article = re.sub(r'\s*<details class="case-conditions">.*?</details>', "", article, flags=re.S)
    article = re.sub(r'\s*<div class="case-links">.*?</div>', "", article, flags=re.S)
    article = article.replace('loading="lazy"', 'loading="eager"')
    return f'<div class="cases" id="shot">{article}</div>'


async def render(pages: dict[str, str], workdir: Path) -> None:
    async with async_playwright() as p:
        options = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROME"):
            options["executable_path"] = os.environ["CHROME"]
        browser = await p.chromium.launch(**options)
        for name, markup in pages.items():
            source = workdir / f"{name}.html"
            source.write_text(page(markup), encoding="utf-8")
            tab = await browser.new_page(viewport={"width": 1300, "height": 900},
                                         device_scale_factor=SCALE, reduced_motion="reduce")
            await tab.goto(source.as_uri())
            await tab.wait_for_load_state("networkidle")
            await tab.evaluate("document.fonts.ready")
            await tab.wait_for_timeout(500)
            shot = workdir / f"{name}.png"
            await (await tab.query_selector("#shot")).screenshot(path=str(shot), omit_background=True)
            await tab.close()
            image = Image.open(shot)
            image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
            target = OUTPUT / f"{name}.webp"
            image.save(target, "WEBP", quality=88, method=6)
            print(f"{target.relative_to(ROOT)}  {image.width}×{image.height}  {target.stat().st_size // 1024} KB")
        await browser.close()


def main() -> None:
    subprocess.run(["node", "scripts/build-homepage.mjs"], cwd=ROOT, check=True)
    html = (SITE / "index.html").read_text(encoding="utf-8")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    pages = {
        "banner": BANNER,
        "case-qutip": case_panel(html, "qutip"),
        "case-pennylane": case_panel(html, "pennylane"),
    }
    with tempfile.TemporaryDirectory() as workdir:
        asyncio.run(render(pages, Path(workdir)))


if __name__ == "__main__":
    main()
