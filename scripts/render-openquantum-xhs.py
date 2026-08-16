#!/usr/bin/env python3
"""Render the three-image OpenQuantum Xiaohongshu introduction set."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "docs" / "communications" / "xhs" / "openquantum-intro"
RAW_DIR = ASSET_DIR / "raw"
OUTPUT_DIR = ASSET_DIR / "exports"

WIDTH = 1080
HEIGHT = 1440

PINGFANG = Path(
    "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/"
    "86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc"
)
ARIAL_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")

NAVY = "#082B49"
CYAN = "#08C9DC"
VIOLET = "#6747F4"
INK = "#102337"
MUTED = "#587187"


def font(size: int, *, weight: str = "regular", latin: bool = False) -> ImageFont.FreeTypeFont:
    if latin:
        return ImageFont.truetype(str(ARIAL_BOLD), size=size)
    index = 11 if weight == "semibold" else 3
    return ImageFont.truetype(str(PINGFANG), size=size, index=index)


def require_file(path: Path) -> Path:
    if not path.is_file() or path.stat().st_size == 0:
        raise FileNotFoundError(f"Missing required source asset: {path}")
    return path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cover(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    source = source.convert("RGB")
    target_ratio = size[0] / size[1]
    source_ratio = source.width / source.height
    if source_ratio > target_ratio:
        crop_width = int(source.height * target_ratio)
        left = (source.width - crop_width) // 2
        source = source.crop((left, 0, left + crop_width, source.height))
    else:
        crop_height = int(source.width / target_ratio)
        top = (source.height - crop_height) // 2
        source = source.crop((0, top, source.width, top + crop_height))
    return source.resize(size, Image.Resampling.LANCZOS)


def vertical_gradient(
    size: tuple[int, int],
    stops: list[tuple[float, tuple[int, int, int, int]]],
) -> Image.Image:
    width, height = size
    gradient = Image.new("RGBA", size)
    pixels = gradient.load()
    stops = sorted(stops, key=lambda item: item[0])
    for y in range(height):
        position = y / max(height - 1, 1)
        left = stops[0]
        right = stops[-1]
        for index in range(len(stops) - 1):
            if stops[index][0] <= position <= stops[index + 1][0]:
                left = stops[index]
                right = stops[index + 1]
                break
        span = max(right[0] - left[0], 1e-9)
        amount = (position - left[0]) / span
        color = tuple(
            round(left[1][channel] + (right[1][channel] - left[1][channel]) * amount)
            for channel in range(4)
        )
        for x in range(width):
            pixels[x, y] = color
    return gradient


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def add_card(
    canvas: Image.Image,
    content: Image.Image,
    box: tuple[int, int, int, int],
    *,
    radius: int = 34,
    shadow_alpha: int = 58,
    border: tuple[int, int, int, int] | None = None,
) -> None:
    left, top, right, bottom = box
    size = (right - left, bottom - top)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (left + 4, top + 18, right + 4, bottom + 18),
        radius=radius,
        fill=(2, 25, 43, shadow_alpha),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas.alpha_composite(shadow)

    target = cover(content, size).convert("RGBA")
    mask = rounded_mask(size, radius)
    canvas.paste(target, (left, top), mask)
    if border:
        ImageDraw.Draw(canvas).rounded_rectangle(
            (left, top, right - 1, bottom - 1), radius=radius, outline=border, width=2
        )


def draw_brand(canvas: Image.Image, mark: Image.Image, *, dark: bool) -> None:
    mark_size = 62
    resized = mark.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (70, 62))
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (148, 91),
        "Open",
        font=font(38, latin=True),
        fill="#FFFFFF" if dark else NAVY,
        anchor="lm",
    )
    open_width = draw.textlength("Open", font=font(38, latin=True))
    draw.text(
        (148 + int(open_width) - 1, 91),
        "Quantum",
        font=font(38, latin=True),
        fill=CYAN,
        anchor="lm",
    )


def draw_badge(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    *,
    fill: tuple[int, int, int, int],
    text_fill: str,
    outline: tuple[int, int, int, int] | None = None,
    text_size: int = 26,
) -> tuple[int, int, int, int]:
    badge_font = font(text_size, weight="semibold")
    bbox = draw.textbbox((0, 0), text, font=badge_font)
    width = bbox[2] - bbox[0] + 40
    height = bbox[3] - bbox[1] + 24
    box = (xy[0], xy[1], xy[0] + width, xy[1] + height)
    draw.rounded_rectangle(box, radius=height // 2, fill=fill, outline=outline, width=2)
    draw.text((xy[0] + 20, xy[1] + height // 2), text, font=badge_font, fill=text_fill, anchor="lm")
    return box


def draw_footer(draw: ImageDraw.ImageDraw, page: int, *, dark: bool, label: str) -> None:
    fill = (255, 255, 255, 185) if dark else (8, 43, 73, 170)
    draw.text((70, 1374), label, font=font(24), fill=fill, anchor="lm")
    draw.text((1010, 1374), f"0{page} / 03", font=font(24, latin=True), fill=fill, anchor="rm")


def render_cover(mark: Image.Image) -> Image.Image:
    background = cover(Image.open(require_file(RAW_DIR / "page-01-hero.png")), (WIDTH, HEIGHT)).convert("RGBA")
    background.alpha_composite(
        vertical_gradient(
            (WIDTH, HEIGHT),
            [
                (0.0, (3, 20, 37, 248)),
                (0.42, (5, 27, 49, 205)),
                (0.72, (4, 21, 39, 45)),
                (1.0, (2, 15, 29, 132)),
            ],
        )
    )
    draw_brand(background, mark, dark=True)
    draw = ImageDraw.Draw(background)
    draw_badge(
        draw,
        (70, 180),
        "OPEN SOURCE · QUANTUM AGENT",
        fill=(5, 202, 220, 42),
        text_fill="#B9F8FF",
        outline=(78, 229, 240, 72),
        text_size=23,
    )
    draw.multiline_text(
        (66, 270),
        "我做了一个\n开源量子 Agent 工作台",
        font=font(82, weight="semibold"),
        fill="#FFFFFF",
        spacing=20,
        stroke_width=1,
        stroke_fill=(255, 255, 255, 28),
    )
    draw.text(
        (70, 494),
        "开源、好用、可以继续开发",
        font=font(36, weight="semibold"),
        fill="#BDEFF5",
    )

    panel = (58, 1112, 1022, 1302)
    draw.rounded_rectangle(panel, radius=38, fill=(3, 21, 38, 186), outline=(96, 226, 238, 70), width=2)
    chips = ["量子工具", "科研工作流", "科学验收"]
    x = 90
    for index, chip in enumerate(chips):
        chip_box = (x, 1168, x + 274, 1246)
        colors = [(9, 201, 220, 42), (103, 71, 244, 48), (255, 255, 255, 28)]
        draw.rounded_rectangle(chip_box, radius=26, fill=colors[index], outline=(255, 255, 255, 50), width=2)
        draw.ellipse((x + 24, 1194, x + 42, 1212), fill=[CYAN, VIOLET, "#FFFFFF"][index])
        text_fill = NAVY if index == 2 else "#FFFFFF"
        draw.text((x + 58, 1207), chip, font=font(29, weight="semibold"), fill=text_fill, anchor="lm")
        x += 304
    draw_footer(draw, 1, dark=True, label="OpenQuantum 0.4.0 · MIT License")
    return background


def render_capabilities(mark: Image.Image) -> Image.Image:
    background = cover(Image.open(require_file(RAW_DIR / "page-02-capabilities.png")), (WIDTH, HEIGHT)).convert("RGBA")
    background.alpha_composite(
        vertical_gradient(
            (WIDTH, HEIGHT),
            [
                (0.0, (247, 252, 255, 242)),
                (0.37, (245, 250, 253, 178)),
                (1.0, (238, 248, 252, 212)),
            ],
        )
    )
    draw_brand(background, mark, dark=False)
    draw = ImageDraw.Draw(background)
    draw_badge(
        draw,
        (70, 176),
        "真实产品 · 真实工具",
        fill=(8, 201, 220, 30),
        text_fill="#087B91",
        outline=(8, 201, 220, 58),
        text_size=24,
    )
    draw.multiline_text(
        (66, 252),
        "一句话，\n连接真实量子工具",
        font=font(76, weight="semibold"),
        fill=INK,
        spacing=12,
    )
    draw.text((70, 445), "电路分析 · 后端发现 · 算法求解", font=font(30), fill=MUTED)

    screenshot = Image.open(require_file(ROOT / "docs" / "images" / "openquantum-quantum-settings.jpg"))
    add_card(
        background,
        screenshot,
        (62, 520, 1018, 1010),
        radius=34,
        shadow_alpha=42,
        border=(255, 255, 255, 215),
    )
    draw = ImageDraw.Draw(background)
    draw_badge(
        draw,
        (784, 956),
        "真实界面截图",
        fill=(3, 24, 43, 188),
        text_fill="#FFFFFF",
        text_size=21,
    )

    cards = [
        ("Qiskit", "电路分析与官方文档", CYAN),
        ("FieldQKit", "国内后端发现（只读）", VIOLET),
        ("OpenQuantum", "VQE + 独立 Validator", NAVY),
    ]
    card_width = 296
    for index, (title, body, accent) in enumerate(cards):
        left = 62 + index * 320
        top = 1056
        box = (left, top, left + card_width, 1278)
        draw.rounded_rectangle(box, radius=30, fill=(255, 255, 255, 228), outline=(8, 43, 73, 24), width=2)
        draw.rounded_rectangle((left + 22, top + 24, left + 70, top + 72), radius=15, fill=accent)
        draw.ellipse((left + 37, top + 39, left + 55, top + 57), fill="#FFFFFF")
        draw.text((left + 22, top + 103), title, font=font(29, weight="semibold", latin=title != "OpenQuantum"), fill=INK)
        draw.multiline_text((left + 22, top + 151), body, font=font(24), fill=MUTED, spacing=5)
    draw_footer(draw, 2, dark=False, label="Skill · MCP · Validator，由同一个 Agent 组合")
    return background


def render_trust(mark: Image.Image) -> Image.Image:
    background = cover(Image.open(require_file(RAW_DIR / "page-03-trust.png")), (WIDTH, HEIGHT)).convert("RGBA")
    background.alpha_composite(
        vertical_gradient(
            (WIDTH, HEIGHT),
            [
                (0.0, (3, 19, 35, 246)),
                (0.42, (5, 25, 45, 210)),
                (1.0, (2, 15, 28, 170)),
            ],
        )
    )
    draw_brand(background, mark, dark=True)
    draw = ImageDraw.Draw(background)
    draw_badge(
        draw,
        (70, 176),
        "科研 Agent，必须可复核",
        fill=(103, 71, 244, 46),
        text_fill="#DDD6FF",
        outline=(137, 116, 255, 82),
        text_size=24,
    )
    draw.multiline_text(
        (66, 252),
        "运行完成，\n不等于科学验收通过",
        font=font(73, weight="semibold"),
        fill="#FFFFFF",
        spacing=12,
    )
    draw.text((70, 438), "执行轨迹与独立 Validator 分开记录", font=font(29), fill="#BDEFF5")

    screenshot = Image.open(require_file(ROOT / "docs" / "images" / "openquantum-quantum-result.jpg"))
    add_card(
        background,
        screenshot,
        (62, 508, 1018, 976),
        radius=34,
        shadow_alpha=78,
        border=(115, 231, 241, 72),
    )
    draw = ImageDraw.Draw(background)
    draw_badge(
        draw,
        (786, 922),
        "真实运行结果",
        fill=(3, 24, 43, 205),
        text_fill="#FFFFFF",
        text_size=21,
    )

    metrics = [
        ("VQE 能量", "-1.85727503 Ha"),
        ("精确参考", "-1.85727503 Ha"),
        ("绝对差值", "4.44e-16 Ha"),
    ]
    for index, (label, value) in enumerate(metrics):
        left = 62 + index * 320
        box = (left, 1024, left + 296, 1178)
        draw.rounded_rectangle(box, radius=28, fill=(3, 21, 38, 188), outline=(112, 231, 240, 58), width=2)
        draw.text((left + 22, 1062), label, font=font(23), fill="#A8CAD5")
        draw.text((left + 22, 1122), value, font=font(25, weight="semibold"), fill="#FFFFFF")

    acceptance = (62, 1215, 1018, 1302)
    draw.rounded_rectangle(acceptance, radius=28, fill=(8, 201, 220, 36), outline=(92, 230, 240, 78), width=2)
    draw.ellipse((90, 1243, 118, 1271), fill=CYAN)
    draw.line((97, 1257, 104, 1264, 113, 1250), fill="#FFFFFF", width=5, joint="curve")
    draw.text((138, 1258), "16 项科学检查全部通过", font=font(30, weight="semibold"), fill="#FFFFFF", anchor="lm")
    draw.text((986, 1258), "过程看得见 · 结果可复核", font=font(23), fill="#BDEFF5", anchor="rm")
    draw_footer(draw, 3, dark=True, label="GitHub · xi-zhao/openQuantum")
    return background


def save_export(image: Image.Image, filename: str) -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    image.convert("RGB").save(path, format="PNG", optimize=True)
    return {
        "file": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def main() -> None:
    require_file(PINGFANG)
    require_file(ARIAL_BOLD)
    mark = Image.open(require_file(ROOT / "public" / "openquantum" / "icon-512.png")).convert("RGBA")

    exports = [
        save_export(render_cover(mark), "openquantum-xhs-01-cover.png"),
        save_export(render_capabilities(mark), "openquantum-xhs-02-capabilities.png"),
        save_export(render_trust(mark), "openquantum-xhs-03-trust.png"),
    ]
    manifest = {
        "schemaVersion": 1,
        "platform": "Xiaohongshu",
        "canvas": {"width": WIDTH, "height": HEIGHT, "aspectRatio": "3:4"},
        "exports": exports,
        "sourceScreenshots": [
            {
                "file": "docs/images/openquantum-quantum-settings.jpg",
                "sha256": sha256(ROOT / "docs" / "images" / "openquantum-quantum-settings.jpg"),
            },
            {
                "file": "docs/images/openquantum-quantum-result.jpg",
                "sha256": sha256(ROOT / "docs" / "images" / "openquantum-quantum-result.jpg"),
            },
        ],
        "brandSource": "public/openquantum/icon-512.png",
        "generatedBackgrounds": [
            {
                "file": "docs/communications/xhs/openquantum-intro/raw/page-01-hero.png",
                "sha256": sha256(RAW_DIR / "page-01-hero.png"),
            },
            {
                "file": "docs/communications/xhs/openquantum-intro/raw/page-02-capabilities.png",
                "sha256": sha256(RAW_DIR / "page-02-capabilities.png"),
            },
            {
                "file": "docs/communications/xhs/openquantum-intro/raw/page-03-trust.png",
                "sha256": sha256(RAW_DIR / "page-03-trust.png"),
            },
        ],
        "provenance": "docs/communications/xhs/openquantum-intro/PROVENANCE.md",
    }
    (ASSET_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
