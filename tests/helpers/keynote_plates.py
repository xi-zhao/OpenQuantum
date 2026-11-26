"""Check the published plates against the renderer, evidence and reader-facing index."""
import asyncio
import hashlib
import importlib.util
from pathlib import Path
import re
import shutil
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
    "benchmarks-zh-light": "7eef64f93a3819c934eb6a067f821e3f4e71fe174dd8c03aa5d308ebc72473a6",
    "benchmarks-zh-dark": "6a0e362de813c0d4c28405715313cb8413c105c0564eaeb811a0b98c11fda554",
    "benchmarks-en-light": "4b682049e79705f5c876ae068298d960fc8c1d5f7a54709e978cb7c146d2f9c1",
    "benchmarks-en-dark": "fbca5f45324abba83f8e91af219fb757db19ab36c2b499193273820852968aef",
}


def benchmark_signature(markup, webp):
    def local_asset(match):
        asset = Path(url2pathname(urlsplit(match[0]).path))
        return f"{asset.relative_to(ROOT).as_posix()}#{hashlib.sha256(asset.read_bytes()).hexdigest()}"
    portable = re.sub(r"""file:[^"'()]+""", local_asset, markup)
    return hashlib.sha256(portable.encode() + b"\0" + webp).hexdigest()


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
            self.assertNotIn(kind, (b"EXIF", b"XMP ", b"ICCP"))
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

    def test_reference_render(self):
        from PIL import Image
        plates = keynote.keynote_plates()
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            asyncio.run(keynote.render_plates({name: plates[name] for name in BENCHMARK_SIGNATURES}, dest))
            for name in BENCHMARK_SIGNATURES:
                with self.subTest(plate=name):
                    published = keynote.OUT / (name + ".webp")
                    regenerated = dest / published.name
                    with Image.open(published) as a, Image.open(regenerated) as b:
                        self.assertEqual(a.size, b.size)
                        self.assertTrue(a.convert("RGBA").tobytes() == b.convert("RGBA").tobytes(), "regenerated RGBA differs")
                        print(f"{name}: RGBA identical, WebP bytes {'identical' if published.read_bytes() == regenerated.read_bytes() else 'differ'}")


if __name__ == "__main__":
    unittest.main()
