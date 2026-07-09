#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Enforce docs/DOCUMENT_STYLE_RULES.md on an AITA .docx.

Times New Roman everywhere; size driven by section-number depth
(11pt content, +1pt per level up); unnumbered paragraphs are content.

    python tools/sync_doc_style.py in.docx out.docx

Requires: pip install python-docx
"""
import re
import sys

import docx
from docx.oxml.ns import qn
from docx.shared import Pt

FONT = "Times New Roman"
CONTENT_PT = 11

# numbering depth -> (Word style, point size)
# Google Docs shows these as Tiêu đề 1..5; they are what its auto-generated
# Table of Contents reads. Heading 1 is reserved for the roman parts (I, II, …).
DEPTH = {
    "roman": ("Heading 1", 16),
    1: ("Heading 2", 15),
    2: ("Heading 3", 14),
    3: ("Heading 4", 13),
    4: ("Heading 5", 12),
}
BODY_STYLE = "normal"  # Google Docs: "Văn bản thường"

# Cover page, in order of appearance. Google Docs keeps Title/Subtitle OUT of
# the Table of Contents, which is exactly where a cover block belongs.
COVER_STYLES = ["Title", "Subtitle"]  # "Tiêu đề", "Phụ đề"

# "I. Record of Changes" | "3. Functional Requirements" | "3.2.1.1 Splash Page"
NUMBERED = re.compile(r"^((?:[IVXLC]+)|(?:\d+(?:\.\d+)*))\.?\s+\S")


def depth_of(text):
    """Return the numbering depth of a heading, or None if it is not numbered."""
    m = NUMBERED.match(text.strip())
    if not m:
        return None
    token = m.group(1)
    if re.fullmatch(r"[IVXLC]+", token):
        return "roman"
    return token.count(".") + 1


def set_run(run, size_pt=None):
    """Force the font family, and optionally the size, onto a single run."""
    run.font.name = FONT
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = rpr.makeelement(qn("w:rFonts"), {})
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), FONT)
    if size_pt is not None:
        run.font.size = Pt(size_pt)


def set_doc_defaults(document):
    """Times New Roman + 11pt as the inherited fallback for every run."""
    dd = document.styles.element.find(qn("w:docDefaults"))
    rpr_default = dd.find(qn("w:rPrDefault"))
    rpr = rpr_default.find(qn("w:rPr"))
    if rpr is None:
        rpr = rpr_default.makeelement(qn("w:rPr"), {})
        rpr_default.append(rpr)

    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = rpr.makeelement(qn("w:rFonts"), {})
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), FONT)

    for tag in ("w:sz", "w:szCs"):
        el = rpr.find(qn(tag))
        if el is None:
            el = rpr.makeelement(qn(tag), {})
            rpr.append(el)
        el.set(qn("w:val"), str(CONTENT_PT * 2))  # half-points


def set_style_defs(document):
    """Pin the font on every style, and the size on the ones the rule names."""
    sizes = {style: pt for style, pt in DEPTH.values()}
    sizes[BODY_STYLE] = CONTENT_PT
    for style in document.styles:
        try:
            if style.font is None:
                continue
        except (AttributeError, NotImplementedError):
            continue
        style.font.name = FONT
        if style.name in sizes:
            style.font.size = Pt(sizes[style.name])


def set_outline_levels(document):
    """Word builds its ToC from w:outlineLvl; Google's export omits it."""
    by_id = {
        s.get(qn("w:styleId")): s
        for s in document.styles.element.findall(qn("w:style"))
    }
    for level in range(6):
        style = by_id.get("Heading%d" % (level + 1))
        if style is None:
            continue
        ppr = style.find(qn("w:pPr"))
        if ppr is None:
            ppr = style.makeelement(qn("w:pPr"), {})
            style.append(ppr)
        lvl = ppr.find(qn("w:outlineLvl"))
        if lvl is None:
            lvl = ppr.makeelement(qn("w:outlineLvl"), {})
            ppr.append(lvl)
        lvl.set(qn("w:val"), str(level))


TOC_INSTR = ' TOC \\h \\u \\z \\t "Heading 1,1,Heading 2,2,Heading 3,3,Heading 4,4,Heading 5,5" '
TOC_PLACEHOLDER = "Right-click and choose Update Field to build the Table of Contents."


def reset_toc(document):
    """Drop the ToC's cached result, keeping a live field.

    A Word TOC field caches its rendered text. That cache survives heading
    edits, so a converted document still shows the *old* headings — and, worse,
    Google Docs may import the cache as plain text. Replacing the cache with an
    empty field forces both Word and Google Docs to regenerate from the
    Heading 1..5 outline.
    """
    body = document.element.body
    dropped = 0
    for sdt in body.findall(qn("w:sdt")):
        if not sdt.findall(".//" + qn("w:instrText")):
            continue  # not a field; leave it alone

        p = body.makeelement(qn("w:p"), {})
        for kind, payload in (
            ("begin", None),
            ("instr", TOC_INSTR),
            ("separate", None),
            ("text", TOC_PLACEHOLDER),
            ("end", None),
        ):
            r = p.makeelement(qn("w:r"), {})
            if kind == "instr":
                it = r.makeelement(qn("w:instrText"), {})
                it.set(qn("xml:space"), "preserve")
                it.text = payload
                r.append(it)
            elif kind == "text":
                t = r.makeelement(qn("w:t"), {})
                t.text = payload
                r.append(t)
            else:
                fc = r.makeelement(qn("w:fldChar"), {})
                fc.set(qn("w:fldCharType"), kind)
                r.append(fc)
            p.append(r)

        sdt.addprevious(p)
        body.remove(sdt)
        dropped += 1
    return dropped


def clear_run_size(run):
    """Drop direct sizing so the paragraph style's size wins."""
    rpr = run._element.find(qn("w:rPr"))
    if rpr is None:
        return
    for tag in ("w:sz", "w:szCs"):
        el = rpr.find(qn(tag))
        if el is not None:
            rpr.remove(el)


def cover_end_index(document):
    """Paragraphs before the 'Table of Contents' line are cover art: size-exempt."""
    for i, p in enumerate(document.paragraphs):
        if p.text.strip().lower() == "table of contents":
            return i
    return 0


def sync(src, dst):
    document = docx.Document(src)
    set_doc_defaults(document)
    set_style_defs(document)
    set_outline_levels(document)
    toc_reset = reset_toc(document)

    cover = cover_end_index(document)
    stats = {"cover": 0, "heading": 0, "demoted": 0, "content": 0, "cells": 0,
             "cell_demoted": 0, "toc_reset": toc_reset}
    promoted = 0  # how many cover lines have been given Title/Subtitle

    for i, p in enumerate(document.paragraphs):
        if i <= cover:  # cover page: exempt from the size rule
            if p.text.strip() and promoted < len(COVER_STYLES):
                p.style = document.styles[COVER_STYLES[promoted]]
                promoted += 1
                for run in p.runs:
                    set_run(run)
                    clear_run_size(run)  # let Title/Subtitle set the size
            else:
                for run in p.runs:
                    set_run(run)
            stats["cover"] += 1
            continue

        was_heading = p.style.name.startswith("Heading")
        depth = depth_of(p.text) if was_heading else None

        if depth in DEPTH:
            style_name, size = DEPTH[depth]
            stats["heading"] += 1
        else:
            style_name, size = BODY_STYLE, CONTENT_PT
            if was_heading:
                stats["demoted"] += 1  # styled as a heading but carries no number
            else:
                stats["content"] += 1

        p.style = document.styles[style_name]
        for run in p.runs:
            set_run(run, size)

    # Table cells are content, never headings. A heading style inside a cell
    # (e.g. the "Use Case Name" value) gets scraped into the Table of Contents
    # and shows up as a duplicate entry under its own section.
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    if p.style.name.startswith("Heading"):
                        p.style = document.styles[BODY_STYLE]
                        stats["cell_demoted"] += 1
                    for run in p.runs:
                        set_run(run, CONTENT_PT)
                        stats["cells"] += 1

    # the ToC is a field; make Word rebuild it on open
    settings = document.settings.element
    if settings.find(qn("w:updateFields")) is None:
        settings.append(
            settings.makeelement(qn("w:updateFields"), {qn("w:val"): "true"})
        )

    document.save(dst)
    return stats


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    result = sync(sys.argv[1], sys.argv[2])
    for key, value in result.items():
        print("%-9s %d" % (key, value))
    print("saved", sys.argv[2])
