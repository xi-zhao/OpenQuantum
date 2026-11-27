"""Check the published plates against the renderer, evidence and reader-facing index."""
import asyncio
import hashlib
import importlib.util
from importlib.metadata import version
from io import BytesIO
import os
from pathlib import Path
import platform
import re
import shutil
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


def reference_rasters(plates, directory, *, inspect_fonts=False):
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
        if inspect_fonts:
            page.goto(page.locator(".fig-wrap img").get_attribute("src"))
            fonts = glyph_fonts(session, "svg text")
            print(f"Wigner SVG: fonts painting glyphs: {', '.join(fonts)}")
            if not fonts or "LastResort" in fonts:
                raise AssertionError("Missing Wigner figure label font")
        browser.close()
    return captures


def bounded_pixels(published, actual):
    """Bound both whole-frame error and concentrated damage to a single area."""
    from PIL import ImageChops, ImageFilter

    def channel_error(a, b):
        red, green, blue = ImageChops.difference(a, b).split()
        return ImageChops.lighter(red, ImageChops.lighter(green, blue))

    def outside_neighborhood(a, b):
        high = ImageChops.subtract(a, b.filter(ImageFilter.MaxFilter(5)))
        low = ImageChops.subtract(b.filter(ImageFilter.MinFilter(5)), a)
        return ImageChops.lighter(high, low)

    if published.size != actual.size or published.getchannel("A").tobytes() != actual.getchannel("A").tobytes():
        raise AssertionError("Reference canvas or alpha silhouette differs")
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
    return metrics


def check_pixels(published, actual, control, *, native):
    if actual.size != control.size or actual.tobytes() != control.tobytes():
        raise AssertionError("Export differs from the independent 2x sRGB capture on this host")
    if published.size == actual.size and published.tobytes() == actual.tobytes():
        return "published RGBA identical"
    if native:
        raise AssertionError("Published RGBA differs on its original macOS build")
    return bounded_pixels(published, actual)


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

    def inspect_webp(self, file):
        raw = file.read_bytes()
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
                    self.assertEqual(self.inspect_webp(keynote.OUT / file), expected[file])
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
            if diagnostics:
                Path(diagnostics).mkdir(parents=True, exist_ok=True)
                for name in plates:
                    shutil.copyfile(dest / f"{name}.webp", Path(diagnostics) / f"{name}.webp")
            for name, signature in BENCHMARK_SIGNATURES.items():
                published = keynote.OUT / f"{name}.webp"
                self.assertEqual(benchmark_signature(plates[name], published.read_bytes()), signature, name)
            if not mismatches:
                controls = reference_rasters(plates, dest, inspect_fonts=True)
            for name in BENCHMARK_SIGNATURES:
                with self.subTest(plate=name):
                    published = keynote.OUT / (name + ".webp")
                    regenerated = dest / published.name
                    expected = self.inspect_webp(published)
                    self.assertEqual(self.inspect_webp(regenerated), expected, f"{name} render dimensions")
                    with Image.open(published) as a, Image.open(regenerated) as b:
                        b.load()
                        self.assertEqual((b.format, b.size), ("WEBP", expected))
                        self.assertFalse({"exif", "xmp", "icc_profile"}.intersection(b.info))
                        print(f"{name}: decoded {b.width}×{b.height} WebP, no EXIF/XMP/ICC")
                        if not mismatches:
                            result = check_pixels(a.convert("RGBA"), b.convert("RGBA"), controls[name], native=macos == PUBLISHED_MACOS)
                            print(f"{name}: independent RGBA identical, {result}, WebP bytes {'identical' if published.read_bytes() == regenerated.read_bytes() else 'differ'}")
        if mismatches:
            reason = "Keynote reference environment mismatch: " + ", ".join(mismatches)
            print("Exact RGBA parity is scoped to the pinned macOS reference. " + reason)
            if os.environ.get("OPENQUANTUM_REQUIRE_KEYNOTE_PIXEL_MATCH") == "1":
                self.fail(reason)

    def test_visual_controls(self):
        from PIL import Image, ImageFilter, ImageOps

        name = "benchmarks-zh-light"
        markup = keynote.keynote_plates()[name]
        published = keynote.OUT / (name + ".webp")
        golden = Image.open(published).convert("RGBA")
        # Exercise the cross-build branch on every host, including the authoring Mac.
        drift = golden.filter(ImageFilter.GaussianBlur(0.3))
        drift.putalpha(golden.getchannel("A"))
        self.assertNotEqual(drift.tobytes(), golden.tobytes())
        self.assertIn("low-pass", check_pixels(golden, drift, drift, native=False))
        with self.assertRaisesRegex(AssertionError, "original macOS"):
            check_pixels(golden, drift, drift, native=True)
        wrong_theme = ImageOps.invert(golden.convert("RGB")).convert("RGBA")
        wrong_theme.putalpha(golden.getchannel("A"))
        missing_number = golden.copy()
        missing_number.paste("white", (110, 225, 430, 330))
        for change, damaged in [("theme", wrong_theme), ("missing numeric region", missing_number)]:
            with self.subTest(change=change):
                with self.assertRaisesRegex(AssertionError, "visual bounds exceeded"):
                    check_pixels(golden, damaged, damaged, native=False)

        altered = {
            "number": markup.replace("5.69×", "5.68×"),
            "missing-glyph": markup.replace("Wigner 函数", "Wigner 函"),
            "position": markup.replace("</style>", ".hero-x strong { transform: translateX(1px); }</style>"),
            "color": markup.replace("#0E7490", "#107890"),
        }
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            for chunk in [b"XMP ", b"NOTE"]:
                with self.subTest(metadata=chunk):
                    data = published.read_bytes() + chunk + b"\x04\0\0\0test"
                    sample = dest / "metadata.webp"
                    sample.write_bytes(data[:4] + (len(data) - 8).to_bytes(4, "little") + data[8:])
                    with self.assertRaisesRegex(AssertionError, "Unexpected WebP chunk"):
                        self.inspect_webp(sample)
            control = reference_rasters({name: markup}, dest)[name]
            asyncio.run(keynote.render_plates(altered, dest))
            for change, text in altered.items():
                with self.subTest(change=change):
                    self.assertNotEqual(benchmark_signature(text, published.read_bytes()), BENCHMARK_SIGNATURES[name])
                    altered_pixels = Image.open(dest / f"{change}.webp").convert("RGBA")
                    with self.assertRaisesRegex(AssertionError, "independent 2x"):
                        check_pixels(golden, altered_pixels, control, native=False)
                    if change in ("number", "missing-glyph"):
                        with self.assertRaisesRegex(AssertionError, "visual bounds exceeded"):
                            bounded_pixels(control, altered_pixels)
            with patch.object(keynote, "SCALE", 1):
                asyncio.run(keynote.render_plates({name: markup}, dest))
            small = Image.open(dest / published.name).convert("RGBA")
            self.assertEqual(small.size, (900, 649))
            for candidate in [small, small.resize(control.size, Image.Resampling.LANCZOS)]:
                with self.assertRaisesRegex(AssertionError, "independent 2x"):
                    check_pixels(golden, candidate, control, native=False)


if __name__ == "__main__":
    unittest.main()
