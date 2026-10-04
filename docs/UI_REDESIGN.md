# NOVA presentation redesign

Implemented a viewport-wide rounded application shell with dark grouped navigation, Poppins typography, a restrained teal/blue palette, shared outline icons, compact citation tokens, quiet semantic tags, and consistent operational tables.

The overview uses real existing budget and condition data in a KPI strip, readiness module, decision/actions rail, allocation bar, and separate unapproved CR-04 warning. Questions use an anchor index and answer document; contradictions use evidence comparison columns; sources use repository rows and a document/metadata workbench. The brief, timeline, roster, guide, Ask, and update review all share the visual system while keeping their distinct functions.

## Preservation

No changes to `src/lib/**`, `src/app/api/**`, `scripts/**`, `data/**`, `corpus/**`, or `rehearsal/**`. Citation URL construction, locator matching, highlighting and auto-scroll, search matching, API requests, CodeGate, baseline/current composition, and guardrails remain intact. No dependencies added; icons are local SVGs. Poppins uses the same external Google Fonts loading mechanism as the previous fonts.

## Verification

- `npm run build`: passed, including TypeScript and all route generation.
- `npm run lint`: zero errors; warnings in the untouched `src/lib/prompts.ts` for two unused `citations` variables. The existing unused disable comment in the edited Ask component was removed. Focused lint of `src/app` and `src/components` passed without warnings.
- Chromium/Playwright available on the machine was used without adding a testing stack or dependency to this repository.
- The final production server was also checked: the dark sidebar rendered at 244 px with Poppins, and clean production captures were saved for every requested route.
- All requested routes returned HTTP 200 and were captured and visually inspected: overview, brief, questions, timeline, decisions, contradictions, actions, sources, text source SEC-210, spreadsheet PLAN-V2, screenshot ACC-301.png, team, update, Ask, and guide.
- Citation navigation reached SEC-210 L25, highlighting and auto-scrolling to the exact passage. Range L23-L25 highlighted three passages. Query-only source highlighting also worked.
- Spreadsheet PLAN-V3 `Plan projet!F7` and screenshot OPS-601.png `region=row-4` resolved to the exact cited cell/row.
- Source search for `rollback` returned five matching passages. Question index navigated to Q05.
- Ask submitted `Is security accepted?` to the real API and received HTTP 200 with a sourced answer.
- File input produced a multipart POST to `/api/update/analyze`; it was intercepted before ingestion. Review, Publish focus, and Discard were checked using a rendering-only response built from existing baseline text. No upload or publication was persisted. The review screenshot is explicitly a rendering check, not a new project version.
- No page errors. No global horizontal overflow across the checked overview, questions, evidence viewer, actions, update, and Ask views at 1920, 1366, 1024, 768, and 390 px. Desktop overview captures include 1440x900, 1920x1080, and 1366x768.
- Keyboard checks passed for skip link/main target, sidebar, header input, evidence tokens, table evidence links, file control, Ask input, and Publish control, with visible 3px focus rings.
- Reduced motion disables transitions. The brief PDF is one A4 page; sidebar/header are hidden, and the sheet prints black on white.

## Limitations and intentional omissions

The named `reference_images`, `reference_code`, and `specs` reference pack was absent from the provided workspace/attachments. The detailed colors, proportions, and layout direction in the task were followed, and the original four project screenshots were inspected. Direct comparison against the two missing reference images was therefore unavailable.

No command-palette keyboard hint, fabricated metrics, decorative illustrations, new business filters, or publication was added. CodeGate and the core update/answer engines were intentionally left intact. Existing original screenshots remain as before/after references.

## Exact source files modified or created

`src/components/UI.tsx` is new; the remaining source files below are modified.

- `src/app/actions/page.tsx`
- `src/app/ask/AskClient.tsx`
- `src/app/ask/page.tsx`
- `src/app/brief/page.tsx`
- `src/app/contradictions/page.tsx`
- `src/app/decisions/page.tsx`
- `src/app/globals.css`
- `src/app/guide/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/questions/page.tsx`
- `src/app/sources/[id]/page.tsx`
- `src/app/sources/page.tsx`
- `src/app/team/page.tsx`
- `src/app/timeline/page.tsx`
- `src/app/update/UpdateClient.tsx`
- `src/app/update/page.tsx`
- `src/components/ChangeSetView.tsx`
- `src/components/Chip.tsx`
- `src/components/Nav.tsx`
- `src/components/SourceExplorer.tsx`
- `src/components/UI.tsx`

## Created documentation and verification artifacts

- `docs/UI_REDESIGN.md` (this report)
- `docs/screenshots/redesign/accessibility-verification.json`
- `docs/screenshots/redesign/actions.png`
- `docs/screenshots/redesign/ask-answer.png`
- `docs/screenshots/redesign/ask.png`
- `docs/screenshots/redesign/brief-print.pdf`
- `docs/screenshots/redesign/brief-print.png`
- `docs/screenshots/redesign/brief.png`
- `docs/screenshots/redesign/contradictions.png`
- `docs/screenshots/redesign/decisions.png`
- `docs/screenshots/redesign/guide.png`
- `docs/screenshots/redesign/overview-1024.png`
- `docs/screenshots/redesign/overview-1366.png`
- `docs/screenshots/redesign/overview-1440-viewport.png`
- `docs/screenshots/redesign/overview-1920.png`
- `docs/screenshots/redesign/overview-390.png`
- `docs/screenshots/redesign/overview-768.png`
- `docs/screenshots/redesign/overview.png`
- `docs/screenshots/redesign/questions.png`
- `docs/screenshots/redesign/review-contact-sheet.png`
- `docs/screenshots/redesign/screenshot-locator-viewport.png`
- `docs/screenshots/redesign/source-search.png`
- `docs/screenshots/redesign/sources-ACC-301.png.png`
- `docs/screenshots/redesign/sources-PLAN-V2.png`
- `docs/screenshots/redesign/sources-SEC-210.png`
- `docs/screenshots/redesign/sources.png`
- `docs/screenshots/redesign/team.png`
- `docs/screenshots/redesign/timeline.png`
- `docs/screenshots/redesign/update-review-render-check.png`
- `docs/screenshots/redesign/update.png`
- `docs/screenshots/redesign/verification.json`
