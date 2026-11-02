#!/usr/bin/env python3
"""Render the OpenQuantum promo film and README hero loop from stage.html.

  python3 render.py film  OUT_DIR   # 1920x1080 30 fps, one H.264 file per shot, joined, plus score
  ONLY=REACH python3 render.py film OUT_DIR   # re-render one shot, reuse the others
  python3 render.py hero  OUT_DIR   # 1440x720 20 fps seamless animated WebP and a still WebP

Optional tooling (not project dependencies): Playwright with Chrome/Chromium, Pillow, numpy,
scipy and ffmpeg built with libx264 and libwebp. Set CHROME to use a local Chrome binary.
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
STAGE = (HERE / "stage.html").as_uri()
FPS = 30
X264 = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", str(FPS * 2)]


async def open_stage(p, query: str, w: int, h: int, dpr: float):
    options = {"args": ["--no-sandbox", "--allow-file-access-from-files"]}
    if os.environ.get("CHROME"):
        options["executable_path"] = os.environ["CHROME"]
    browser = await p.chromium.launch(**options)
    page = await browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=dpr)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(f"{STAGE}?{query}")
    await page.evaluate("window.ready")
    return browser, page, errors


async def film(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser, page, errors = await open_stage(p, "mode=film", 1920, 1080, 1)
        shots = await page.evaluate("window.SHOTS")
        cues = out / "cues.json"
        cues.write_text(json.dumps(await page.evaluate("window.CUES"), ensure_ascii=False, indent=1))
        parts = []
        only = set(filter(None, os.environ.get("ONLY", "").split(",")))   # e.g. ONLY=REACH re-renders one shot
        for name, (a, b) in shots.items():
            target = out / f"shot-{name}.mp4"
            tmp = out / f"shot-{name}.partial.mp4"
            if only and name not in only and target.exists():
                parts.append(target)
                continue
            ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-", *X264, str(tmp)], stdin=subprocess.PIPE)
            for i in range(round(a * FPS), round(b * FPS)):
                await page.evaluate(f"window.render({i / FPS})")
                ff.stdin.write(await page.screenshot(type="jpeg", quality=92))
            ff.stdin.close()
            if ff.wait() != 0:
                raise SystemExit(f"ffmpeg failed on shot {name}")
            tmp.rename(target)
            parts.append(target)
            print(f"shot {name}: {b - a:.1f}s", flush=True)
        await browser.close()
        if errors:
            raise SystemExit("page errors: " + "; ".join(errors[:3]))
    listing = out / "shots.txt"
    listing.write_text("".join(f"file '{p.name}'\n" for p in parts))
    silent = out / "film-silent.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(silent)], check=True)
    score = out / "score.wav"
    subprocess.run([sys.executable, str(HERE / "score.py"), str(cues), str(score)], check=True)
    final = out / "OpenQuantum-promo.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(score), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-shortest", "-movflags", "+faststart", str(final)], check=True)
    # a copy under GitHub's 10 MB attachment limit: two-pass x264 at a fixed size budget
    duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(final)],
                                    capture_output=True, text=True, check=True).stdout)
    kbps = int(9.4 * 8192 / duration) - 128
    small = out / "OpenQuantum-promo-github.mp4"
    log = str(out / "x264-2pass")
    # 720p keeps the particle field clean at this bitrate; GitHub's player is about 880 px wide anyway
    common = ["-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-pix_fmt", "yuv420p", "-passlogfile", log]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(final), *common, "-pass", "1", "-an", "-f", "mp4", os.devnull], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(final), *common, "-pass", "2", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(small)], check=True)
    print(final)
    print(small)


async def hero(out: Path) -> None:
    """Seamless loop for the README hero plus a sharp still for prefers-reduced-motion."""
    out.mkdir(parents=True, exist_ok=True)
    fps, dpr = int(os.environ.get("HERO_FPS", "15")), float(os.environ.get("HERO_DPR", "1"))
    async with async_playwright() as p:
        browser, page, errors = await open_stage(p, f"mode=hero&dpr={dpr}", 1200, 600, dpr)
        period = await page.evaluate("window.DURATION")
        shot = await page.query_selector("#shot")
        tmp = out / "hero.partial.webp"
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "png", "-i", "-",
                               "-c:v", "libwebp_anim", "-pix_fmt", "yuva420p", "-lossless", "0", "-quality", os.environ.get("WEBP_Q", "48"),
                               "-compression_level", "6", "-preset", "picture", "-loop", "0", "-f", "webp", str(tmp)], stdin=subprocess.PIPE)
        for i in range(round(period * fps)):
            await page.evaluate(f"window.render({i / fps})")
            ff.stdin.write(await shot.screenshot(type="png", omit_background=True))
        ff.stdin.close()
        if ff.wait() != 0:
            raise SystemExit("ffmpeg failed on hero loop")
        tmp.rename(out / "banner-motion.webp")
        await browser.close()
        # still: first subtitle fully shown, rendered at a higher density
        browser, page, errors2 = await open_stage(p, "mode=hero&dpr=1.5", 1200, 600, 1.5)
        await page.evaluate("window.render(1.5)")
        (out / "hero-still.png").write_bytes(await (await page.query_selector("#shot")).screenshot(type="png", omit_background=True))
        await browser.close()
        if errors or errors2:
            raise SystemExit("page errors: " + "; ".join((errors + errors2)[:3]))
    from PIL import Image
    Image.open(out / "hero-still.png").save(out / "banner.webp", "WEBP", quality=88, method=6)
    print(out / "banner-motion.webp")


if __name__ == "__main__":
    mode, target = sys.argv[1], Path(sys.argv[2])
    asyncio.run({"film": film, "hero": hero}[mode](target))
