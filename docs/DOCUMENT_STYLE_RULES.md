# AITA — Document Style Rules

Applies to every formal AITA deliverable in `.docx` form (SRS, SDD, Test Plan,
Capstone reports). These rules are mechanical: a script can verify them, and
`tools/sync_doc_style.py` can enforce them:

```bash
pip install python-docx
python tools/sync_doc_style.py report.docx report_styled.docx
```

**Last verified:** 2026-07-09

---

## 1. Font

**Times New Roman**, everywhere — body text, headings, table cells, captions,
headers and footers. No exceptions, no mixed families.

Set it in three places or it will not hold:

1. `docDefaults` in `styles.xml` (the fallback every run inherits)
2. every paragraph **style** definition (`Heading 1..5`, `normal`, `Title`, …)
3. every **run**'s direct formatting (`w:rPr/w:rFonts`)

Direct run formatting wins over the style, and the style wins over
`docDefaults`. Setting only the style silently does nothing when a run carries
its own font.

## 2. Size is driven by numbering depth, not by style name

Body content is **11 pt**. Each level of the section number you strip off adds
**one point**. Count the numeric components of the heading's prefix.

| Prefix example | Depth | Size | Word style | Google Docs |
|---|---|---|---|---|
| `I.`, `II.` | part (roman) | **16 pt** | `Heading 1` | Tiêu đề 1 |
| `1.`, `2.`, `3.` | 1 | **15 pt** | `Heading 2` | Tiêu đề 2 |
| `3.2` | 2 | **14 pt** | `Heading 3` | Tiêu đề 3 |
| `3.2.1` | 3 | **13 pt** | `Heading 4` | Tiêu đề 4 |
| `3.2.1.1` | 4 | **12 pt** | `Heading 5` | Tiêu đề 5 |
| *(no number)* | — | **11 pt** | `normal` | Văn bản thường |

`Heading 1` / *Tiêu đề 1* is reserved for the roman-numeral parts (`I.`, `II.`).
Nothing else may use it. This is what makes Google Docs' auto-generated Table
of Contents nest correctly: two top-level parts, with `1.`, `2.`, `3.` beneath
them, and so on down.

The document has no depth-5 numbering, so `Heading 6` is unused. Introducing
one would collide with body text at 11 pt — renumber instead.

So a heading is always exactly one point larger than the level nested inside
it, and the deepest heading is exactly one point larger than the content it
introduces.

### The corollary that matters most

**A paragraph with no section number is content.** It is 11 pt and it uses the
`normal` style — no matter what it looks like, and no matter how it is styled
today.

Lines such as:

```
Function Description: Serves as the initial landing page for users.
Function Trigger: Displayed automatically when the app is launched.
Button/Navigation: Primary "Get Started" button at the bottom.
Trigger: User taps or clicks the button.
```

are **body text**, not headings. Styling them as `Heading 3` inflates them to
14 pt and — worse — drags all of them into the Table of Contents. The ToC must
list sections, not prose.

Conversely, a numbered heading must carry the Word `Heading N` style that
matches its depth. `3.2.1.1` styled as `Heading 3` is wrong even if its font
size happens to be right: the ToC and the navigation pane read the *style*, not
the number.

## 3. Cover page

The cover block (everything above the `Table of Contents` paragraph) is exempt
from the size rule.

| Line | Style | Google Docs |
|---|---|---|
| `CAPSTONE PROJECT REPORT` | `Title` | Tiêu đề |
| `Report 3 – Software Requirement Specification` | `Subtitle` | Phụ đề |
| everything else on the cover | `normal` | Văn bản thường |

`Title` and `Subtitle` are the right styles precisely *because* Google Docs
leaves them out of the Table of Contents — a cover block must never appear as a
ToC entry. Do not style the cover with `Heading 1`. Both keep their display
sizes; they are still Times New Roman.

## 4. Table of Contents

The ToC is a **field**, not text, and it caches its rendered output. That cache
survives heading edits, so a converted document keeps showing the *old*
headings — and Google Docs may import the stale cache as plain text, silently
reintroducing content you thought you deleted.

`sync_doc_style.py` therefore **empties the cache and leaves a live field**:

```
TOC \h \u \z \t "Heading 1,1,Heading 2,2,Heading 3,3,Heading 4,4,Heading 5,5"
```

It also writes `<w:outlineLvl>` onto `Heading 1..6` (Google's `.docx` export
omits it, and Word's ToC builder needs it) and sets
`<w:updateFields w:val="true"/>` in `settings.xml`.

To regenerate:

- **Word** — accept the "update fields" prompt on open.
- **Google Docs** — the ToC rebuilds from the Heading 1..5 outline. If the
  placeholder line is still showing, delete it and use
  **Insert → Table of contents**.

## 5. Use-case specification tables

Every use case in §2.2.2 gets exactly one detail table in §2.3, in the same
order, and the two must agree on name and actor.

- Table is 15 rows × 4 columns.
- `Use Case ID` = r0c1, `Use Case Name` = r0c3, `Primary Actor` = r2c1,
  `Secondary Actor` = r2c3.
- All cell text is 11 pt Times New Roman — label cells included.

**Never style a table cell as a heading.** Cell text is content: `normal` /
*Văn bản thường*, always. Label cells (`Use Case ID`, `Use Case Name`, …) get
their emphasis from **bold on the run**, not from a heading style.

This is not cosmetic. Google Docs scrapes headings from *inside tables* when it
builds the Table of Contents. A `Use Case Name` cell styled `Heading 5` puts a
bare, unnumbered duplicate into the ToC directly beneath its own section:

```
2.3.1.9 Manage Notification Preferences        14     <- the real heading
Manage Notification Preferences                14     <- the table cell
```

The SFARS template shipped with `Heading 5` on that cell, so every use-case
table inherited it. `sync_doc_style.py` demotes any heading found in any cell.

ID prefixes are per-actor and zero-padded to two digits:

| Section | Actor | ID format |
|---|---|---|
| 2.3.1 | Admin, Lecturer, Student | `UC-01` |
| 2.3.2 | Admin | `UC-ADM-01` |
| 2.3.3 | Lecturer | `UC-LEC-01` |
| 2.3.4 | Student | `UC-STU-01` |

Never reuse an ID from a different project. `UC-PAT-*` and `UC-RES-*` are
SFARS identifiers and must not appear in an AITA document.

## 6. Actors

The only actors are **Admin**, **Lecturer**, and **Student**. `Patient`,
`Rescuer`, and `User` are from SFARS. If any of these words appear outside a
quotation, the document has been copied from the wrong template — grep before
you ship:

```bash
grep -Eiq 'snake|\bSOS\b|rescuer|patient|first[- ]aid|UC-PAT|UC-RES' && echo CONTAMINATED
```

## 7. The code is the source of truth

Per `CLAUDE.md`, when a document and the codebase disagree, the codebase wins.
A requirement that describes unbuilt functionality is legitimate in an SRS —
but it must not be written in the present tense as though it ships today.

Known divergences as of the date above, kept here so they are not
"rediscovered" every review:

- **Google SSO** is specified (`UC-02`, §3.2.1.2) but not implemented.
  `passport`, `passport-google-oauth20` and `passport-github2` are declared in
  `be/package.json`, yet nothing under `be/src/` imports them.
- **Redis / background queues** are specified (`UC-ADM-24` Monitor Background
  Queues) but absent from `be/src/`.
- The database is **SQL Server** (`prisma/schema.prisma` → `provider =
  "sqlserver"`), not PostgreSQL.
