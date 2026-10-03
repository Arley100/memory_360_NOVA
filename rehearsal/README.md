# Rehearsal files (simulations, NOT NOVA facts)

Use these to practice the live "Add new information" step. Never present them as real project information.

| File | What it tests | Expected result |
|---|---|---|
| `R1_retest_SEC-210_echec.eml` | Failed security retest + vendor proposes Nov 5 | SEC-210 stays open; Oct 22 decision stays in force; Nov 5 is a proposal (not approved) and is flagged as after the contract end (Oct 31) |
| `R2_Teams_ACC-303_valide.txt` | Mélissa closes ACC-303 | Condition 2 met (validating owner quoted); conditions 1 and 3 unchanged |
| `formats/cr.docx` | Committee minutes approving a move to Oct 29 | A new decision is accepted only if the approval is quoted; otherwise it stays a proposal |
| `formats/invite.ics` | Calendar invite for a committee meeting | Read as event fields (title, start, organizer, description) |
| `formats/teams_export.json` | Teams export where Mélissa closes ACC-303 | Read as "time - author : message" |
| `formats/deck.pptx` | Status slide + speaker notes | Slide text and notes are read; the Oct 29 note is a proposal |
| `formats/plan_v4.xls` | Updated plan with go-live 2026-10-22 | Plan now matches the approved date (contradiction C1 resolved going forward) |
| `formats/html_only.eml` | Email with an HTML body only | Body read correctly |
| `formats/notes_win.txt` | French text saved in Windows-1252 | Accents read correctly |
| `formats/page.html`, `formats/note.rtf` | Web page and rich text | Text read correctly |

Several files at once: select or drop them together, or put them in a `.zip`.
