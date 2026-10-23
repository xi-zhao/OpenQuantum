#!/usr/bin/env python3
"""Check that an idea note is complete before it is handed on.

This checks structure, never science: every section the template requires is
present and non-empty, no placeholder survived, and the maturity level is one of
the six. That is worth a script because the failure it catches is silent — an
empty `Classical baseline` or a dropped `Open questions` reads as a finished
note, and `idea-to-spec` has no way to know the section was never filled.

The required sections are read from `references/handoff-template.md` rather than
listed here, so editing the template cannot leave this check behind.

    python validate_idea_note.py <short_name>_idea.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "references" / "handoff-template.md"

# The closed set from references/method-catalog.md. A note claiming anything
# else is claiming a maturity nobody defined.
MATURITY = (
    "ready_library",
    "documented_recipe",
    "documented_primitive",
    "research_pattern",
    "planned_or_adjacent",
    "no_fit",
)

HEADING = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.M)
PLACEHOLDER = re.compile(r"<[a-z][^<>\n]{2,}>")


def sections(text: str) -> dict[str, str]:
    """Map heading -> body, keyed on the lowercased heading text."""
    found: dict[str, str] = {}
    matches = list(HEADING.finditer(text))
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        found[match.group(1).strip().lower()] = text[match.end():end].strip()
    return found


def required(template: str) -> list[str]:
    """The template's level-2 headings, in order. Its H1 is a title, not a section."""
    return [m.group(1).strip().lower()
            for m in re.finditer(r"^##\s+(.+?)\s*$", template, re.M)]


def check(note: str, template: str) -> list[str]:
    problems: list[str] = []
    have = sections(note)
    for name in required(template):
        if name not in have:
            problems.append(f"missing section: {name}")
        elif not have[name]:
            problems.append(f"empty section: {name}")

    selected = have.get("selected method", "")
    if selected:
        for field in ("method id", "maturity", "confidence"):
            if field not in selected.lower():
                problems.append(f"`Selected method` does not state {field}")
        if not any(level in selected for level in MATURITY):
            problems.append("`Selected method` maturity is not one of: "
                            + ", ".join(MATURITY))

    for match in PLACEHOLDER.finditer(note):
        line = note.count("\n", 0, match.start()) + 1
        problems.append(f"line {line}: unfilled placeholder {match.group(0)}")
    return problems


def self_test() -> None:
    template = "# t\n\n## Alpha\n\nx\n\n## Selected method\n\ny\n"
    good = ("# b\n\n## Alpha\n\nfilled in\n\n## Selected method\n\n"
            "- Method ID: mwis-qaa\n- Maturity: ready_library\n- Confidence: high\n")
    assert check(good, template) == [], check(good, template)

    assert any("missing section: alpha" in p
               for p in check(good.replace("## Alpha\n\nfilled in", ""), template))
    assert any("empty section: alpha" in p
               for p in check(good.replace("filled in", ""), template))
    assert any("maturity is not one of" in p
               for p in check(good.replace("ready_library", "very_mature"), template))
    assert any("unfilled placeholder" in p
               for p in check(good.replace("mwis-qaa", "<method id>"), template))
    assert any("does not state confidence" in p
               for p in check(good.replace("- Confidence: high", ""), template))
    print("self-test passed: every required section, the maturity enum and "
          "leftover placeholders all fail when they should")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check an idea note for missing or empty "
                    "required sections before handing it to idea-to-spec.")
    parser.add_argument("note", nargs="?", help="path to the <short_name>_idea.md note")
    parser.add_argument("--self-test", action="store_true",
                        help="check the checker against known-good and known-bad notes")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if not args.note:
        parser.error("give a note to check, or --self-test")

    if not TEMPLATE.is_file():
        print(f"✘ template missing: {TEMPLATE}", file=sys.stderr)
        return 2
    path = Path(args.note)
    if not path.is_file():
        print(f"✘ no such file: {path}", file=sys.stderr)
        return 2

    problems = check(path.read_text(), TEMPLATE.read_text())
    if problems:
        for problem in problems:
            print(f"✘ {problem}")
        print(f"\n{len(problems)} problem(s) — fill these in before handing the "
              "note to idea-to-spec, or say in the note why a section is empty.")
        return 1
    print(f"✔ {path}: every required section present and filled")
    return 0


if __name__ == "__main__":
    sys.exit(main())
