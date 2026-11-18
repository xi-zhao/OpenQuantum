#!/usr/bin/env python3
"""Render the README benchmark cards from the product homepage.

The README banner and its motion loop come from docs/communications/video/render.py.
The cards reuse the homepage markup, styles and assets byte for byte, so the
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
.cases { width: 920px; }
.cases .case-panel { margin: 0; padding: 32px; }
.cases .case-result p { font-size: 16px; }
"""

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
        "case-qutip": case_panel(html, "qutip"),
        "case-pennylane": case_panel(html, "pennylane"),
    }
    with tempfile.TemporaryDirectory() as workdir:
        asyncio.run(render(pages, Path(workdir)))


if __name__ == "__main__":
    main()
