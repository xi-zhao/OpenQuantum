#!/usr/bin/env python3
"""Render the three-image OpenQuantum Xiaohongshu introduction set."""

from __future__ import annotations

import argparse
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


def make_pastel_canvas(
    top: tuple[int, int, int, int],
    bottom: tuple[int, int, int, int],
) -> Image.Image:
    return vertical_gradient((WIDTH, HEIGHT), [(0.0, top), (1.0, bottom)]).convert("RGBA")


def draw_panel(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    *,
    fill: str | tuple[int, int, int, int] = "#FFFFFF",
    outline: str | tuple[int, int, int, int] = "#DCE5F2",
    radius: int = 28,
    shadow_alpha: int = 24,
) -> None:
    left, top, right, bottom = box
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (left + 2, top + 10, right + 2, bottom + 10),
        radius=radius,
        fill=(14, 42, 78, shadow_alpha),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(canvas).rounded_rectangle(
        box,
        radius=radius,
        fill=fill,
        outline=outline,
        width=2,
    )


def draw_orbit_decoration(
    canvas: Image.Image,
    center: tuple[int, int],
    *,
    scale: int = 1,
    color: tuple[int, int, int, int] = (103, 71, 244, 34),
) -> None:
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = center
    for width, height, angle_offset in [(290, 120, 0), (250, 155, 14), (225, 185, 28)]:
        width *= scale
        height *= scale
        box = (cx - width // 2, cy - height // 2, cx + width // 2, cy + height // 2)
        draw.ellipse(box, outline=color, width=max(2, 3 * scale))
        dot_x = cx + width // 2 - 12 * scale - angle_offset
        draw.ellipse(
            (dot_x, cy - 8 * scale, dot_x + 16 * scale, cy + 8 * scale),
            fill=(8, 201, 220, min(color[3] + 65, 150)),
        )
    canvas.alpha_composite(overlay)


def draw_segments(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    segments: list[tuple[str, str]],
    text_font: ImageFont.FreeTypeFont,
) -> None:
    x, y = xy
    for text, fill in segments:
        draw.text((x, y), text, font=text_font, fill=fill)
        x += int(draw.textlength(text, font=text_font))


def draw_feature_icon(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    *,
    kind: str,
    accent: str,
) -> None:
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=22, fill=accent)
    white = "#FFFFFF"
    if kind == "chat":
        draw.rounded_rectangle((left + 18, top + 18, right - 18, bottom - 24), radius=10, outline=white, width=4)
        draw.polygon(
            [(left + 30, bottom - 24), (left + 25, bottom - 12), (left + 44, bottom - 24)],
            fill=white,
        )
        draw.ellipse((left + 29, top + 37, left + 37, top + 45), fill=white)
        draw.ellipse((left + 45, top + 37, left + 53, top + 45), fill=white)
    elif kind == "tools":
        draw.ellipse((left + 17, top + 17, left + 48, top + 48), outline=white, width=4)
        draw.line((left + 43, top + 43, right - 17, bottom - 17), fill=white, width=6)
        draw.ellipse((right - 25, bottom - 25, right - 13, bottom - 13), fill=white)
    elif kind == "trace":
        points = [(left + 20, bottom - 22), (left + 38, top + 24), (right - 20, top + 42)]
        draw.line(points, fill=white, width=4)
        for x, y in points:
            draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=white)
    elif kind == "check":
        draw.polygon(
            [
                (left + 40, top + 14),
                (right - 16, top + 25),
                (right - 22, bottom - 22),
                (left + 40, bottom - 10),
                (left + 16, bottom - 22),
                (left + 16, top + 25),
            ],
            outline=white,
        )
        draw.line((left + 27, top + 42, left + 37, top + 52, right - 24, top + 31), fill=white, width=5)
    elif kind == "book":
        draw.rounded_rectangle((left + 15, top + 18, left + 38, bottom - 15), radius=6, outline=white, width=4)
        draw.rounded_rectangle((left + 42, top + 18, right - 15, bottom - 15), radius=6, outline=white, width=4)
        draw.line((left + 40, top + 18, left + 40, bottom - 12), fill=white, width=3)
    elif kind == "server":
        for offset in (0, 19, 38):
            draw.rounded_rectangle(
                (left + 16, top + 14 + offset, right - 16, top + 29 + offset),
                radius=5,
                outline=white,
                width=3,
            )
            draw.ellipse((right - 28, top + 19 + offset, right - 22, top + 25 + offset), fill=white)


def draw_status_pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    *,
    fill: str,
    text_fill: str,
) -> None:
    label_font = font(17, weight="semibold")
    width = int(draw.textlength(text, font=label_font)) + 24
    box = (xy[0], xy[1], xy[0] + width, xy[1] + 34)
    draw.rounded_rectangle(box, radius=17, fill=fill)
    draw.text((xy[0] + 12, xy[1] + 17), text, font=label_font, fill=text_fill, anchor="lm")


def draw_page_label(draw: ImageDraw.ImageDraw, page: int, *, fill: str = NAVY) -> None:
    draw.text((1018, 1386), f"0{page} / 03", font=font(22, latin=True), fill=fill, anchor="rm")


def render_overview_v2(mark: Image.Image) -> Image.Image:
    canvas = make_pastel_canvas((246, 245, 255, 255), (241, 249, 255, 255))
    draw_orbit_decoration(canvas, (920, 140), color=(103, 71, 244, 35))
    draw_orbit_decoration(canvas, (955, 1160), color=(8, 201, 220, 24))
    draw = ImageDraw.Draw(canvas)

    draw_badge(
        draw,
        (48, 42),
        "开源项目推荐 ✦",
        fill=(103, 71, 244, 255),
        text_fill="#FFFFFF",
        text_size=23,
    )
    mark_small = mark.resize((78, 78), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark_small, (48, 126))
    draw.text((146, 162), "Open", font=font(78, latin=True), fill="#101B55", anchor="lm")
    open_width = draw.textlength("Open", font=font(78, latin=True))
    draw.text(
        (146 + int(open_width) - 2, 162),
        "Quantum",
        font=font(78, latin=True),
        fill=CYAN,
        anchor="lm",
    )
    draw.text((48, 248), "探索开放量子世界", font=font(54, weight="semibold"), fill="#101B55")
    draw.line((50, 313, 386, 313), fill="#F4B63E", width=8)
    draw.line((302, 319, 478, 319), fill=VIOLET, width=4)

    body_font = font(29)
    draw.text((48, 348), "把量子计算的工具、算法、后端和文档", font=body_font, fill=INK)
    draw.text((48, 393), "放进同一个 Agent 工作台，", font=body_font, fill=INK)
    draw_segments(
        draw,
        (48, 438),
        [("让量子计算", INK), ("更好用、可见、可验证。", "#355AD9")],
        body_font,
    )

    panel = (38, 500, 1042, 1186)
    draw_panel(canvas, panel, fill="#FFFFFF", outline="#E2E6F3", radius=34, shadow_alpha=22)
    features = [
        ("chat", "#7B4DF3", "对话式量子助手", "用自然语言发起任务，Agent 选择并调用量子工具"),
        ("tools", "#22A77C", "量子能力集中接入", "Qiskit、文档、后端发现与算法能力在同一界面"),
        ("trace", "#377EEA", "完整执行轨迹", "Skill、MCP、工具结果和权限状态都可追溯"),
        ("check", "#F2A33A", "独立科学验收", "Validator 按确定规则检查结果，不由模型自证"),
    ]
    row_top = 522
    for index, (kind, accent, title, body) in enumerate(features):
        top = row_top + index * 160
        draw_feature_icon(draw, (68, top + 20, 140, top + 92), kind=kind, accent=accent)
        draw.text((174, top + 24), title, font=font(31, weight="semibold"), fill=accent)
        draw.text((174, top + 76), body, font=font(23), fill=INK)
        if index < len(features) - 1:
            draw.line((174, top + 137, 1004, top + 137), fill="#E7EAF3", width=2)

    cta = (38, 1220, 1042, 1360)
    draw_panel(canvas, cta, fill="#FFFFFF", outline="#8CA1F8", radius=28, shadow_alpha=12)
    draw.ellipse((66, 1250, 132, 1316), fill="#111111")
    draw.text((99, 1283), "GH", font=font(22, latin=True), fill="#FFFFFF", anchor="mm")
    draw.text((158, 1253), "GitHub 开源地址", font=font(25, weight="semibold"), fill=INK)
    draw.text((158, 1300), "github.com/xi-zhao/openQuantum", font=font(27), fill="#24336D")
    draw_status_pill(draw, (828, 1252), "v0.4.0 · MIT", fill="#EEF1FF", text_fill="#4C49C8")
    draw_page_label(draw, 1)
    return canvas


def draw_architecture_card(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    *,
    icon: str,
    accent: str,
    english: str,
    chinese: str,
    body: str,
    footer: str,
) -> None:
    draw_panel(canvas, box, fill="#FFFFFF", outline=accent, radius=26, shadow_alpha=15)
    draw = ImageDraw.Draw(canvas)
    left, top, right, _ = box
    draw_feature_icon(draw, (left + 24, top + 25, left + 90, top + 91), kind=icon, accent=accent)
    draw.text((left + 108, top + 38), english, font=font(29, latin=True), fill=accent)
    draw.text((left + 108, top + 77), chinese, font=font(22, weight="semibold"), fill=INK)
    draw.multiline_text((left + 24, top + 123), body, font=font(22), fill=INK, spacing=9)
    draw.rounded_rectangle((left + 24, top + 225, right - 24, top + 263), radius=19, fill="#F3F6FC")
    draw.text((left + 150, top + 244), footer, font=font(16, weight="semibold"), fill=MUTED, anchor="mm")


def render_architecture_v2(mark: Image.Image) -> Image.Image:
    canvas = make_pastel_canvas((255, 252, 247, 255), (247, 250, 255, 255))
    draw_orbit_decoration(canvas, (940, 105), color=(103, 71, 244, 25))
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 54), "核心架构", font=font(62, weight="semibold"), fill="#111111")
    draw.line((50, 130, 310, 130), fill="#F4B63E", width=8)
    draw.line((220, 137, 418, 137), fill=VIOLET, width=4)
    draw.text((48, 151), "让 Agent 真正理解、执行并验收量子任务", font=font(29), fill=INK)

    architecture = (38, 210, 1042, 832)
    draw_panel(canvas, architecture, fill="#FFFFFF", outline="#E2E1EB", radius=34, shadow_alpha=18)
    draw = ImageDraw.Draw(canvas)
    preset_box = (330, 234, 750, 286)
    draw.rounded_rectangle(preset_box, radius=26, fill="#EFF1FF", outline="#B8B7F4", width=2)
    draw.text((540, 260), "OpenQuantum Agent preset 统一组合", font=font(22, weight="semibold"), fill="#34349A", anchor="mm")

    card_specs = [
        (
            (62, 318, 362, 602),
            "book",
            "#3568F0",
            "SKILL",
            "方法与边界",
            "领域知识与步骤\n告诉 Agent 怎么做",
            "说明方法，不启动工具",
        ),
        (
            (390, 318, 690, 602),
            "server",
            "#15966E",
            "MCP / TOOL",
            "确定性执行",
            "连接工具与数据\n完成可执行任务",
            "产生事实，不自证通过",
        ),
        (
            (718, 318, 1018, 602),
            "check",
            "#7C43D9",
            "VALIDATOR",
            "独立科学检查",
            "按 Profile 检查证据\n模型不能改写结论",
            "检查证据，派生验收",
        ),
    ]
    for box, icon, accent, english, chinese, body, footer in card_specs:
        draw_architecture_card(
            canvas,
            box,
            icon=icon,
            accent=accent,
            english=english,
            chinese=chinese,
            body=body,
            footer=footer,
        )
    draw = ImageDraw.Draw(canvas)
    for x in (212, 540, 868):
        draw.line((540, 286, 540, 300), fill="#8D93C6", width=3)
        draw.line((540, 300, x, 300, x, 318), fill="#8D93C6", width=3)

    harness = (98, 650, 982, 774)
    draw_panel(canvas, harness, fill="#F8FAFF", outline="#A7B3D5", radius=24, shadow_alpha=8)
    draw = ImageDraw.Draw(canvas)
    draw.text((540, 686), "DeepSeek Harness", font=font(34, latin=True), fill="#1E2B68", anchor="mm")
    draw.text((540, 727), "Agent Runtime", font=font(23, latin=True), fill="#33456F", anchor="mm")
    draw.text((540, 757), "会话 · 工具调度 · 权限审批 · 事件持久化", font=font(20), fill=MUTED, anchor="mm")
    for x in (212, 540, 868):
        draw.line((x, 602, x, 626, 540, 626, 540, 650), fill="#8D93C6", width=3)
    draw.text((540, 811), "三块能力独立注册，由 Agent 显式调用；运行事实统一进入 Harness 轨迹", font=font(20), fill=MUTED, anchor="mm")

    draw.text((48, 867), "已接入的量子能力", font=font(32, weight="semibold"), fill="#17235C")
    capabilities = [
        ("Qiskit Circuits", "电路创建、分析与转译", "开启", "#EAF1FF", "#3568F0"),
        ("Qiskit Docs", "官方文档与迁移查询", "开启", "#EAF1FF", "#3568F0"),
        ("FieldQKit", "国内后端发现与筛选", "开启 · 只读", "#E8F8F1", "#15966E"),
        ("Ground State", "VQE + 独立 Validator", "开启 · 本地", "#F2ECFF", "#7C43D9"),
        ("TyxonQ Local", "本地采样与噪声仿真", "接入 · 关闭", "#FFF4E5", "#C57919"),
        ("IBM / IonQ", "云任务与硬件入口", "接入 · 关闭", "#F1F3F7", "#57657A"),
    ]
    for index, (title, body, status, pill_fill, accent) in enumerate(capabilities):
        col = index % 3
        row = index // 3
        left = 38 + col * 335
        top = 918 + row * 174
        box = (left, top, left + 314, top + 152)
        draw_panel(canvas, box, fill="#FFFFFF", outline="#DDE3EE", radius=23, shadow_alpha=8)
        draw = ImageDraw.Draw(canvas)
        draw.ellipse((left + 20, top + 24, left + 38, top + 42), fill=accent)
        draw.text((left + 50, top + 22), title, font=font(23, weight="semibold", latin=True), fill=INK)
        draw.text((left + 20, top + 70), body, font=font(20), fill=MUTED)
        draw_status_pill(draw, (left + 20, top + 105), status, fill=pill_fill, text_fill=accent)

    bottom = (38, 1278, 1042, 1368)
    draw_panel(canvas, bottom, fill="#F7F3FF", outline="#D6C7FF", radius=24, shadow_alpha=5)
    draw = ImageDraw.Draw(canvas)
    draw.text((540, 1322), "加一份 Skill · 接一个 MCP · 科学结论再加 Validator", font=font(25, weight="semibold"), fill="#4B3BB2", anchor="mm")
    draw.text((540, 1352), "开放协议，灵活扩展，共建量子能力生态", font=font(20), fill="#655A91", anchor="mm")
    draw_page_label(draw, 2)
    return canvas


def render_experience_v2(mark: Image.Image) -> Image.Image:
    canvas = make_pastel_canvas((248, 249, 255, 255), (244, 250, 252, 255))
    draw_orbit_decoration(canvas, (930, 120), color=(103, 71, 244, 28))
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 54), "实战体验", font=font(62, weight="semibold"), fill="#111111")
    draw.line((50, 130, 310, 130), fill="#F4B63E", width=8)
    draw.line((220, 137, 418, 137), fill=VIOLET, width=4)
    draw.text((48, 151), "从问题到科学结论，全过程可见可验", font=font(29), fill=INK)

    main_panel = (38, 210, 1042, 936)
    draw_panel(canvas, main_panel, fill="#FFFFFF", outline="#C8D2F3", radius=34, shadow_alpha=18)
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 244), "执行轨迹（Harness）", font=font(25, weight="semibold"), fill=INK)
    draw.text((510, 244), "量子基态任务结果", font=font(25, weight="semibold"), fill=INK)
    draw.line((486, 242, 486, 908), fill="#E5E8F1", width=2)

    track = [
        ("用户输入", "提供二量子位 Hamiltonian"),
        ("Agent 加载 Skill", "判断方法、参数与适用边界"),
        ("调用 MCP / Tool", "运行 VQE，返回结构化事实"),
        ("Validator 重读证据", "独立复核数值与结果文件"),
        ("Acceptance 派生", "16 项检查通过，写回会话轨迹"),
    ]
    line_x = 94
    first_y = 308
    draw.line((line_x, first_y, line_x, 825), fill="#B4C3E8", width=4)
    colors = ["#7C43D9", "#3568F0", "#15966E", "#E28D26", "#2BA66B"]
    for index, ((title, body), accent) in enumerate(zip(track, colors)):
        y = first_y + index * 126
        draw.ellipse((line_x - 10, y - 10, line_x + 10, y + 10), fill=accent)
        draw.ellipse((line_x - 4, y - 4, line_x + 4, y + 4), fill="#FFFFFF")
        draw.text((126, y - 26), title, font=font(23, weight="semibold"), fill=INK)
        draw.text((126, y + 14), body, font=font(19), fill=MUTED)

    metrics = [
        ("VQE 扇区基态能量", "-1.85727503 Ha"),
        ("独立精确参考", "-1.85727503 Ha"),
        ("绝对能量差", "4.44e-16 Ha"),
    ]
    for index, (label, value) in enumerate(metrics):
        top = 292 + index * 104
        draw.rounded_rectangle((510, top, 1008, top + 88), radius=18, fill="#F8FAFD", outline="#E1E6F0", width=2)
        draw.text((534, top + 16), label, font=font(19), fill=MUTED)
        draw.text((984, top + 53), value, font=font(25, weight="semibold"), fill=INK, anchor="rm")

    draw.rounded_rectangle((510, 612, 1008, 674), radius=18, fill="#EAF8EF", outline="#B7E5C7", width=2)
    draw.ellipse((534, 631, 558, 655), fill="#2BA66B")
    draw.line((540, 643, 547, 650, 555, 637), fill="#FFFFFF", width=4)
    draw.text((574, 643), "科学验收通过", font=font(24, weight="semibold"), fill="#187843", anchor="lm")

    checks = ["能量一致性", "态矢归一化", "残差检查", "收敛轨迹检查"]
    for index, label in enumerate(checks):
        col = index % 2
        row = index // 2
        left = 510 + col * 251
        top = 696 + row * 62
        draw.rounded_rectangle((left, top, left + 235, top + 48), radius=16, fill="#F7FBF8", outline="#D5EBDA", width=2)
        draw.text((left + 18, top + 24), f"✓  {label}", font=font(19, weight="semibold"), fill="#257943", anchor="lm")

    source = Image.open(require_file(ROOT / "docs" / "images" / "openquantum-quantum-result.jpg"))
    source_crop = source.crop((300, 350, 1180, 735))
    add_card(
        canvas,
        source_crop,
        (510, 836, 1008, 906),
        radius=14,
        shadow_alpha=5,
        border=(8, 201, 220, 115),
    )
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((822, 852, 990, 890), radius=19, fill="#082B49")
    draw.text((906, 871), "真实运行界面", font=font(17, weight="semibold"), fill="#FFFFFF", anchor="mm")

    support = (38, 966, 1042, 1116)
    draw_panel(canvas, support, fill="#F7F7FF", outline="#D5D8F8", radius=26, shadow_alpha=7)
    draw = ImageDraw.Draw(canvas)
    draw.text((66, 993), "目前已支持", font=font(28, weight="semibold"), fill="#2A4CC9")
    supported = ["Web 工作台", "执行轨迹", "Qiskit 工具", "后端发现（只读）", "本地量子算法", "科学验收"]
    x = 66
    y = 1051
    for index, label in enumerate(supported):
        label_font = font(18, weight="semibold")
        width = int(draw.textlength(label, font=label_font)) + 32
        if x + width > 1010:
            x = 66
            y += 44
        draw.rounded_rectangle((x, y, x + width, y + 34), radius=17, fill="#FFFFFF", outline="#BBC6F3", width=2)
        draw.text((x + 16, y + 17), label, font=label_font, fill="#344A9A", anchor="lm")
        x += width + 12

    draw.text((48, 1160), "开源 · 开放 · 共建", font=font(47, weight="semibold"), fill="#273B9B")
    draw.multiline_text(
        (48, 1220),
        "量子公司、科研团队和工具作者，都可以接入自己的\n硬件、数据与算法，一起建设更好的量子能力生态。",
        font=font(24),
        fill=INK,
        spacing=10,
    )
    cta = (48, 1312, 804, 1374)
    draw.rounded_rectangle(cta, radius=31, fill="#1F2C75")
    draw.text((426, 1343), "github.com/xi-zhao/openQuantum", font=font(25, weight="semibold"), fill="#FFFFFF", anchor="mm")
    draw_page_label(draw, 3)
    return canvas


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


def render_v1(mark: Image.Image) -> None:
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


def render_v2(mark: Image.Image) -> None:
    exports = [
        save_export(render_overview_v2(mark), "openquantum-xhs-01-overview-v2.png"),
        save_export(render_architecture_v2(mark), "openquantum-xhs-02-architecture-v2.png"),
        save_export(render_experience_v2(mark), "openquantum-xhs-03-experience-v2.png"),
    ]
    manifest = {
        "schemaVersion": 1,
        "revision": 2,
        "platform": "Xiaohongshu",
        "canvas": {"width": WIDTH, "height": HEIGHT, "aspectRatio": "3:4"},
        "contentFlow": ["product-overview", "architecture-and-capabilities", "real-run-and-acceptance"],
        "exports": exports,
        "supersedes": [
            "docs/communications/xhs/openquantum-intro/exports/openquantum-xhs-01-cover.png",
            "docs/communications/xhs/openquantum-intro/exports/openquantum-xhs-02-capabilities.png",
            "docs/communications/xhs/openquantum-intro/exports/openquantum-xhs-03-trust.png",
        ],
        "sourceScreenshots": [
            {
                "file": "docs/images/openquantum-quantum-result.jpg",
                "sha256": sha256(ROOT / "docs" / "images" / "openquantum-quantum-result.jpg"),
            }
        ],
        "sourceDocuments": [
            "README.md",
            "docs/architecture/ARCHITECTURE_AUDIT.md",
            "docs/communications/openquantum-wechat-launch.md",
        ],
        "brandSource": "public/openquantum/icon-512.png",
        "rendering": "deterministic-pillow-infographic",
        "provenance": "docs/communications/xhs/openquantum-intro/PROVENANCE-v2.md",
    }
    (ASSET_DIR / "manifest-v2.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--variant",
        choices=("v1", "v2", "all"),
        default="v2",
        help="export the original set, the content-first revision, or both",
    )
    args = parser.parse_args()

    require_file(PINGFANG)
    require_file(ARIAL_BOLD)
    mark = Image.open(require_file(ROOT / "public" / "openquantum" / "icon-512.png")).convert("RGBA")
    if args.variant in {"v1", "all"}:
        render_v1(mark)
    if args.variant in {"v2", "all"}:
        render_v2(mark)


if __name__ == "__main__":
    main()
