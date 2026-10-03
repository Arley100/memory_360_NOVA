# Mémoire 360 · NOVA (prototype)

Operational memory for **Loto-Québec Challenge 2: Project 360 / NOVA** (CodeML 2026).
Take over a project in 10 minutes, with proof: every statement links to the exact line, page, cell or screenshot row it comes from.

## Run it (Windows PowerShell, macOS or Linux)

Requires **Node.js 20.9+** (22 LTS recommended).

```powershell
npm install
npm run ingest     # indexes the 64 corpus files and verifies every citation (expects 138/138)
npm run dev        # open http://localhost:3000
```

Optional, for "Ask" and automatic update analysis: copy `.env.example` to `.env.local` and add a key.

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Without a key, everything else works (overview, brief, ten answers, timeline, decisions, contradictions, actions, sources, search, evidence viewer, manual updates).

## What's inside

| Page | Deliverable (README.txt) |
|---|---|
| Overview | Status, 3 go-live conditions, budget, next actions |
| Handover brief | 1. One-page brief (print with Ctrl+P) |
| Timeline, Decisions, Contradictions, Actions, Sources | 2. Consultable memory |
| Ten questions | 3. Ten sourced answers |
| Add new information | 4. Update after new information, baseline preserved |
| Usage guide | 5. Usage guide |
| Ask (top bar) | Natural-language questions with verified citations (consignes.pdf #7, #8) |

## How it works

- `corpus/` holds the 64 challenge files **unchanged** (fictional data) plus the package files.
- `npm run ingest` parses every format (.eml with attachments, .txt, .md, .csv, .pdf, .xlsx, .png via verified transcriptions) into citable segments: `data/registry.json`, `data/segments.json`. It detects the 6 duplicate files automatically and checks that every quote in the knowledge base really exists in its source.
- `data/baseline/kb.json` is the curated, human-verified knowledge base (answers, conditions, actions, contradictions, timeline, brief). It is **never modified** by the app.
- Uploads create `data/updates/U001/`, `U002/`… (file + segments + change set). The current view = baseline + published updates.
- Guardrails in code (`src/lib/update.ts`) stop the model from inventing an approval, closing a go-live condition without its validating owner, or missing a date past the contract end (Oct 31, 2026).
- `rehearsal/` contains fake "new event" files to practice the live demo. They are simulations, not NOVA facts.

## Project layout

```
corpus/                 challenge files (unchanged)
data/baseline/kb.json   curated knowledge base (frozen)
data/registry.meta.json authority / role / id for each file
data/vision/            screenshot transcriptions (human-checked)
data/updates/           published updates (U001, U002, ...)
scripts/ingest.ts       build index + verify citations
src/lib/                parsers, citation resolver, LLM adapter, guardrails
src/app/                pages and API routes
rehearsal/              practice files for the live update
SPEC.md                 full team specification
```
