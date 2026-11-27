"""The two measured PingFang text advances for the Chinese benchmark plates.

Run with CHROME set on the published reference Mac to regenerate the geometry.
The fixture contains signed-page coordinates only. Neither CI pixels nor fitted
image correspondences are inputs to the generator.
"""
import json
from itertools import groupby, pairwise
from math import ceil, floor
from pathlib import Path

PROFILE = Path(__file__).with_name("keynote-pingfang.json")


def measure(page):
    return page.evaluate("""() => {
        const shot = document.querySelector('#shot'), origin = shot.getBoundingClientRect();
        const walker = document.createTreeWalker(shot, NodeFilter.SHOW_TEXT);
        const glyphs = [], range = document.createRange();
        while (walker.nextNode()) {
            const node = walker.currentNode;
            for (let i = 0; i < node.length; i++) {
                if (!node.data[i].trim()) continue;
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const r = range.getBoundingClientRect();
                glyphs.push([node.data[i], [r.left - origin.left, r.top - origin.top,
                    r.right - origin.left, r.bottom - origin.top].map(v => v * devicePixelRatio)]);
            }
        }
        return glyphs;
    }""")


def widen_pingfang(page):
    page.evaluate(r"""() => {
        const walker = document.createTreeWalker(document.querySelector('#shot'), NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
            const pieces = node.data.split(/([\p{Script=Han}、，。；]+)/u);
            if (pieces.length === 1) continue;
            const tracking = parseFloat(getComputedStyle(node.parentElement).letterSpacing) || 0;
            const fragment = document.createDocumentFragment();
            for (const [i, text] of pieces.entries()) {
                if (i % 2 === 0) fragment.append(text);
                else {
                    const run = document.createElement('cjk-run');
                    run.style.letterSpacing = (tracking + 0.25) + 'px';
                    run.textContent = text;
                    fragment.append(run);
                }
            }
            node.replaceWith(fragment);
        }
    }""")


def linear_spans(points):
    """Keep breakpoints where linear interpolation deviates by over 0.14 device pixels."""
    if len(points) < 3:
        return points
    (x0, y0), (x1, y1) = points[0], points[-1]
    distance, split = max((abs(y - y0 - (x - x0) * (y1 - y0) / (x1 - x0)), i)
                          for i, (x, y) in enumerate(points[1:-1], 1))
    if distance <= 0.14:
        return [points[0], points[-1]]
    return linear_spans(points[:split + 1])[:-1] + linear_spans(points[split:])


def text_strips(original, wider):
    pairs = []
    for (glyph, a), (same_glyph, b) in zip(original, wider, strict=True):
        if glyph != same_glyph or a[1::2] != b[1::2]:
            raise AssertionError("Tracking changed text or line breaks")
        pairs.append((a, b))
    rows = sorted({round(y) for a, _ in pairs for y in a[1::2]})
    strips = []
    for top, bottom in pairwise(rows):
        active = sorted((a, b) for a, b in pairs if round(a[1]) <= top < round(a[3]))
        groups = []
        for a, b in active:
            if not groups or a[0] > groups[-1][-1][0][2] + 32:
                groups.append([])
            groups[-1].append((a, b))
        for group in groups:
            if all(a == b for a, b in group):
                continue
            first, last = group[0], group[-1]
            left = floor(min(first[0][0], first[1][0])) - 4
            right = ceil(max(last[0][2], last[1][2])) + 4
            points = [(left, left), (first[0][0], first[1][0])]
            points.extend(((a[0] + a[2]) / 2, (b[0] + b[2]) / 2) for a, b in group)
            points.extend([(last[0][2], last[1][2]), (right, right)])
            knots = [[round(x, 3), round(y, 3)] for x, y in linear_spans(points)]
            previous = next((s for s in reversed(strips) if s[1] == top and s[2] == knots), None)
            if previous:
                previous[1] = bottom
            else:
                strips.append([top, bottom, knots])
    return strips


def generate():
    import os
    import tempfile
    from playwright.sync_api import sync_playwright
    from keynote_plates import (BENCHMARK_SIGNATURES, PUBLISHED_MACOS, benchmark_signature,
                                keynote, number_regions, reference_mismatches)

    mismatches, macos = reference_mismatches()
    if mismatches or macos != PUBLISHED_MACOS:
        raise RuntimeError("Regenerate geometry on the published macOS reference")
    names = ["benchmarks-zh-light", "benchmarks-zh-dark"]
    plates = keynote.keynote_plates()
    layouts = []
    with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ["CHROME"], args=["--allow-file-access-from-files"])
        page = browser.new_page(viewport={"width": 1200, "height": 1200}, device_scale_factor=2)
        for name in names:
            published = (keynote.OUT / (name + ".webp")).read_bytes()
            if benchmark_signature(plates[name], published) != BENCHMARK_SIGNATURES[name]:
                raise AssertionError(f"Published inputs changed for {name}")
            src = Path(directory) / (name + ".html")
            src.write_text(plates[name], encoding="utf-8")
            page.goto(src.as_uri(), wait_until="load")
            page.evaluate("async () => { await document.fonts.ready; await document.images[0].decode(); }")
            original = measure(page)
            widen_pingfang(page)
            strips = text_strips(original, measure(page))
            regions = number_regions(page, page.content())
            han = []
            for text, boxes in regions["han"]:
                glyphs = zip(text, boxes, strict=True)
                for (top, bottom), line in groupby(glyphs, key=lambda entry: entry[1][1::2]):
                    chars, bounds = zip(*line)
                    han.append(["".join(chars), top, bottom, [[box[0], box[2]] for box in bounds]])
            layouts.append((strips, regions["plate"], han))
        browser.close()
    if layouts[0] != layouts[1]:
        raise AssertionError("Chinese themes must share geometry")
    strips, numbers, han = layouts[0]
    fields = ['"canvas": [1800, 1298]', '"signatures": ' + json.dumps([BENCHMARK_SIGNATURES[n] for n in names])]
    for key, rows in (("strips", strips), ("numbers", numbers), ("han", han)):
        fields.append(f'"{key}": [\n    ' + ",\n    ".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n  ]")
    PROFILE.write_text("{\n  " + ",\n  ".join(fields) + "\n}\n", encoding="utf-8")


if __name__ == "__main__":
    generate()
