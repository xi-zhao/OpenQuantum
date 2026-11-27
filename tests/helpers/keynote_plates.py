"""Check the published plates against the renderer, evidence and reader-facing index."""
import asyncio
import hashlib
import importlib.util
from importlib.metadata import version
from io import BytesIO
from itertools import pairwise
import json
from math import ceil
import os
from pathlib import Path
import platform
import re
import shutil
from statistics import correlation
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit
from urllib.request import url2pathname

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("keynote", ROOT / "scripts/render-readme-keynote.py")
keynote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(keynote)
EVIDENCE = (
    "docs/examples/quantum-ground-state-local-demo-2026-09-12.json",
    "experiments/qutip-rust-wigner/results/summary.json",
    "experiments/pennylane-rust-commutator/results/benchmark.json",
    "experiments/pennylane-rust-commutator/results/validation.json",
)
# Each signature pairs path-independent HTML and its local fonts/figure with the
# corresponding published WebP. The reference render also compares actual RGBA.
BENCHMARK_SIGNATURES = {
    "benchmarks-zh-light": "ec27b5cc9387c7895aea820db558abec9fba749dc57057be264938c48c72c9ee",
    "benchmarks-zh-dark": "e59acb621ff8abb37a7d0a419d2c6b19bc3483dd26a448a8263820244f9f209c",
    "benchmarks-en-light": "09fbe50ce1eba7c35854378c57ba3661c69abe1a7663fe82932d2ccfe6ecd513",
    "benchmarks-en-dark": "f57dd69e2e75dfcc6d88d344d255dcbc746fc9c1a2803439c9748d0915a214cd",
}

# Both exact browser builds reproduced the published RGBA. The signatures above
# pin the two bundled webfonts. PingFang SC supplies the reference Chinese glyphs.
REFERENCE_CHROMIUM = ("149.0.7827.55", "158.0.8127.88")
REFERENCE_FONT = "PingFangSC-Regular"
PUBLISHED_MACOS = ("27.2.1", "26B131")
# Real font-smoothing controls stay above 0.94. The shared small-digit faults score below 0.68.
MIN_GLYPH_CORRELATION = 0.88


def reference_mismatches():
    from PIL import features
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ["CHROME"], args=["--no-sandbox", "--force-color-profile=srgb"])
        chromium = browser.version
        has_font = sys.platform == "darwin" and browser.new_page().evaluate(
            """name => new FontFace('reference', 'local("' + name + '")').load().then(() => true, () => false)""",
            REFERENCE_FONT,
        )
        browser.close()
    checks = [
        ("platform", sys.platform, ("darwin",)),
        ("Chromium", chromium, REFERENCE_CHROMIUM),
        ("Pillow", version("Pillow"), ("11.3.0",)),
        ("libwebp", features.version("webp"), ("1.5.0",)),
        ("Playwright", version("playwright"), ("1.57.0",)),
        ("system font", REFERENCE_FONT if has_font else "unavailable", (REFERENCE_FONT,)),
    ]
    macos = None
    if sys.platform == "darwin":
        build = subprocess.check_output(["sw_vers", "-buildVersion"], text=True).strip()
        macos = (platform.mac_ver()[0], build)
    print("Renderer environment: " + ", ".join(f"{name}={actual}" for name, actual, _ in checks)
          + f", OS={macos or platform.system()}, machine={platform.machine()}, color=sRGB")
    return ([f"{name}={actual} (expected {' or '.join(expected)})"
             for name, actual, expected in checks if actual not in expected], macos)


def benchmark_signature(markup, webp):
    def local_asset(match):
        asset = Path(url2pathname(urlsplit(match[0]).path))
        return f"{asset.relative_to(ROOT).as_posix()}#{hashlib.sha256(asset.read_bytes()).hexdigest()}"
    portable = re.sub(r"""file:[^"'()]+""", local_asset, markup)
    return hashlib.sha256(portable.encode() + b"\0" + webp).hexdigest()


def glyph_fonts(session, selector):
    doc = session.send("DOM.getDocument")["root"]["nodeId"]
    nodes = session.send("DOM.querySelectorAll", {"nodeId": doc, "selector": selector})["nodeIds"]
    return sorted({font["postScriptName"] for node in nodes
                   for font in session.send("CSS.getPlatformFontsForNode", {"nodeId": node})["fonts"] if font["glyphCount"]})


def number_regions(page, markup):
    """Measure the signed layout afresh, independently of what either screenshot painted."""
    page.set_content(markup, wait_until="load")
    source = page.locator(".fig-wrap img").get_attribute("src")
    figure = Path(url2pathname(urlsplit(source).path)).read_text(encoding="utf-8")
    return page.evaluate(r"""async figure => {
        await document.fonts.ready;
        const shot = document.querySelector('#shot'), image = shot.querySelector('.fig-wrap img');
        await image.decode();
        const origin = shot.getBoundingClientRect(), scale = devicePixelRatio;
        function runs(root, pattern = /[+−-]?\d+(?:[,.]\d+)*(?:[eE×][+−-]?\d+)*×?/g) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const range = document.createRange(), result = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (root instanceof SVGElement && !node.parentElement.closest('text')) continue;
                for (const match of node.data.matchAll(pattern)) {
                    const boxes = [];
                    for (let i = 0; i < match[0].length; i++) {
                        range.setStart(node, match.index + i);
                        range.setEnd(node, match.index + i + 1);
                        const r = range.getBoundingClientRect();
                        boxes.push([r.left - origin.left, r.top - origin.top, r.right - origin.left,
                                    r.bottom - origin.top].map(v => Math.round(v * scale)));
                    }
                    result.push([match[0], boxes]);
                }
            }
            return result;
        }
        const plate = runs(shot), r = image.getBoundingClientRect();
        // Give the signed SVG text the same viewport as the embedded image.
        const svg = new DOMParser().parseFromString(figure, 'image/svg+xml').documentElement;
        Object.assign(svg.style, {position: 'fixed', visibility: 'hidden', left: r.left + 'px',
            top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
        document.body.append(svg);
        const labels = runs(svg);
        svg.remove();
        const barCenters = [...shot.querySelectorAll('.fill-opt')].map(bar => {
            const r = bar.getBoundingClientRect();
            return [Math.floor((r.left + r.width / 2 - origin.left) * scale),
                    Math.floor((r.top + r.height / 2 - origin.top) * scale)];
        });
        return {plate, figure: labels, barCenters, han: runs(shot, /[\p{Script=Han}、，。；]+/gu)};
    }""", figure)


def reference_rasters(plates, directory, *, inspect_fonts=False, regions=None, prepare=None):
    """Capture signed inputs independently of the exporter's viewport, scale and encoding code."""
    from PIL import Image
    from playwright.sync_api import sync_playwright

    captures = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ["CHROME"],
                                    args=["--no-sandbox", "--allow-file-access-from-files", "--force-color-profile=srgb"])
        page = browser.new_page(viewport={"width": 1200, "height": 1200}, device_scale_factor=2, reduced_motion="reduce")
        if inspect_fonts:
            session = page.context.new_cdp_session(page)
            session.send("DOM.enable")
            session.send("CSS.enable")
        for name, markup in plates.items():
            src = directory / f"{name}.html"
            src.write_text(markup, encoding="utf-8")
            page.goto(src.as_uri(), wait_until="networkidle")
            page.evaluate("async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); }")
            if page.evaluate("devicePixelRatio") != 2:
                raise AssertionError("Reference capture requires two device pixels per CSS pixel")
            if prepare is not None:
                prepare(page)
            if inspect_fonts and name.endswith("light"):
                fonts = glyph_fonts(session, "#shot *")
                print(f"{name}: fonts painting glyphs: {', '.join(fonts)}")
                required = ["Inter-", "JetBrainsMono-"] + (["PingFangSC-"] if "-zh-" in name else [])
                if any(not any(font.startswith(prefix) for font in fonts) for prefix in required) or "LastResort" in fonts:
                    raise AssertionError(f"Missing benchmark glyph font: {fonts}")
            png = page.locator("#shot").screenshot(omit_background=True, scale="device")
            webp = BytesIO()
            with Image.open(BytesIO(png)) as image:
                image.save(webp, "WEBP", quality=92, method=6)
            captures[name] = Image.open(webp).convert("RGBA")
            if regions is not None:
                regions[name] = number_regions(page, markup)
        if inspect_fonts:
            page.goto(page.locator(".fig-wrap img").get_attribute("src"))
            fonts = glyph_fonts(session, "svg text")
            print(f"Wigner SVG: fonts painting glyphs: {', '.join(fonts)}")
            if not fonts or "LastResort" in fonts:
                raise AssertionError("Missing Wigner figure label font")
        browser.close()
    return captures


def glyph_ink(reference, actual, runs, source, kind):
    """Compare every glyph against its signed box, allowing local raster alignment."""
    width, height = reference.size
    worst = 1.0
    if not runs:
        raise AssertionError(f"No glyph regions for {source}")
    for token, boxes in runs:
        for glyph, (left, top, right, bottom) in zip(token, boxes, strict=True):
            if not (0 <= left < right <= width and 0 <= top < bottom <= height):
                raise AssertionError(f"Invalid {source} region for {token!r}: {(left, top, right, bottom)}")
            ink = reference.crop((left, top, right, bottom)).tobytes()
            contrast = max(ink) - min(ink)
            if not contrast:
                raise AssertionError(f"Empty reference glyph {glyph!r} in {source} {token!r}")

            def score(dx, dy):
                sample = actual.crop((left + dx, top + dy, right + dx, bottom + dy)).tobytes()
                if max(sample) - min(sample) < contrast / 2:
                    return 0.0
                return correlation(ink, sample)

            best = score(0, 0)
            if best < MIN_GLYPH_CORRELATION:
                best = max(score(dx, dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
            if best < MIN_GLYPH_CORRELATION:
                raise AssertionError(f"{kind} glyph {glyph!r} in {source} {token!r} at "
                                     f"{(left, top, right, bottom)}: correlation {best:.4f} < {MIN_GLYPH_CORRELATION}")
            worst = min(worst, best)
    return worst


def numeric_ink(reference, actual, regions):
    return min(glyph_ink(reference, actual, regions[key], key + " number", "Numeric") for key in ("plate", "figure"))


def chinese_ink(reference, actual, runs):
    from PIL import ImageFilter
    # A low-contrast footer character can disappear within the frame-wide
    # stroke bound. Test the contour of each glyph on a subpixel blur.
    contour = ImageFilter.GaussianBlur(0.75)
    return glyph_ink(reference.filter(contour), actual.filter(contour), runs, "text", "Chinese")


def check_canvas(reference, actual):
    if reference.size != actual.size or reference.getchannel("A").tobytes() != actual.getchannel("A").tobytes():
        raise AssertionError("Reference canvas or alpha silhouette differs")


def bounded_pixels(published, actual, regions):
    """Bound both whole-frame error and concentrated damage to a single area."""
    from PIL import ImageChops, ImageFilter

    def channel_error(a, b):
        red, green, blue = ImageChops.difference(a, b).split()
        return ImageChops.lighter(red, ImageChops.lighter(green, blue))

    def outside_neighborhood(a, b):
        high = ImageChops.subtract(a, b.filter(ImageFilter.MaxFilter(5)))
        low = ImageChops.subtract(b.filter(ImageFilter.MinFilter(5)), a)
        return ImageChops.lighter(high, low)

    check_canvas(published, actual)
    a, b = published.convert("RGB"), actual.convert("RGB")
    histogram = channel_error(a, b).histogram()
    count = a.width * a.height
    mean = sum(error * n for error, n in enumerate(histogram)) / count
    fraction = sum(histogram[17:]) / count
    blur = ImageFilter.GaussianBlur(2)
    local = channel_error(a.filter(blur), b.filter(blur)).reduce(32).getextrema()[1]
    # A single missing glyph can disappear in a frame average. Search at most two
    # device pixels in both directions for its ink, then bound even a 3x3 patch.
    gray_a, gray_b = a.convert("L"), b.convert("L")
    ink = ImageChops.lighter(outside_neighborhood(gray_a, gray_b), outside_neighborhood(gray_b, gray_a))
    stroke = ink.reduce(3).getextrema()[1]
    metrics = (f"mean max-channel error={mean:.4f}/255, pixels over 16={fraction:.3%}, "
               f"worst 32px low-pass tile={local}/255, worst 3px ink residual={stroke}/255")
    # Calibration includes changing the real Chromium font smoothing mode on all four plates.
    if mean > 1.5 or fraction > 0.02 or local > 30 or stroke > 64:
        raise AssertionError(f"Published visual bounds exceeded: {metrics}")
    worst = numeric_ink(gray_a, gray_b, regions)
    metrics += f", lowest numeric glyph correlation={worst:.4f}"
    if regions.get("han"):
        han = chinese_ink(gray_a, gray_b, regions["han"])
        metrics += f", lowest Chinese glyph correlation={han:.4f}"
    return metrics


def wider_pingfang_reference(published, signature, regions):
    """Move only the published text strips to the second measured PingFang advance."""
    from PIL import Image

    profile = json.loads(Path(__file__).with_name("keynote-pingfang.json").read_text(encoding="utf-8"))
    if list(published.size) != profile["canvas"] or signature not in profile["signatures"]:
        raise AssertionError("PingFang layout does not describe this signed reference")
    if [t for t, _ in profile["numbers"]] != [t for t, _ in regions["plate"]]:
        raise AssertionError("PingFang layout has different scientific values")
    han = [(text, [(left, top, right, bottom) for left, right in spans])
           for text, top, bottom, spans in profile["han"]]
    if "".join(t for t, _ in han) != "".join(t for t, _ in regions["han"]):
        raise AssertionError("PingFang layout has different Chinese text")
    result = published.copy()
    for top, bottom, points in profile["strips"]:
        for (ref_x, wide_x), (ref_end, wide_end) in pairwise(points):
            left, right = ceil(wide_x), ceil(wide_end)
            if left == right:
                continue
            scale = (ref_end - ref_x) / (wide_end - wide_x)
            source = (ref_x + (left - wide_x) * scale, top, ref_x + (right - wide_x) * scale, bottom)
            band = published.transform((right - left, bottom - top), Image.Transform.EXTENT, source,
                                       resample=Image.Resampling.BILINEAR)
            result.paste(band, (left, top))
    return result, {**regions, "plate": profile["numbers"], "han": han}


def check_bar_colors(published, actual, centers):
    from PIL import ImageStat

    if len(centers) != 2:
        raise AssertionError("Expected both optimized benchmark bars")
    for x, y in centers:
        center = (x - 1, y - 1, x + 2, y + 2)
        a, b = (ImageStat.Stat(image.crop(center)).median for image in (published, actual))
        if max(abs(u - v) for u, v in zip(a, b)) > 2:
            raise AssertionError(f"Benchmark bar color differs at {(x, y)}: {a} vs {b}")


def check_pixels(published, actual, control, regions, *, native, plate=None):
    if actual.size != control.size or actual.tobytes() != control.tobytes():
        raise AssertionError("Export differs from the independent 2x sRGB capture on this host")
    if published.size == actual.size and published.tobytes() == actual.tobytes():
        return "published RGBA identical"
    if native:
        raise AssertionError("Published RGBA differs on its original macOS build")
    if plate:
        if "-zh-" in plate and sum(len(t) for t, _ in regions["han"]) != 159:
            raise AssertionError("Expected 159 Chinese characters and full-width punctuation marks")
        check_canvas(published, actual)
        check_bar_colors(published, actual, regions["barCenters"])
    try:
        return bounded_pixels(published, actual, regions)
    except AssertionError as original:
        if plate not in ("benchmarks-zh-light", "benchmarks-zh-dark"):
            raise
        reference, wide_regions = wider_pingfang_reference(published, BENCHMARK_SIGNATURES[plate], regions)
        try:
            return "PingFang +0.25 CSS px: " + bounded_pixels(reference, actual, wide_regions)
        except AssertionError as wider:
            raise AssertionError(f"Published layout: {original}. Wider PingFang layout: {wider}") from wider


class Keynote(unittest.TestCase):
    def test_evidence(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(keynote, "ROOT", Path(directory)):
            for name in EVIDENCE:
                dest = Path(directory) / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, dest)
            for name in EVIDENCE:
                dest = Path(directory) / name
                raw = dest.read_bytes()
                with self.subTest(file=name, case="missing"):
                    dest.unlink()
                    with self.assertRaisesRegex(ValueError, "Missing frozen evidence: " + re.escape(name)):
                        keynote.keynote_plates()
                with self.subTest(file=name, case="digest"):
                    dest.write_bytes(raw + b"\n")
                    with self.assertRaisesRegex(ValueError, "Frozen evidence changed: " + re.escape(name)):
                        keynote.keynote_plates()
                dest.write_bytes(raw)

        read = keynote.frozen_json

        def altered(name, digest):
            data = read(name, digest)
            if name == EVIDENCE[0]:
                data["output"]["result"].update(energyHartree=-2.12345678, absoluteErrorHartree=3.21e-7)
            elif name == EVIDENCE[1]:
                data["max_default_error"] = 4.56e-8
            elif name == EVIDENCE[2]:
                case = next(c for c in data["cases"] if c["id"] == "local-32q-pool512")
                case.update(actual_left_terms=131, actual_right_terms=641)
                case["timings"]["pennylane"]["median_seconds"] = .03912
                case["timings"]["rust_end_to_end"]["median_seconds"] = .00714
            elif name == EVIDENCE[3]:
                data["worst_independent_matrix_error"] = 7.89e-11
            return data

        originals = keynote.keynote_plates()
        with patch.object(keynote, "frozen_json", side_effect=altered):
            changed = keynote.keynote_plates()
        for lang in ("en", "zh"):
            for theme in ("light", "dark"):
                with self.subTest(language=lang, theme=theme):
                    workflow = changed[f"workflow-{lang}-{theme}"]
                    self.assertIn("-2.12345678<span", workflow)
                    self.assertIn("3.21×10<sup>−7</sup>", workflow)
                    name = f"benchmarks-{lang}-{theme}"
                    scope = ("One commutator [H, A] · {}-term H and one {}-term operator sum A"
                             if lang == "en" else "一次对易子 [H, A] · {} 项 H 与一个 {} 项算符和 A")
                    self.assertIn(scope.format(125, 512), originals[name])
                    self.assertIn(scope.format(131, 641), changed[name])
                    for text in ("4.56×10<sup>−8</sup>", "7.89×10<sup>−11</sup>", "39.12 ms", "7.14 ms", "5.48×"):
                        self.assertIn(text, changed[name])

    def inspect_webp(self, raw):
        self.assertEqual((raw[:4], raw[8:12]), (b"RIFF", b"WEBP"))
        self.assertEqual(int.from_bytes(raw[4:8], "little") + 8, len(raw))
        offset = 12
        chunks = {}
        while offset < len(raw):
            kind = raw[offset:offset + 4]
            length = int.from_bytes(raw[offset + 4:offset + 8], "little")
            self.assertIn(kind, (b"VP8X", b"ALPH", b"VP8 "), f"Unexpected WebP chunk {kind!r}")
            self.assertNotIn(kind, chunks, f"Duplicate WebP chunk {kind!r}")
            self.assertLessEqual(offset + 8 + length, len(raw))
            chunks[kind] = raw[offset + 8:offset + 8 + length]
            offset += 8 + length + length % 2
        self.assertEqual(offset, len(raw))
        # Current static, alpha-bearing lossy WebPs have both canvas and frame dimensions.
        canvas, frame = chunks[b"VP8X"], chunks[b"VP8 "]
        self.assertEqual(canvas[0] & 0x2e, 0)  # ICC, EXIF, XMP and animation flags.
        size = tuple(int.from_bytes(canvas[i:i+3], "little") + 1 for i in (4, 7))
        self.assertEqual(frame[3:6], b"\x9d\x01\x2a")
        self.assertEqual(size, tuple(int.from_bytes(frame[i:i+2], "little") & 0x3fff for i in (6, 8)))
        return size

    def validated_render(self, file, expected, diagnostics):
        from PIL import Image

        target = Path(diagnostics) / file.name if diagnostics else None
        if target:
            target.unlink(missing_ok=True)
        raw = file.read_bytes()
        self.assertEqual(self.inspect_webp(raw), expected, f"{file.name} render dimensions")
        with Image.open(BytesIO(raw)) as image:
            image.load()
            self.assertEqual((image.format, image.size), ("WEBP", expected))
            self.assertFalse({"exif", "xmp", "icc_profile"}.intersection(image.info))
            pixels = image.convert("RGBA")
        if target:
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(dir=target.parent) as tmp:
                staged = Path(tmp) / "validated"
                staged.write_bytes(raw)
                staged.replace(target)
        return pixels

    def test_inventory(self):
        images = ROOT / "docs/images"
        index = (images / "README.md").read_text(encoding="utf-8")
        sections = re.split(r"^## ", index, flags=re.M)
        current = next(s for s in sections if s.startswith("当前 README"))
        banners = next(s for s in sections if s.startswith("历史素材"))
        shots = next(s for s in sections if s.startswith("历史截图"))
        legacy = {"banner.webp", "banner-motion.webp", "banner-en.svg", "case-qutip.webp", "case-pennylane.webp"}
        links = r"\]\(readme/([^()]+)\)"
        self.assertEqual(set(re.findall(links, banners)), legacy)
        for shot in ("openquantum-desktop-20261013.jpg", "openquantum-settings-categories-20261013.jpg"):
            self.assertIn(f"]({shot})", shots)
            self.assertNotIn(shot, current)
        expected = {}
        english = set()
        for lang in ("zh", "en"):
            for theme in ("light", "dark"):
                for kind, height in (("hero", 840), ("launch-card", 368), ("workflow", 1038 if lang == "zh" else 1018),
                                     ("benchmarks", 1298 if lang == "zh" else 1282)):
                    language = "" if (kind, lang) == ("launch-card", "zh") else "-" + lang
                    name = f"{kind}{language}-{theme}.webp"
                    expected[name] = (1800, height)
                    if lang == "en":
                        english.add(name)
        self.assertCountEqual(re.findall(links, current), expected.keys())
        self.assertEqual({file.name for file in keynote.OUT.iterdir() if file.is_file()}, set(expected) | legacy)
        self.assertEqual({name + ".webp" for name in keynote.keynote_plates()}, set(expected))
        for line in current.splitlines():
            files = re.findall(links, line)
            if not files:
                continue
            dimensions = [tuple(map(int, pair)) for pair in re.findall(r"(\d+)\s*×\s*(\d+)", line)]
            self.assertEqual(len(files), 4)
            self.assertEqual(len(dimensions), 1 if expected[files[0]] == expected[files[-1]] else 2)
            for index, file in enumerate(files):
                with self.subTest(file=file):
                    self.assertEqual(expected[file], dimensions[-1 if index >= 2 else 0])
                    self.assertEqual(self.inspect_webp((keynote.OUT / file).read_bytes()), expected[file])
        readmes = [ROOT / "README.md", *sorted((ROOT / "docs/readme").glob("README.*.md"))]
        self.assertEqual(len(readmes), 10)
        for file in readmes:
            with self.subTest(readme=file.name):
                text = file.read_text(encoding="utf-8")
                refs = set(re.findall(r"""(?:^|/)readme/([^\s/()"'<>]+\.(?:webp|svg))""", text))
                local = set(expected) - english if file.name == "README.md" else english
                self.assertTrue(refs <= local, refs - local)
                for archived in legacy:
                    self.assertNotIn(archived, text)
                required = local if file.name in ("README.md", "README.en.md") else {f for f in local if f.startswith(("hero-", "launch-card-"))}
                self.assertTrue(required <= refs, required - refs)

    def test_signatures(self):
        plates = keynote.keynote_plates()
        for name, expected in BENCHMARK_SIGNATURES.items():
            with self.subTest(plate=name):
                self.assertEqual(benchmark_signature(plates[name], (keynote.OUT / (name + ".webp")).read_bytes()), expected)

    def test_render(self):
        from PIL import Image
        mismatches, macos = reference_mismatches()
        markup = keynote.keynote_plates()
        plates = {name: markup[name] for name in BENCHMARK_SIGNATURES}
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            asyncio.run(keynote.render_plates(plates, dest))
            diagnostics = os.environ.get("OPENQUANTUM_KEYNOTE_DIAGNOSTICS")
            rasters = {}
            for name, signature in BENCHMARK_SIGNATURES.items():
                with self.subTest(plate=name):
                    published = keynote.OUT / (name + ".webp")
                    raw = published.read_bytes()
                    self.assertEqual(benchmark_signature(plates[name], raw), signature, name)
                    pixels = self.validated_render(dest / published.name, self.inspect_webp(raw), diagnostics)
                    rasters[name] = pixels
                    print(f"{name}: decoded {pixels.width}×{pixels.height} WebP, no EXIF/XMP/ICC")
            if rasters and not mismatches:
                regions = {}
                controls = reference_rasters({name: plates[name] for name in rasters}, dest, inspect_fonts=True, regions=regions)
                for name, actual in rasters.items():
                    with self.subTest(plate=name):
                        published = keynote.OUT / (name + ".webp")
                        with Image.open(published) as reference:
                            result = check_pixels(reference.convert("RGBA"), actual, controls[name], regions[name],
                                                  native=macos == PUBLISHED_MACOS, plate=name)
                        same = published.read_bytes() == (dest / published.name).read_bytes()
                        print(f"{name}: independent RGBA identical, {result}, WebP bytes {'identical' if same else 'differ'}")
                if "benchmarks-zh-light" in rasters:
                    self.check_pingfang_controls(dest, plates["benchmarks-zh-light"], regions["benchmarks-zh-light"])
        if mismatches:
            reason = "Keynote reference environment mismatch: " + ", ".join(mismatches)
            print("Exact RGBA parity is scoped to the pinned macOS reference. " + reason)
            if os.environ.get("OPENQUANTUM_REQUIRE_KEYNOTE_PIXEL_MATCH") == "1":
                self.fail(reason)

    def check_pingfang_controls(self, directory, markup, regions):
        """Render shared faults at the wider Chinese advance, independently of the pixel mapping."""
        from keynote_pingfang import widen_pingfang
        from PIL import Image, ImageChops

        name = "benchmarks-zh-light"
        with Image.open(keynote.OUT / (name + ".webp")) as image:
            published = image.convert("RGBA")
        reference, wide_regions = wider_pingfang_reference(published, BENCHMARK_SIGNATURES[name], regions)
        # The signed scientific value starts after nine Han characters. On the
        # original Mac, add the measured advance in CSS. macOS 15 already has it.
        def first_digit(runs):
            return dict(runs["plate"])["6.52×10"][0][0]

        prepare = widen_pingfang if abs(first_digit(regions) - first_digit(wide_regions)) > 1 else None
        edits = {
            "missing-han": ("Wigner 函数", "Wigner 函", "visual bounds exceeded"),
            "missing-footer-ink": ("与编译；", '与<span style="opacity:0">编</span>译；', "Wider PingFang layout"),
            "speedup": ("5.69×", "5.68×", "visual bounds exceeded"),
            "exponent": ("−16</sup>", "−18</sup>", "Numeric glyph .*'−16'"),
            "mantissa": ("6.52×10", "6.53×10", "Numeric glyph .*'6.52×10'"),
            "check-count": ("272 项", "273 项", "Numeric glyph .*'272'"),
            "bar-color": ("#0E7490", "#107890", "Benchmark bar color differs"),
        }
        pages = {"wider": markup}
        for label, (before, after, _) in edits.items():
            self.assertIn(before, markup)
            pages[label] = markup.replace(before, after)
        frames = reference_rasters(pages, directory, prepare=prepare)
        wide = frames.pop("wider")
        result = check_pixels(published, wide, wide, regions, native=False, plate=name)
        self.assertIn("PingFang +0.25 CSS px", result)
        print(f"Wider Chinese Chromium control: {result}")
        # Some hosts also reject this omission at the earlier global stroke
        # check. Exercise the local glyph check independently on the same frame.
        with self.assertRaisesRegex(AssertionError, "Chinese glyph '编'") as missing:
            chinese_ink(reference.convert("L"), frames["missing-footer-ink"].convert("L"), wide_regions["han"])
        print(f"Footer glyph control: {missing.exception}")
        frames["one-device-pixel-shift"] = ImageChops.offset(wide, 1, 0)
        shifted_inside = frames["one-device-pixel-shift"].copy()
        shifted_inside.putalpha(wide.getchannel("A"))
        frames["one-pixel-inside-fixed-canvas"] = shifted_inside
        half = wide.resize((wide.width // 2, wide.height // 2), Image.Resampling.LANCZOS)
        frames["upscaled-1x"] = half.resize(wide.size, Image.Resampling.LANCZOS)
        reasons = {label: reason for label, (_, _, reason) in edits.items()}
        reasons["one-device-pixel-shift"] = "alpha silhouette differs"
        reasons["one-pixel-inside-fixed-canvas"] = "visual bounds exceeded"
        reasons["upscaled-1x"] = "alpha silhouette differs"
        for label, frame in frames.items():
            with self.subTest(wider_shared_fault=label):
                with self.assertRaisesRegex(AssertionError, reasons[label]) as failure:
                    check_pixels(published, frame, frame, regions, native=False, plate=name)
                print(f"Wider Chinese {label} rejected: {failure.exception}")

    def test_visual_controls(self):
        from PIL import Image, ImageFilter, ImageOps

        name = "benchmarks-zh-light"
        markup = keynote.keynote_plates()[name]
        published = keynote.OUT / (name + ".webp")
        golden = Image.open(published).convert("RGBA")
        regions = {}
        with tempfile.TemporaryDirectory() as directory:
            control = reference_rasters({name: markup}, Path(directory), regions=regions)[name]
        glyphs = regions[name]
        # Exercise the cross-build branch on every host, including the authoring Mac.
        drift = control.filter(ImageFilter.GaussianBlur(0.3))
        drift.putalpha(control.getchannel("A"))
        self.assertNotEqual(drift.tobytes(), control.tobytes())
        self.assertIn("low-pass", check_pixels(control, drift, drift, glyphs, native=False))
        with self.assertRaisesRegex(AssertionError, "original macOS"):
            check_pixels(control, drift, drift, glyphs, native=True)
        wrong_theme = ImageOps.invert(golden.convert("RGB")).convert("RGBA")
        wrong_theme.putalpha(golden.getchannel("A"))
        missing_number = golden.copy()
        missing_number.paste("white", (110, 225, 430, 330))
        for change, damaged in [("theme", wrong_theme), ("missing numeric region", missing_number)]:
            with self.subTest(change=change):
                with self.assertRaisesRegex(AssertionError, "visual bounds exceeded"):
                    check_pixels(golden, damaged, damaged, glyphs, native=False)

        altered = {
            "number": markup.replace("5.69×", "5.68×"),
            "missing-glyph": markup.replace("Wigner 函数", "Wigner 函"),
            "position": markup.replace("</style>", ".hero-x strong { transform: translateX(1px); }</style>"),
            "color": markup.replace("#0E7490", "#107890"),
        }
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            for chunk in [b"XMP ", b"EXIF", b"ICCP", b"NOTE"]:
                with self.subTest(metadata=chunk):
                    data = published.read_bytes() + chunk + b"\x04\0\0\0test"
                    sample = dest / "metadata.webp"
                    sample.write_bytes(data[:4] + (len(data) - 8).to_bytes(4, "little") + data[8:])
                    with self.assertRaisesRegex(AssertionError, "Unexpected WebP chunk"):
                        self.inspect_webp(sample.read_bytes())
            asyncio.run(keynote.render_plates(altered, dest))
            for change, text in altered.items():
                with self.subTest(change=change):
                    self.assertNotEqual(benchmark_signature(text, published.read_bytes()), BENCHMARK_SIGNATURES[name])
                    altered_pixels = Image.open(dest / f"{change}.webp").convert("RGBA")
                    with self.assertRaisesRegex(AssertionError, "independent 2x"):
                        check_pixels(golden, altered_pixels, control, glyphs, native=False)
                    if change in ("number", "missing-glyph"):
                        with self.assertRaisesRegex(AssertionError, "visual bounds exceeded"):
                            bounded_pixels(control, altered_pixels, glyphs)
            with patch.object(keynote, "SCALE", 1):
                asyncio.run(keynote.render_plates({name: markup}, dest))
            small = Image.open(dest / published.name).convert("RGBA")
            self.assertEqual(small.size, (900, 649))
            for candidate in [small, small.resize(control.size, Image.Resampling.LANCZOS)]:
                with self.assertRaisesRegex(AssertionError, "independent 2x"):
                    check_pixels(golden, candidate, control, glyphs, native=False)

    def test_numeric_controls(self):
        from PIL import Image
        from playwright.async_api import Page as AsyncPage
        from playwright.sync_api import Page as SyncPage
        from xml.etree import ElementTree

        markup = keynote.keynote_plates()
        plates = {name: markup[name] for name in BENCHMARK_SIGNATURES}
        light = "benchmarks-en-light"
        faults = {
            "exponent": (".checks sup", "−16", "−18"),
            "mantissa": (".checks b.mono", "6.52×10", "6.53×10"),
            "check-count": (".checks b:not(.mono)", "272", "273"),
        }
        # Both browsers load the original signed bytes. Inject the same display
        # fault after navigation, just as a shared renderer defect would do.
        substitute = """([selector, before, after]) => {
            const node = document.querySelector(selector).firstChild;
            if (node.data !== before) throw new Error('Expected ' + before);
            node.data = after;
        }"""
        sync_goto, async_goto = SyncPage.goto, AsyncPage.goto

        def reference_visit(page, url, **options):
            response = sync_goto(page, url, **options)
            fault = faults.get(Path(urlsplit(url).path).stem)
            if fault:
                page.evaluate(substitute, fault)
            return response

        async def export_visit(page, url, **options):
            response = await async_goto(page, url, **options)
            fault = faults.get(Path(urlsplit(url).path).stem)
            if fault:
                await page.evaluate(substitute, fault)
            return response

        smooth = {name: html.replace("</style>", "*{-webkit-font-smoothing:auto!important}</style>")
                  for name, html in plates.items()}
        plate_values = ("64 201×201 4 5.69× 171.77 30.18 6.52×10 −16 272 5.09× 125 512 32 4 "
                        "30.62 6.02 9 4,368 40 1.42×10 −14 9").split()
        figure = ElementTree.parse(keynote.SITE_ASSETS / "wigner-comparison.svg")
        figure_values = [number for node in figure.iter("{http://www.w3.org/2000/svg}text")
                         for number in re.findall(r"[−-]?\d+(?:\.\d+)?(?:e[−-]?\d+)?", "".join(node.itertext()))]
        with tempfile.TemporaryDirectory() as directory:
            dest, regions = Path(directory), {}
            originals = reference_rasters(plates, dest, regions=regions)
            shared_inputs = dict.fromkeys(faults, plates[light])
            with patch.object(SyncPage, "goto", reference_visit), patch.object(AsyncPage, "goto", export_visit):
                same_faults = reference_rasters(shared_inputs, dest)
                asyncio.run(keynote.render_plates({**smooth, **shared_inputs}, dest))
            for name in plates:
                with self.subTest(smoothing=name):
                    runs = regions[name]
                    self.assertEqual([s for s, _ in runs["plate"]], plate_values)
                    self.assertEqual([s for s, _ in runs["figure"]], figure_values)
                    with Image.open(dest / (name + ".webp")) as image:
                        candidate = image.convert("RGBA")
                        if platform.mac_ver()[0] == PUBLISHED_MACOS[0]:
                            self.assertTrue(candidate.tobytes() != originals[name].tobytes(), "Font smoothing had no effect")
                        print(f"{name} font smoothing: {bounded_pixels(originals[name], candidate, runs)}")
            for case, (_, token, _) in faults.items():
                with self.subTest(shared_pixel_error=case), Image.open(dest / (case + ".webp")) as image:
                    actual = image.convert("RGBA")
                    self.assertTrue(actual.tobytes() == same_faults[case].tobytes(), "The two captures must share the fault")
                    reason = f"Numeric glyph .* in plate number {re.escape(repr(token))}"
                    with self.assertRaisesRegex(AssertionError, reason) as failure:
                        check_pixels(originals[light], actual, same_faults[case], regions[light], native=False)
                    print(f"{case} rejected after matching independent capture: {failure.exception}")

    def test_diagnostic_isolation(self):
        from contextlib import redirect_stdout
        from io import StringIO
        from PIL import Image

        metadata = {"benchmarks-zh-light": "xmp", "benchmarks-zh-dark": "exif"}
        pixel_name = "benchmarks-en-dark"
        rendered = {}
        exif = Image.Exif()
        exif[270] = "metadata isolation control"

        async def export(plates, dest):
            for name in plates:
                file = dest / (name + ".webp")
                original = keynote.OUT / file.name
                if name in metadata:
                    key = metadata[name]
                    value = b"<xmpmeta>test fixture</xmpmeta>" if key == "xmp" else exif.tobytes()
                    with Image.open(original) as image:
                        image.save(file, "WEBP", **{key: value})
                    with Image.open(file) as image:
                        self.assertIn(key, image.info)
                elif name == pixel_name:
                    with Image.open(original) as image:
                        image.paste("white", (80, 100, 180, 150))
                        image.save(file, "WEBP")
                else:
                    shutil.copyfile(original, file)
                rendered[name] = file.read_bytes()

        def correct_controls(plates, dest, *, inspect_fonts, regions):
            controls = {}
            for name in plates:
                with Image.open(keynote.OUT / (name + ".webp")) as image:
                    controls[name] = image.convert("RGBA")
                regions[name] = {}
            return controls

        with tempfile.TemporaryDirectory() as directory:
            diagnostics = Path(directory)
            for name in metadata:
                file = name + ".webp"
                shutil.copyfile(keynote.OUT / file, diagnostics / file)  # A previous, valid run.
            result = unittest.TestResult()
            with (patch.dict(os.environ, {"OPENQUANTUM_KEYNOTE_DIAGNOSTICS": directory}),
                  patch.object(keynote, "render_plates", export),
                  patch(__name__ + ".reference_mismatches", return_value=([], PUBLISHED_MACOS)),
                  patch(__name__ + ".reference_rasters", correct_controls),
                  redirect_stdout(StringIO())):
                Keynote("test_render").run(result)
            self.assertFalse(result.errors, result.errors)
            self.assertEqual(len(result.failures), 3, result.failures)
            errors = "\n".join(trace for _, trace in result.failures)
            self.assertIn("Unexpected WebP chunk b'XMP '", errors)
            self.assertIn("Unexpected WebP chunk b'EXIF'", errors)
            self.assertIn("Export differs from the independent", errors)
            self.assertEqual({f.stem for f in diagnostics.iterdir()}, set(rendered) - set(metadata))
            for file in diagnostics.iterdir():
                self.assertTrue(file.read_bytes() == rendered[file.stem], file.name)
            print("XMP and EXIF rejected and absent from diagnostics. The clean pixel mismatch and valid plate are retained.")


if __name__ == "__main__":
    unittest.main()
