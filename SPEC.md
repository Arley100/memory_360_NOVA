# SPEC — Mémoire 360 (NOVA)
### CodeML 2026 · Loto-Québec Challenge 2: Project 360 / NOVA

> **Single source of truth for the team.** Everything needed to build, verify, demo and submit is in this file.
> Written to be pasted into any AI assistant (Claude, ChatGPT, Cursor, Copilot, Claude Code…) together with the corpus.
> Last updated: Oct 3, 2026 · Deadline: **Oct 4, 2026, 11:00 AM EDT (no late submissions)**

---

## Table of contents

0. How to use this document (humans and AI)
1. TL;DR
2. Event logistics and sponsor clarifications
3. Scoring rubric → what we build
4. Rules of reading (guardrails that cost points if broken)
5. Product definition
6. Corpus map (all 64 files, classified)
7. Ground truth: draft answers Q01–Q10 (VERIFY before publishing)
8. Timeline (baseline)
9. Decisions register (proposal → decision → delivery → validation)
10. Contradictions register
11. Actions register
12. One-page handover brief (draft)
13. Update-after-event playbook + rehearsal kit
14. Technical architecture
15. Data model and locator format
16. Ingestion pipeline (per file format)
17. Search, chat and citation verification
18. Update engine (live upload during presentation)
19. UI / UX specification (incl. 21st.dev)
20. API specification
21. LLM prompts (model-agnostic)
22. Ticket backlog
23. Schedule and team roles
24. Demo script and PowerPoint outline
25. Devpost submission checklist
26. Usage guide template (deliverable 5)
27. Risks and fallbacks
28. Final QA checklist (definition of done)
29. Glossary FR ↔ EN and people directory

---

## 0. How to use this document

**For teammates.** Read sections 1–5 first (15 min). Then go to section 23 to find your role and section 22 for your tickets. Analysts live in sections 7–12. Developers live in sections 14–21.

**For AI assistants.** Give the AI this whole file plus the relevant corpus files, then one ticket ID. Template:

```
You are helping a hackathon team. Context: SPEC.md (attached) and the NOVA corpus
(attached). Implement ticket M360-XXX exactly as specified in section 22, respecting
the data model (section 15), locator format (15.3) and guardrails (section 4).
Output: the files to create/modify, complete code, and how to test the acceptance
criteria. Do not invent NOVA facts; every project fact must come from the corpus.
```

For verifying an answer:

```
Using only the attached NOVA corpus, verify draft answer QXX in SPEC.md section 7.
For each claim: confirm or correct it, and give the exact locator (file + line /
page / cell / passage / screenshot region) and a verbatim French quote.
Flag anything that is a proposal presented as a decision, a delivery presented as
a validation, or a missing fact presented as known. Reference date: 2026-09-30 09:00
Montréal (UTC−04:00).
```

**Status of the content.** Sections 7–12 were drafted with AI-assisted analysis of the full corpus (all 64 files, including all 8 screenshots and every spreadsheet cell). They are a strong starting point, **not** a final deliverable: a human must check every locator against the source before it is published (tickets M360-101 to M360-110).

---

## 1. TL;DR

- **The task.** Take over NOVA, a fictional IT project whose information is scattered across 64 files (emails, meetings, tickets, screenshots, plans, contracts, invoices, ADRs, Teams chats, archives). Build an **operational memory**: someone else must be able to understand the project status, find evidence, and prepare next actions.
- **Reference date.** The dossier represents **September 30, 2026, 09:00 Montréal (UTC−04:00)**. Answer as of that date, not today.
- **Twist.** New information arrives **live during the final presentation**, as an uploaded file in any format from the corpus. We must show what changed, which items are affected, and which actions follow, **without deleting the baseline**.
- **Score.** 100 pts, human jury. **50 pts = ten factual answers** (0/3/5 each). 50 pts = five practical criteria (0/5/10 each). Accuracy and evidence beat technology.
- **But UI matters to the sponsor.** Verbal feedback at the booth: they expect a visually strong product and a live demo plus PowerPoint at the same time. The sponsor's vision image (`Image-defi-2.png`) shows the dashboard they imagine (section 19).
- **Our product: Mémoire 360.** A web app with: overview dashboard, one-page brief, the ten answers with clickable evidence, timeline, decisions, contradictions, actions, risks, a source explorer that opens any file at the exact locator, a grounded chat (natural language, cited answers), and a live **"Add new information"** upload that produces a versioned update.
- **Repo name:** `memoire-360-nova` (public GitHub). Product name: **Mémoire 360** (EN: Memory 360).
- **Stack:** Next.js + TypeScript + Tailwind + shadcn/ui (+ free 21st.dev components), JSON knowledge base in the repo, any LLM with vision via a provider-agnostic adapter. No vector DB needed: the whole corpus is about 38,000 characters of text plus 8 screenshots, so it fits in one LLM context.
- **Non-negotiables:** every claim cited with file + precise locator; proposals ≠ decisions; delivered ≠ validated; missing info marked "to be confirmed" (TBC), never invented; baseline never overwritten.

---

## 2. Event logistics and sponsor clarifications

| Item | Value |
|---|---|
| Event | CodeML 2026 (PolyAI · Polytechnique Montréal), bilingual EN/FR |
| Challenge | Loto-Québec — Challenge 2: Projet 360 / NOVA |
| Deadline | **Oct 4, 2026, 11:00 AM EDT**. No late submissions. Internal freeze 10:00 |
| Devpost | codeml-31598.devpost.com → My projects → one project for this challenge |
| Devpost challenge field | Additional info → Sponsor / Special Prizes → **Loto-Québec - Projet 360** (required even though the field looks optional) |
| Team name | **Exactly** the team name shown in HxBuddy (hxbuddy.ca → TEAM). Same members on Devpost |
| Repo | Must be **public**. Optional: upload a ZIP of the repo on Devpost as backup |
| Video | Optional demo video < 2 min |
| Jury access | Jury must open our work and find evidence **without a paid subscription**. Provide a standalone export |
| Language | Deliverables in English; French accepted. Keep corpus quotes in original French |

### 2.1 Sponsor clarifications (verbal, booth, Oct 3)

1. Everything needed is in the package. During the presentation, expect **questions about how the software operates** and **file uploads in all formats mentioned in the instructions** (corpus formats: .eml with attachments, .txt, .md, .pdf, .xlsx, .csv, .png; the sponsor image also mentions Word documents, so support .docx too).
2. No time limit specified for integrating the live information. Come ready to **demo the product and show a PowerPoint at the same time**.
3. **Follow the instructions to the letter.** This means satisfying both `README.txt` (deliverables, questions, rubric) and `consignes.pdf` (nine capabilities, including natural-language querying with sources).
4. **UI is very important to them.** Even though README says a nice interface earns no extra points, the sponsor expects real visual effort. Suggested resource: 21st.dev.
5. English deliverables, French allowed (bilingual hackathon).

### 2.2 Instruction sources (and how they differ)

| Source | Says | Implication |
|---|---|---|
| `README.txt` (in corpus) | 5 deliverables, 10 questions, rubric with exact checks, reading rules. Chatbot optional | **Primary grading reference.** Follow literally |
| `consignes.pdf` (package root) | 9 capabilities incl. #7 natural-language querying and #8 source-justified answers. New event arrives **during the final presentation**. Bonus: multi-project comparison, auto executive briefing | Build the chat. Plan for live update. Bonus is optional |
| HxBuddy pages | Same as README; jury needs no paid subscription; select exactly one prize | Submission rules |
| `Image-defi-2.png` (package root) | Sponsor's vision: "Le cerveau du projet" dashboard with sidebar, NL question bar, timeline, documents and sources, next actions | **UI blueprint** (section 19) |

The nine capabilities from `consignes.pdf`, all of which we cover:
1. Understand and organize the information → ingestion + source registry
2. Link documents, messages and events to topics → entity tags (tickets, CRs, invoices, people, conditions)
3. Identify decisions, owners, commitments, deadlines, risks → registers (sections 9, 11)
4. Reconstruct the project's evolution over time → timeline (section 8)
5. Distinguish historical from currently valid information → authority + "superseded" flags
6. Identify contradictory, missing or problematic information → contradictions register (section 10) + TBC fields
7. Natural-language querying → chat (section 17)
8. Justify answers with sources → citation chips + verifier
9. Propose relevant next actions → actions register + update engine

---

## 3. Scoring rubric → what we build

Total 100. HxBuddy computes no score; the jury grades.

### 3.1 Ten factual answers — 50 pts
Each answer: 0, 3 or 5 for **accuracy and nuance**. Nuance is what separates 3 from 5 (e.g. "approved 22 Oct" = 3; "approved 22 Oct by the steering committee on 10 Sept, conditional on three go-live conditions, not a guaranteed go" = 5).

### 3.2 Practical criteria — 5 × 10 pts (two observable checks × 5 pts)

| Criterion | Check A (5 pts) | Check B (5 pts) | Where we satisfy it |
|---|---|---|---|
| **Evidence & navigation** | At least 3 answers with a file and a locator the jury can find | At least 2 of those answers cross **distinct** sources | Every answer has ≥2 independent sources; evidence drawer opens source at locator |
| **Timeline & contradictions** | Distinguish proposal, decision and validation with dates/sources | Explain ≥2 contradictions by **authority or date of facts**, **one in a plan or risk register** | Timeline with lifecycle tags; contradictions C1 (plan v3) and C2 (risk register) |
| **Brief & actions** | Cover the 5 themes in **one page** | Link the **3 launch conditions** to actions, owners, and due dates (known or TBC) | Brief page with print CSS; actions A1–A5 |
| **Usage** | Jury can open the deliverable and find a piece of evidence | Team shows its search and states limits during the follow-up question | Static `/docs` export + deployed app + guide page; rehearse the "show your search" moment |
| **Update after event** | Distinguish **problem status**, **prior decision**, and **new proposal** | Keep baseline; produce sourced impacts/actions **without inventing approval or closing other conditions** | Update engine with 3-column output + guardrail checks |

The five themes of the brief: **owner; approved date and conditions; scope; budget; invoice status and priorities** (README lists: responsable, date approuvée et conditions, portée, budget, situation des factures et priorités).

---

## 4. Rules of reading (guardrails)

Translated from README.txt and HxBuddy Rules. **Breaking any of these costs points.** These rules are also embedded in every LLM prompt (section 21).

1. **Reference date** is 2026-09-30 09:00 Montréal (UTC−04:00). Anything after is unknown at baseline.
2. **NOVA facts come only from the corpus.** External research can help with tools, never with project facts.
3. **Assess content and authority.** A recent file timestamp does not guarantee accurate information (the 29 Sept risk register contains a stale row; the 12 Sept plan contains a stale date).
4. **Attachments and screenshots are sources.** A standalone copy of an attachment is **not** independent confirmation (5 PDFs exist both as email attachments and as standalone files; one email exists twice).
5. **An announced fix is not an accepted fix. A proposal is not a decision.** Distinguish proposal, decision, delivery and validation.
6. **A historical screenshot does not prove a defect is still open** (5 of the 8 screenshots show defects that are now closed).
7. **If information is missing, say so.** Never invent a decision, deadline or approval. Separate **our team's recommendations** from **documented commitments**.
8. **Money:** compare in CAD before tax. Distinguish **authorized**, **invoiced** and **paid**. No tax calculation.
9. **Preserve the baseline and history** when updating.
10. Some sources are old, incomplete, contradictory or useless (archives folder contains distractors).

---

## 5. Product definition

**Name.** Mémoire 360 (Memory 360). Tagline: *"Take over a project in 10 minutes, with proof."*

**Primary user.** A person taking over NOVA tomorrow morning (the README's "another person"). Secondary: the jury, who must find evidence quickly.

**Core jobs.**
1. "Where does the project stand right now?" → Overview + Brief.
2. "Prove it." → Every statement has an evidence chip that opens the source at the exact line/page/cell/screenshot.
3. "What do I do next?" → Actions linked to go-live conditions, with owners and due dates or TBC.
4. "Something new just came in. What changes?" → Upload → versioned update with impacts.
5. "Let me ask in my own words." → Grounded chat, answers cite sources, says "not documented" when appropriate.

**Out of scope (do not spend time):** multi-project comparison (bonus), user accounts/auth, real-time collaboration, vector databases, fine-tuning.

**Design principle.** Evidence-first: the signature UI element is the **evidence chip** (e.g. `M04 · L17–23`) that opens a side drawer with the source and the passage highlighted. Status colors encode the **lifecycle** (proposed / decided / delivered / validated / open / TBC), which is exactly what the rubric grades.

---

## 6. Corpus map (all 64 files, classified)

**Package layout.** `loto-quebec-nova-participants.zip` contains `manifest.json`, `consignes.pdf` (instructions), `Image-defi-2.png` (sponsor vision image) and `NOVA_ETUDIANTS.zip`. The inner ZIP contains `Projet360_NOVA_ETUDIANTS/` with **64 files** (start with `README.txt` and `MANIFEST.csv`). Commit the corpus **unchanged** under `corpus/` in the repo.

**Authority classes** (used for conflict resolution, section 15.4):
`DECISION` (committee transcript/minutes, ADR, decision doc, approved CR, contract) ·
`VALIDATION` (owner validates/closes a ticket) ·
`OFFICIAL` (PM announcement, charter, transition note) ·
`VENDOR_CLAIM` (Boréal says something is done) ·
`REPORT` (status report, plan, risk register: secondary, may be stale) ·
`DRAFT` (unapproved CR, draft communication) ·
`INFORMAL` (Teams chat) · `UNOFFICIAL` (personal notes) · `UNRELATED` (other project, noise) ·
`DUPLICATE` (copy of another file; not independent).

**Roles:** `CORE` (needed for answers) · `CONTEXT` · `TRAP` (misleading if read naively) · `NOISE`.

### 6.1 `01_Courriels/` (12 emails; 5 contain PDF attachments)

| ID | Date (content) | From → To | Summary | Authority | Role | Used for |
|---|---|---|---|---|---|---|
| E01 | 2026-07-07 16:10 | Élodie Caron → équipe | Confirms kickoff; charter references: budget 180 000 $, target 15 Oct, she is PM | OFFICIAL | CONTEXT (superseded on date and PM) | Q04, timeline |
| E02 | 2026-07-22 14:32 | Sophie Lambert → Élodie, Marc | Sees East US on attached arch v1; wants production data in Canada; to decide next day | OFFICIAL (requirement) | CORE | Q07. **Attachment = `Architecture_NOVA_v1.pdf` (identical file)** |
| E03 | 2026-08-26 09:05 | Julien Moreau (Boréal) → Marc, Élodie | Migration to Canada Central completed; v2 attached; deploy + connectivity test previous evening, no blocker | VENDOR_CLAIM | CORE | Q07. **Attachment = `Architecture_NOVA_v2.pdf` (identical)** |
| E04 | 2026-08-20 15:44 | Julien → Mélissa | Labels and contrast fixes pushed; "Tout devrait maintenant être conforme de notre côté". Quotes Mélissa (12 Aug) wanting a keyboard pass on modals | VENDOR_CLAIM | TRAP | Q09, contradiction C5 |
| E05 | 2026-09-08 11:16 | Julien → Élodie, Nicolas | Connector problem cost time; 15 Oct possible with little margin; **recommends 22 Oct**; "il s'agit d'une proposition… À vous de confirmer la décision de gouvernance" | VENDOR_CLAIM (PROPOSAL) | CORE | Q02, Q03 |
| E06 | 2026-09-16 08:35 | Élodie → équipe | Nicolas Perron officially takes over NOVA as of today, 16 Sept | OFFICIAL | CORE | Q04 |
| E07 | 2026-09-23 10:18 | Amélie Fortin (Finances) → Nicolas | Validating INV-003; 18 000 $ line "Optimisation interface mobile - CR-04"; asks for approval; finds only a draft | OFFICIAL (finance control) | CORE | Q06. **Attachment = `INV-003.pdf` (identical)** |
| E08 | 2026-09-19 10:20 | Julien → Sophie, Nicolas | SEC-210 fix deployed in validation; automated tests pass; "pour nous, le problème est corrigé"; Sophie can retest | VENDOR_CLAIM (DELIVERY) | CORE / TRAP | Q08 |
| E09 | 2026-09-27 17:02 | Nicolas → équipe | Approved target remains 22 Oct; **conditional** on security, accessibility, operations readiness; do not communicate 22 as a guaranteed go | OFFICIAL | CORE | Q01, Q10 |
| E10 | 2026-09-24 13:42 | Nicolas → Julien, Amélie | CR-04 advanced mobile not in approved phase 1; deferred to phase 2; no CR-04 spending/invoicing without new approval | OFFICIAL (decision) | CORE | Q05, Q06. **Attachment = `CR-04_Optimisation_mobile_BROUILLON.pdf` (identical)** |
| E11 | 2026-09-21 16:28 | Alex Deschamps → Nicolas | Draft status message: "NOVA est au vert. La sécurité et l'accessibilité sont complétées…", based on status report | DRAFT | TRAP | Contradiction C3. **Attachment = `Rapport_Statut_21sept.pdf` (identical)** |
| E12 | 2026-09-17 16:22 | Marc Gervais → Nicolas, Julien | Connector scenarios replayed after fix, 120/120 OK; **INT-101 closed**; schedule-risk cause considered resolved | VALIDATION | CORE | Q02 |

### 6.2 `02_Reunions/` (meeting minutes and transcripts; cite by line number)

| ID | Date | Type | Key content (line refs) | Authority | Role |
|---|---|---|---|---|---|
| M01 | 2026-07-07 | Kickoff minutes | L9 Élodie PM; L10 budget max 180 000 $ CAD; L11 target 15 Oct; L12 phase-1 scope; L20 advanced mobile not discussed as a distinct deliverable | DECISION | CORE (baseline) |
| M02 | 2026-07-23 09:00–09:47 | Architecture workshop transcript | L9 v1 = East US; L11 Sophie: prod data must stay in Canada; L13–17 decision Canada Central, v1 obsolete for data location; L19 SSO only in prod; L28–29 admin audit logging requested; L21–23 room 18B = noise | DECISION | CORE |
| M03 | 2026-08-27 | Committee minutes | L5 migration to Canada Central declared done by Boréal **and verified by architecture team**; L7 accessibility anomalies partly fixed; L8 connector watched, no delay approved; L11 Mélissa validated labels/contrast 15 and 20 Aug, wants 2nd keyboard pass on modals; Sophie: admin logging to verify in real conditions; Camille: duplicates to investigate; L13 Boréal to deliver stabilization build early Sept | DECISION | CORE |
| M04 | 2026-09-10 15:00–15:42 | Steering committee transcript | L6 Julien recommends 15→22 Oct; L9 Marc: connector is the critical path; L10 Sophie: won't compress security tests; L12 Olivier wants final runbook days before; L13 Camille: DATA-401 closed; L15 Élodie: no penalty, contract runs to end Oct; **L17 decision formulated; L18–22 no objection; L23 "Donc approuvé"**; L24 Nicolas: 22 not an automatic go; L31 mobile ≈ 18 000 $; L33 no approval today; L35 "Mobile : aucune décision de dépense"; L27–29 noise | DECISION | CORE |
| M05 | 2026-09-18 | Delivery follow-up minutes | L6 INT-101 validated and closed 17 Sept; L7 DATA-401 validated; L8 PERF-501 under 1 s; L9 SEC-210 fix in preparation, security validation still required; L10 ACC-301/302 closed, modal keyboard scenario to verify; L11 runbook not final; L13 22 Oct remains approved date, criteria still apply | DECISION | CORE |
| M06 | 2026-09-26 10:00–10:34 | Steering committee transcript | L6 Julien: build stable, audit fix delivered on 19th; **L7 Sophie: fix delivered ≠ SEC-210 security acceptance**; L9 ACC-303 still open, blocker; L10 runbook incomplete, missing rollback, no ops go; **L11 Nicolas: three conditions; L12–14 confirmed**; L15 Julien targets ACC-303 fix next build, will chase ops team; L16 22 Oct conditional on three items; L22–25 mobile: looking OK, invoicing CR-04 no; L18–21 HDMI cable = noise | DECISION | CORE |

### 6.3 `03_Tickets/` (8 tickets, 8 screenshots, 1 log, 1 CSV)

| ID | Created | Status @ baseline | Summary | Screenshot / attachment (what it shows) | Role |
|---|---|---|---|---|---|
| ACC-301 | 11 Aug | **Fermé** | Name field had placeholder only, no `<label>`; fixed 14 Aug; validated NVDA + VoiceOver 15 Aug (Mélissa) | `ACC-301_labels.png`: form with placeholder only (**historical**) | TRAP (closed) |
| ACC-302 | 12 Aug | **Fermé** | Contrast 2,1:1 → fixed 18 Aug → re-test 5,3:1 OK 20 Aug | `ACC-302_contraste.png`: low-contrast status badge, Build 2026.08.12 (**historical**) | TRAP (closed) |
| ACC-303 | 17 Sept | **OUVERT** (Haute) | Modal focus trap: Tab cycles Nom ↔ Commentaire, **Enregistrer never reached**; Boréal reproduced 18 Sept (incomplete focusable list); 26 Sept 11:03 still open, fix announced for next build | `ACC-303_focus.png`: Build 2026.09.17, "Le focus clavier ne rejoint pas ce bouton" | CORE (Q09, Q10) |
| DATA-401 | 2 Sept | **Fermé** | Migration duplicates (8401/8402 same requester, 1 s apart); idempotence used message ID instead of business ID; fix: key on `external_request_id`; 9 Sept replay 15 000 events, 0 duplicates | `DATA-401_doublons.png` (historical) + `DATA-401_echantillon.csv` (3 rows; small CSV is evidence, not an answer key) | TRAP (closed) |
| INT-101 | 5 Sept | **Fermé** | Connector: all searches by number empty in INT; 401 on internal service, token expired after secret change; 8 Sept intermittent errors put 15 Oct at risk; 17 Sept fix deployed, 120/120 OK; Marc validated and closed 17 Sept 16:10. Resolution: secret rotation + token-renewal logic fix | `INT-101_aucun_resultat.png` (historical "Aucun résultat"); `INT-101_extrait_logs.txt` (L1 401 at 2026-09-05T11:15:03Z; L2 token exp 2026-09-04T23:00Z, refresh_attempt=false; L3 200 OK 187 ms at 2026-09-17T14:20:11Z). **Log times are UTC (Z)** | CORE (Q02) |
| OPS-601 | 25 Sept | **OUVERT** (Haute) | Runbook not ready; 25 Sept Olivier: at minimum rollback missing, screenshot shows another step to complete, must be executable by someone else; 26 Sept Nicolas: part of go-live conditions; **29 Sept Olivier: final version still not received** | `OPS-601_runbook.png` "Version du 25 septembre": 1 Vérifier la santé des services OK; 2 Activer le mode maintenance OK; 3 Déployer la version approuvée OK; **4 Procédure de retour arrière TODO; 5 Validation fonctionnelle post-déploiement À compléter** | CORE (Q10) |
| PERF-501 | 3 Sept | **Fermé** | Slow case search: full scan without status filter (6–8 s); index added 6 Sept; 7 Sept avg 620 ms on 50 tries | `PERF-501_lenteur.png`: LCP 7,8 s, API 6,9 s (**historical**) | TRAP (closed) |
| SEC-210 | 12 Sept | **EN VALIDATION** (Bloquante avant production) | Admin CSV export logged with user + timestamp but **object (case ID) and result missing** (incomplete logging, not a missing line). 19 Sept 10:22 Boréal: fix deployed in validation; 19 Sept 14:05 Sophie: must retest, do not close before security validation; **26 Sept 15:40 Sophie: retest planned, status kept EN VALIDATION** | `SEC-210_audit.png`: validation env, EXPORT_CSV at 14:04:08 with Objet "---" and Résultat "---"; QA note | CORE (Q08) |

Ticket text files: cite by line number (e.g. `03_Tickets/SEC-210.txt#L23-L25`).

### 6.4 `04_Documents_projet/`

| ID | Date | Summary | Authority | Role |
|---|---|---|---|---|
| Charte_Projet_NOVA_v1.txt | 7 Jul | L4 PM Élodie; L5 vendor Boréal Numérique; L6 budget 180 000 $ CAD; L7 target 15 Oct; L13–18 phase-1 scope; **L20 "n'est pas mise à jour automatiquement après chaque décision de comité"** | OFFICIAL (baseline) | CONTEXT |
| Note_transition_Elodie_16sept.txt | 16 Sept | L4 Nicolas takes over; L7 update the date in all plans (committee approved 22 Oct); L8 advanced mobile not approved; L9 follow connector to formal closure; L10 get security and ops go before production | OFFICIAL | CORE |
| Plan_Projet_NOVA_v2.xlsx | undated | Sheet "Plan projet" A1:G7; P-06 Mise en production E7/F7 = 2026-10-15, D7 Élodie Caron, G7 "Cible initiale" | REPORT | CONTEXT (superseded) |
| Plan_Projet_NOVA_v3_12sept.xlsx | 12 Sept | **Same sheet; P-06 E7/F7 = 2026-10-15 (stale!), D7 Nicolas Perron, G7 "Cible de planification"**. P-04 Tests intégrés (Mélissa) to 2026-10-05; P-05 Préparation exploitation (Olivier) 2026-09-28→2026-10-10 | REPORT | **TRAP (contradiction C1)** |
| Rapport_Statut_21sept.pdf | 21 Sept | p.1: Échéancier VERT (22 Oct); Budget VERT; **Sécurité VERT "Correctif SEC-210 livré"; Accessibilité VERT "Correctifs appliqués"**; Exploitation JAUNE; management note: prepared before last detailed verification of some tickets | REPORT | **TRAP (C3)** |
| Registre_Risques_29sept.xlsx | 29 Sept | Sheet "Risques" A1:H6. **R-01 connector delay, owner Marc, F2 "Ouvert", H2 "Suivi au 9 septembre 2026" (stale)**; R-02 security validation incomplete (Sophie, Open, re-test SEC-210 before go-live); R-03 ops readiness (Olivier, Open, finalize runbook + rollback); R-04 accessibility (Mélissa, Open, close ACC-303, impact "Moyen"); R-05 data migration (Camille, Fermé) | REPORT | **TRAP (C2)** + CORE for R-02..R-04 |

### 6.5 `05_Contrats_et_finances/` (all 1-page PDFs; cite `#page=1` + passage)

| ID | Summary | Authority | Role |
|---|---|---|---|
| CONTRAT_Boreal_NOVA.pdf | Client Organisation Démo; vendor Boréal Numérique Inc.; phase 1; **Montant maximal initial 180 000 $ CAD**; period **7 July to 31 Oct 2026**; scope: SSO, request creation/tracking, attachments, workflow, dashboard, standard reports; **change management: out-of-scope work requires a written, approved change request before execution and invoicing** | DECISION | CORE (Q05, Q06) |
| CR-01_Rapports_avances_APPROUVE.pdf | Advanced reports + summary export; **24 000 $; APPROUVÉE; 14 Aug 2026; authority: Comité de projet**; no target-date change | DECISION | CORE (Q05) |
| CR-04_Optimisation_mobile_BROUILLON.pdf | Advanced mobile UX (< 768 px); **estimate 18 000 $; BROUILLON - APPROBATION REQUISE**; requested 4 Sept 2026 by Boréal; no approval number or committee signature | DRAFT | CORE (Q05, Q06) |
| INV-001.pdf | 2026-07-31; Développement phase 1 - acompte **60 000 $; Payée** | OFFICIAL | CORE |
| INV-002.pdf | 2026-08-31; jalon 2 48 000 $ + Rapports avancés CR-01 24 000 $ = **72 000 $; Payée** | OFFICIAL | CORE |
| INV-003.pdf | 2026-09-22; jalon 3 36 000 $ + **Optimisation interface mobile - CR-04 18 000 $** = **54 000 $; En validation** | OFFICIAL | CORE (Q06) |

### 6.6 `06_Architecture_et_decisions/`

| ID | Summary | Authority | Role |
|---|---|---|---|
| ADR-007_Localisation_donnees.md | Decision date 23 Jul 2026, **Statut: Acceptée**; production in **Canada Central**; v1 replaced on this point; consequences: Boréal migrates, architecture publishes updated diagram, **technical validation must confirm migration before production tests** | DECISION | CORE (Q07) |
| Architecture_NOVA_v1.pdf | 18 Jul 2026; prepared before data-location decision; Données **East US** | REPORT (superseded) | TRAP |
| Architecture_NOVA_v2.pdf | 25 Aug 2026; revised after ADR-007; Données **Canada Central** | REPORT | CORE (Q07) |
| Decision_Portee_Phase2.md | 24 Sept 2026: CR-04 advanced mobile optimizations **deferred to phase 2**; phase 1 must remain usable on mobile; no additional CR-04 spending without new approval | DECISION | CORE (Q05, Q06) |

### 6.7 `07_Conversations_Teams/` (cite by line)

| ID | Summary | Authority | Role |
|---|---|---|---|
| Teams_15sept_ProjetNOVA.txt | L4 Alex: still 15 Oct?; **L5 Nicolas: no, committee approved 22 Oct on 10 Sept; project plan obviously not corrected yet** | INFORMAL | CORE (Q03 corroboration, C1) |
| Teams_16sept_Transition.txt | L4 Élodie: Nicolas officially takes over today; L5 Nicolas also takes over the Friday committee | INFORMAL | CORE (Q04 corroboration) |
| Teams_19sept_Securite.txt | L4 Julien: SEC-210 "should be good", fix deployed; **L5 Sophie: ticket stays in validation until our retest; « déployé » != « accepté »** | INFORMAL | CORE (Q08) |
| Teams_22sept_Mobile.txt | L4 Julien thought advanced mobile was in initial scope; **L5 Nicolas: basic compatibility yes; CR-04 18k package no, not approved** | INFORMAL | CORE (Q06, C6) |

### 6.8 `08_Archives_et_documents_connexes/` (mostly distractors)

| ID | Summary | Role |
|---|---|---|
| Courriel_archive_17sept.eml | **Byte-identical copy of E12** (INT-101 closed) | DUPLICATE (not independent confirmation) |
| INV-778_Projet_ORION.pdf | Boréal invoice 41 000 $, **project ORION**, paid; "Cette facture concerne un autre projet" | UNRELATED (exclude from NOVA totals) |
| Invitation_Formation_Excel.txt | Excel pivot-table training, 2 Oct | NOISE |
| Newsletter_Boreal_Septembre.txt | Vendor newsletter | NOISE |
| Notes_personnelles_quelquun.txt | "vérifier si 15 oct encore date? probablement", "mobile nice to have"; unofficial, unknown author | UNOFFICIAL (TRAP) |
| Plan_NOVA_preliminaire_juin.xlsx | Preliminary June plan: P-01 Cadrage, P-06 go-live 2026-10-15, "Version préliminaire" | REPORT (superseded) |

### 6.9 Root files
`README.txt` (mission, deliverables, Q01–Q10, rubric, reading rules; **FR only**) and `MANIFEST.csv` (file, extension, size in bytes; 64 rows incl. itself and README).

### 6.10 Duplicates (verified by SHA-256)
| Standalone file | Identical copy inside |
|---|---|
| 06/Architecture_NOVA_v1.pdf | E02 attachment |
| 06/Architecture_NOVA_v2.pdf | E03 attachment |
| 05/INV-003.pdf | E07 attachment |
| 05/CR-04_Optimisation_mobile_BROUILLON.pdf | E10 attachment |
| 04/Rapport_Statut_21sept.pdf | E11 attachment |
| 01/E12_Resolution_integration.eml | 08/Courriel_archive_17sept.eml |

**Rule:** when counting "distinct sources" for an answer, a file and its copy count as **one** source.

### 6.11 Things to ignore on purpose (show the jury we noticed)
Room 18B booking (M02 L21–23), cold coffee (M04 L27–29), HDMI cable (M06 L18–21), Excel training, vendor newsletter, ORION invoice, personal notes. Tag them `NOISE` in the source explorer; it demonstrates capability #5 and #6.

---

## 7. Ground truth: draft answers Q01–Q10

> **VERIFY BEFORE PUBLISHING** (tickets M360-101, M360-102). Each answer lists: final answer (EN), short answer (FR), primary evidence, corroborating evidence from a **distinct** source, traps, and confidence. Locator format is defined in section 15.3. Quotes are verbatim French from the corpus.

Questions are in French in README.txt; English translations are ours.

---

### Q01. What is the currently approved go-live date, and with what reservation?
*FR: Quelle est la date de mise en production actuellement approuvée, et avec quelle réserve?*

**Answer.** **October 22, 2026.** Approved by the NOVA steering committee on Sept 10, 2026. The reservation: the date is **conditional, not a guaranteed go**. It depends on three go-live conditions confirmed by the committee on Sept 26: (1) security validation of SEC-210, (2) closure of ACC-303, (3) approval of the runbook including rollback. As of Sept 30, 09:00, **none of the three is met**.

**FR court.** 22 octobre 2026, approuvée le 10 septembre; date conditionnelle (pas un go garanti) aux trois conditions : validation sécurité SEC-210, fermeture d'ACC-303, approbation du runbook incluant le rollback.

**Evidence.**
- Primary: `02_Reunions/M04_Transcript_Comite_direction_10sept.txt#L17-L24` — « La date cible de mise en production NOVA est déplacée du 15 octobre au **22 octobre 2026** » (L17); « Donc **approuvé**. Le 22 devient la date officielle » (L23); « le 22 n'est pas un go automatique » (L24).
- Conditions: `02_Reunions/M06_Transcript_Comite_26sept.txt#L11-L16` — « trois conditions concrètes : validation sécurité de SEC-210, fermeture de ACC-303 et approbation du runbook incluant rollback » (L11); « c'est conditionnel à ces trois éléments » (L16).
- Distinct corroboration: `01_Courriels/E09_Rappel_mise_en_production.eml` (Date 2026-09-27 17:02, body ¶1–3) — « la cible approuvée demeure le 22 octobre… conditionnelle aux validations restantes… ne pas communiquer le 22 comme un go garanti ».
- Also: `02_Reunions/M05_CR_Suivi_18sept.txt#L13`.

**Traps.** Plan v3 (12 Sept) still says 15 Oct (`Plan_Projet_NOVA_v3_12sept.xlsx#Plan projet!F7`); the charter and personal notes say 15 Oct. These are stale/low-authority (see C1). The status report shows schedule GREEN, which hides the conditions.

**Confidence:** High.

---

### Q02. Why did the date change, and what is the current state of the original cause?
*FR: Pourquoi la date a-t-elle changé, et quel est l'état actuel de la cause initiale?*

**Answer.** The date moved because of the **internal connector problem (INT-101)**: from Sept 5, searches in the integration environment returned nothing because calls to the internal service failed with **401 errors (service token expired after a secret change, no refresh)**; after the secret was replaced, intermittent errors remained (Sept 8), which put Oct 15 at risk. Boréal recommended 22 Oct to allow **connector stabilization, re-running integrated tests and a margin to fix blocking defects**; Marc confirmed the connector was the critical path (searches and synchronization). **Current state of the cause: resolved.** The fix (secret rotation + token-renewal logic) was deployed; 120/120 replayed searches succeeded; Marc validated and **closed INT-101 on Sept 17, 2026**. Nuance: resolving the cause did **not** move the date back; 22 Oct remains the approved target, now gated by the three go-live conditions. The 29 Sept risk register still lists the connector risk R-01 as open, but that row is stale (last follow-up 9 Sept).

**FR court.** Cause : problème du connecteur interne (INT-101, jetons expirés / erreurs 401 puis erreurs intermittentes). Recommandation Boréal de décaler pour stabiliser et refaire les tests. Cause résolue : INT-101 validé et fermé le 17 septembre (120/120). La date reste le 22 octobre.

**Evidence.**
- Cause/proposal: `01_Courriels/E05_Retard_integration.eml` (2026-09-08 11:16) — « Le problème du connecteur interne nous a fait perdre davantage de temps que prévu ».
- Rationale: `M04…#L6-L9` — « Stabilisation du connecteur, reprise des tests intégrés et une marge pour corriger les anomalies bloquantes » (L8); « le connecteur est le chemin critique » (L9).
- Technical cause: `03_Tickets/INT-101.txt#L14-L16`; `03_Tickets/INT-101_extrait_logs.txt#L1-L2` (401, token exp 2026-09-04T23:00Z, refresh_attempt=false).
- Resolution (distinct sources): `03_Tickets/INT-101.txt#L17-L20` (17 sept 16:10 « Validé côté intégration. Je ferme. »; résolution « rotation du secret + correction de la logique de renouvellement du jeton »); `01_Courriels/E12_Resolution_integration.eml` (2026-09-17 16:22) « INT-101 est fermé »; `M05…#L6`; logs L3 (200 OK).
- Do **not** count `08_…/Courriel_archive_17sept.eml` as extra confirmation (duplicate of E12).

**Traps.** `INT-101_aucun_resultat.png` is historical. Risk register R-01 "Ouvert" (C2). DATA-401 (duplicates) and PERF-501 (slowness) are **not** the cause: both were already closed (M04 L13; PERF-501 L16).

**Confidence:** High.

---

### Q03. Who approved the change and when? Distinguish proposal and approval.
*FR: Qui a approuvé le changement et quand? Distinguez proposition et approbation.*

**Answer.**
- **Proposal:** Julien Moreau (Boréal Numérique, vendor), by email on **Sept 8, 2026 (11:16)**, explicitly labeled as a proposal awaiting governance decision; repeated at the start of the Sept 10 committee.
- **Approval:** the **NOVA steering committee (comité de direction)** on **Sept 10, 2026 (~15:22–15:25)**. Élodie Caron, then project manager and chair, formulated the decision; Sophie Lambert, Marc Gervais and Olivier Côté raised no objection and Nicolas Perron agreed; Élodie declared it approved and official. The vendor did not approve its own proposal.
- The approval covers the **target date**, not the go-live itself (Nicolas, L24).

**FR court.** Proposition : Julien Moreau (Boréal), courriel du 8 septembre 2026. Approbation : comité de direction NOVA, 10 septembre 2026 vers 15 h 25, décision formulée par Élodie Caron (chargée de projet), sans objection de Sophie, Marc, Olivier; accord de Nicolas.

**Evidence.**
- Proposal: `E05` — « Notre recommandation est de déplacer la mise en production au **22 octobre**. À ce stade, il s'agit d'une proposition de notre part. À vous de confirmer la décision de gouvernance. »; `M04#L6`.
- Approval: `M04#L17-L23` (formulation L17, silence/objections L18–L22, « Donc **approuvé** » L23).
- Distinct corroboration: `07_Conversations_Teams/Teams_15sept_ProjetNOVA.txt#L5` — « le comité a approuvé le 22 octobre le 10 septembre »; `04_Documents_projet/Note_transition_Elodie_16sept.txt#L7` — « (le comité a approuvé le 22 octobre) ».

**Traps.** Saying "Nicolas approved it" (he was not yet PM; he agreed as a member). Saying "Boréal changed the date". Plan v3 dated 12 Sept (after approval) still shows 15 Oct.

**Confidence:** High.

---

### Q04. Who is responsible for the project and since when?
*FR: Qui est responsable du projet et depuis quand?*

**Answer.** **Nicolas Perron**, project manager (chargé de projet) **officially since Sept 16, 2026**. He also took over the Friday committee. Before that, **Élodie Caron** was project manager from kickoff (July 7, 2026); she stayed available a few days for the handover.

**FR court.** Nicolas Perron, chargé de projet officiellement depuis le 16 septembre 2026 (succède à Élodie Caron, chargée de projet depuis le 7 juillet).

**Evidence.**
- Primary: `01_Courriels/E06_Transition_charge_projet.eml` (2026-09-16 08:35) — « Nicolas Perron prend officiellement la charge du projet NOVA à compter d'aujourd'hui, 16 septembre ».
- Distinct: `04_Documents_projet/Note_transition_Elodie_16sept.txt#L4`; `07_Conversations_Teams/Teams_16sept_Transition.txt#L4-L5`.
- History: `Charte_Projet_NOVA_v1.txt#L4`; `M01#L9`; `E01`.

**Traps.** Charter still names Élodie (not auto-updated, L20). Plan v3 (12 Sept) already lists Nicolas as owner of P-06 (`#Plan projet!D7`), four days **before** the official transition: a planning anticipation, not the official handover date.

**Confidence:** High.

---

### Q05. What is the authorized contract amount and how is it calculated?
*FR: Quel est le montant contractuel autorisé et comment se calcule-t-il?*

**Answer.** **204 000 $ CAD, before tax** = **180 000 $** initial maximum contract amount + **24 000 $** for change request **CR-01** (advanced reports), approved by the project committee on **Aug 14, 2026**. **CR-04 (18 000 $, advanced mobile) is NOT included**: it is only a draft requiring approval, and it was deferred to phase 2 on Sept 24.

Context (authorized vs invoiced vs paid):

| | Amount (CAD, before tax) |
|---|---|
| Authorized | 204 000 $ (180 000 $ + CR-01 24 000 $) |
| Invoiced | 186 000 $ as received (INV-001 60 000 + INV-002 72 000 + INV-003 54 000), of which **18 000 $ is not authorized** (CR-04 line) → 168 000 $ invoiced within authorization |
| Paid | 132 000 $ (INV-001 + INV-002); INV-003 is "En validation" (not paid) |
| Remaining authorized after valid invoices | 36 000 $ (204 000 − 168 000) |

Exclude INV-778 (41 000 $, project ORION).

**FR court.** 204 000 $ CAD hors taxes = 180 000 $ (montant maximal initial du contrat) + 24 000 $ (CR-01 approuvée le 14 août 2026). CR-04 (18 000 $) n'est qu'un brouillon non approuvé et n'est pas incluse.

**Evidence.**
- `05_…/CONTRAT_Boreal_NOVA.pdf#page=1` — « Montant maximal initial 180 000 $ », Devise CAD; change-management clause.
- `05_…/CR-01_Rapports_avances_APPROUVE.pdf#page=1` — 24 000 $, APPROUVÉE, 14 août 2026, Comité de projet.
- Exclusion: `05_…/CR-04_Optimisation_mobile_BROUILLON.pdf#page=1` (BROUILLON - APPROBATION REQUISE); `06_…/Decision_Portee_Phase2.md#L4-L6`; `M04#L33-L35`.
- Invoices: INV-001/002/003 `#page=1`.

**Traps.** Answering 180 000 $ (forgets CR-01). Answering 222 000 $ (adds CR-04). Mixing invoiced (186 000 $) or paid (132 000 $) with authorized. Including ORION.

**Confidence:** High (the calculation is explicit in the documents; the "remaining" line is our computation).

---

### Q06. What problem does INV-003 present? State the amount concerned and the treatment to plan.
*FR: Quel problème présente INV-003? Précisez le montant concerné et le traitement à prévoir.*

**Answer.** INV-003 (Sept 22, 2026; total 54 000 $; status "En validation") contains a line **"Optimisation interface mobile - CR-04" for 18 000 $**. CR-04 is **only a draft, never approved**; the Sept 10 committee made no spending decision; on Sept 24 the advanced mobile work was **deferred to phase 2** with no CR-04 spending or invoicing without new approval. The contract requires a written, approved change request **before execution and invoicing**. So the **18 000 $ is not payable**.
**Treatment:** do not approve/pay the CR-04 line; ask Boréal for a **corrected invoice or credit note** removing it; process the **36 000 $ milestone-3 line** through the normal validation path (its own approval is not documented in the corpus, so it stays TBC); confirm in writing to Boréal that CR-04 work must not be billed (already stated by Nicolas on Sept 24 and 26). Owners: **Amélie Fortin (Finances)** for the invoice, **Nicolas Perron** for the scope position. Due date: **not documented (TBC)**.

**FR court.** INV-003 facture 18 000 $ pour CR-04 (optimisation mobile), un brouillon jamais approuvé et reporté à la phase 2. Ne pas payer cette ligne; demander une facture corrigée ou une note de crédit; traiter séparément le jalon 3 (36 000 $).

**Evidence.**
- `05_…/INV-003.pdf#page=1` (lines and total; status En validation).
- Distinct: `01_Courriels/E07_Facture_003_question.eml` (2026-09-23 10:18) — Amélie: « Je trouve un brouillon de CR-04, mais rien qui indique qu'il a été approuvé »; `01_Courriels/E10_Fonction_mobile.eml` (2026-09-24 13:42) — « Aucune dépense liée à CR-04 ne doit être engagée ou facturée sans nouvelle approbation »; `M06#L23` — « Facturer du CR-04, non. Il n'est pas approuvé. »; `Teams_22sept_Mobile.txt#L5`; `CONTRAT…#page=1` (Gestion des changements).
- E07's attachment is the same INV-003 file (not independent).

**Traps.** Saying the whole invoice is invalid. Saying INV-003 is paid. Forgetting the contract clause. Note Julien said Boréal "already started looking at some adjustments" (M06 L22): risk of unapproved work being done.

**Confidence:** High on problem and amount. Treatment = our recommendation grounded in documented rules (label as recommendation).

---

### Q07. Where must production data be hosted? What evidence confirms the implementation?
*FR: Où les données de production doivent-elles être hébergées? Quelle preuve confirme la mise en œuvre?*

**Answer.** In **Canada, region Canada Central**. Decided at the architecture workshop on **July 23, 2026** and recorded in **ADR-007 (status: accepted)**, after Sophie Lambert (security) required production data to remain in Canada; architecture v1 (East US) is obsolete on this point. **Implementation evidence:** Boréal reported the migration to Canada Central as completed on **Aug 26** (deployment and connectivity test, no blocker) with **architecture v2 (Aug 25)** showing data in Canada Central; the **Aug 27 committee** recorded the migration as declared complete by Boréal **and verified by the architecture team** (the independent validation ADR-007 required). Plans list Architecture as "Terminé". Limit: production is not live yet, so this proves the provisioned/target environment, not live production data.

**FR court.** Au Canada, région Canada Central (ADR-007 acceptée, 23 juillet 2026). Preuve : migration déclarée complétée par Boréal (26 août, schéma v2) et vérifiée par l'équipe architecture (comité du 27 août).

**Evidence.**
- Requirement/decision: `E02` (2026-07-22) « je veux que les données de production demeurent au Canada »; `M02#L11-L17`; `06_…/ADR-007_Localisation_donnees.md#L3-L4,L10`.
- Implementation: `E03` (2026-08-26) « La migration des ressources prévues pour NOVA vers Canada Central est complétée »; `06_…/Architecture_NOVA_v2.pdf#page=1` (Données Canada Central).
- Independent verification (distinct source, strongest): `02_Reunions/M03_CR_Comite_27aout.txt#L5` — « déclarée terminée par Boréal et vérifiée par l'équipe architecture ».

**Traps.** Citing v1 (East US). Counting the E03 attachment and the standalone v2 as two sources. Treating the vendor email alone as proof.

**Confidence:** High.

---

### Q08. Is security accepted? Distinguish delivery and validation.
*FR: La sécurité est-elle acceptée? Distinguez livraison et validation.*

**Answer.** **No.** SEC-210 (admin CSV export logged without the case ID and result; priority "blocking before production") was **delivered**: Boréal deployed a fix to the validation environment on **Sept 19** and considers it fixed. It is **not validated**: the security team (Sophie Lambert) must re-run its own scenario; on **Sept 26** the retest was planned and the status kept **EN VALIDATION**; Sophie stated at the Sept 26 committee that security acceptance has not been given. Security validation of SEC-210 is go-live condition #1. Retest date: **not documented (TBC)**.

**FR court.** Non. Correctif SEC-210 livré par Boréal le 19 septembre (livraison), mais non validé par la sécurité : statut EN VALIDATION, re-test planifié (date non documentée). C'est une condition de go-live.

**Evidence.**
- Delivery: `01_Courriels/E08_Correctif_journalisation.eml` (2026-09-19 10:20); `03_Tickets/SEC-210.txt#L23`.
- Not validated: `SEC-210.txt#L6,L24-L25`; `M06#L7` — « Vous avez livré un fix. Nous n'avons pas encore donné l'acceptation sécurité de SEC-210. »; `Teams_19sept_Securite.txt#L5` — « « déployé » != « accepté » ».
- Defect detail: `SEC-210.txt#L17-L18`; `SEC-210_audit.png` (EXPORT_CSV row 14:04:08, Objet "---", Résultat "---").

**Traps.** Status report "Sécurité VERT — Correctif SEC-210 livré" (C3) and Alex's draft "sécurité complétée" (E11). The screenshot shows the original defect; it does not prove the fix failed.

**Confidence:** High.

---

### Q09. Is accessibility completed? Identify what remains to fix.
*FR: L'accessibilité est-elle complétée? Identifiez ce qui reste à corriger.*

**Answer.** **No.** Labels (**ACC-301**, closed and validated with NVDA and VoiceOver on Aug 15) and contrast (**ACC-302**, 2.1:1 → 5.3:1, closed Aug 20) are done. **ACC-303 remains OPEN (high priority)**: in the edit modal, keyboard focus cycles between the "Nom" and "Commentaire" fields and **the "Enregistrer" (Save) button can never be reached with Tab** (reproduced on Chrome and Edge; cause: the modal component traps focus with an incomplete list of focusable elements). Boréal announced a fix for the **next build** (date not documented); Mélissa Gagnon considers it a **blocker before production**. Remaining: fix the modal focus management, then Mélissa's keyboard re-test and closure. Closing ACC-303 is go-live condition #2.

**FR court.** Non. ACC-301 et ACC-302 sont fermés et validés; ACC-303 reste ouvert : le bouton Enregistrer de la modale est inatteignable au clavier. Correctif annoncé pour la prochaine build (date non documentée), puis re-test par Mélissa.

**Evidence.**
- `03_Tickets/ACC-303.txt#L6,L14-L16`; `ACC-303_focus.png` (Build 2026.09.17, "Le focus clavier ne rejoint pas ce bouton").
- Distinct: `M06#L9` — « Il reste ACC-303… Pour moi c'est un bloquant d'accessibilité avant production. »; `M06#L15`.
- Closed items: `ACC-301.txt#L6,L16`; `ACC-302.txt#L6,L14-L16`; `M05#L10`; `M03#L11`.
- Risk register `#Risques!G5` "Fermer ACC-303".

**Traps.** Julien's Aug 20 email "tout devrait être conforme" (vendor claim, before ACC-303 existed). Status report "Accessibilité VERT". Screenshots of ACC-301/302 are historical. Risk register rates R-04 impact "Moyen", yet it is a committee go-live blocker.

**Confidence:** High.

---

### Q10. What are the three go-live conditions? Specify the missing runbook work from its screenshot.
*FR: Quelles sont les trois conditions de go-live? Précisez les travaux manquants du runbook à partir de sa capture.*

**Answer.** Confirmed by the Sept 26 steering committee:
1. **Security validation of SEC-210** (owner: Sophie Lambert).
2. **Closure of ACC-303** (owner: Mélissa Gagnon; fix by Boréal).
3. **Approval of the runbook including rollback** (approver: Olivier Côté, operations; content from Boréal's ops team).

**Runbook screenshot** (`OPS-601_runbook.png`, "Version du 25 septembre"): steps 1–3 are OK (check service health; enable maintenance mode; deploy the approved version). **Missing: step 4 "Procédure de retour arrière" (rollback) = TODO; step 5 "Validation fonctionnelle post-déploiement" (post-deployment functional validation) = "À compléter".** Olivier requires a procedure another person can execute without calling the project team. As of Sept 29 he had **not received the final version**.

**FR court.** (1) validation sécurité de SEC-210, (2) fermeture d'ACC-303, (3) approbation du runbook incluant le rollback. Capture : étape 4 « Procédure de retour arrière » TODO et étape 5 « Validation fonctionnelle post-déploiement » à compléter; version finale non reçue au 29 septembre.

**Evidence.**
- `M06#L11-L14` (conditions stated and confirmed); `E09` (security, accessibility, operations readiness).
- `03_Tickets/OPS-601_runbook.png` (rows 4 and 5); `OPS-601.txt#L14` (« au minimum la procédure de rollback. La capture jointe identifie aussi une autre étape à compléter »), `#L15` (part of go-live conditions), `#L16` (29 sept: « Toujours pas reçu la version finale »).
- Corroboration: `Registre_Risques_29sept.xlsx#Risques!G3,G4,G5`.

**Traps.** Naming only rollback (misses step 5, which is only visible in the screenshot). Listing "performance" or "data migration" as conditions (both closed).

**Confidence:** High.

---

## 8. Timeline (baseline, as of 2026-09-30 09:00)

Lifecycle tags: `PROPOSAL` · `DECISION` · `DELIVERY` (vendor says done) · `VALIDATION` (owner confirms) · `STATUS` · `ISSUE` · `FINANCE` · `ORG` · `REPORT`. Times are Montréal local (UTC−04:00) unless marked Z (UTC).

| Date | Tag | Event | Source(s) |
|---|---|---|---|
| June (undated) | REPORT | Preliminary plan: go-live 2026-10-15 | 08/Plan_NOVA_preliminaire_juin.xlsx!F3 |
| 2026-07-07 | DECISION / ORG | Kickoff. Élodie Caron PM; budget max 180 000 $; target 15 Oct; phase-1 scope defined. Contract period starts | M01 L9–12; Charte L4–18; E01; CONTRAT p.1 |
| 2026-07-18 | REPORT | Architecture v1: data in East US | Architecture_NOVA_v1.pdf p.1 |
| 2026-07-22 | ISSUE | Sophie questions East US; wants production data in Canada | E02 |
| 2026-07-23 | DECISION | Workshop: Canada Central chosen; SSO only in prod; admin audit logging requested. ADR-007 accepted | M02 L11–19, L28–30; ADR-007 L3–10 |
| 2026-07-31 | FINANCE | INV-001 60 000 $ (deposit), paid | INV-001 p.1 |
| 2026-08-11 / 12 | ISSUE | ACC-301 (labels) and ACC-302 (contrast) opened | ACC-301 L3; ACC-302 L3 |
| 2026-08-14 | DECISION / FINANCE | CR-01 advanced reports 24 000 $ approved by project committee | CR-01 p.1 |
| 2026-08-15 | VALIDATION | ACC-301 validated (NVDA, VoiceOver) and closed | ACC-301 L16 |
| 2026-08-20 | DELIVERY + VALIDATION | Julien claims labels/contrast compliant; Mélissa re-tests ACC-302 at 5,3:1 and closes it | E04; ACC-302 L16 |
| 2026-08-25 | DELIVERY | Architecture v2: data in Canada Central | Architecture_NOVA_v2.pdf p.1 |
| 2026-08-26 | DELIVERY | Boréal: migration to Canada Central completed | E03 |
| 2026-08-27 | VALIDATION / STATUS | Committee: migration verified by architecture team; no delay approved; connector watched | M03 L5, L8 |
| 2026-08-31 | FINANCE | INV-002 72 000 $ (milestone 2 + CR-01), paid | INV-002 p.1 |
| 2026-09-02 | ISSUE | DATA-401 migration duplicates opened | DATA-401 L3 |
| 2026-09-03 | ISSUE | PERF-501 slowness opened | PERF-501 L3 |
| 2026-09-04 | PROPOSAL | CR-04 advanced mobile (18 000 $) requested by Boréal (draft) | CR-04 p.1 |
| 2026-09-05 | ISSUE | INT-101 connector: searches empty, 401 errors (token expired) | INT-101 L3, L14–15; logs L1–2 |
| 2026-09-07 | VALIDATION | PERF-501 closed (620 ms avg) | PERF-501 L16 |
| 2026-09-08 | ISSUE + PROPOSAL | INT-101 intermittent errors put 15 Oct at risk; **Boréal proposes 22 Oct** | INT-101 L16; E05 |
| 2026-09-09 | VALIDATION | DATA-401 replay 15 000 events, 0 duplicates, closed. (Risk register R-01 last follow-up date) | DATA-401 L19; Registre!H2 |
| **2026-09-10** | **DECISION** | **Steering committee approves 22 Oct** (not an automatic go). Mobile ~18 000 $: no spending decision | M04 L17–24, L33–35 |
| 2026-09-12 | ISSUE / REPORT | SEC-210 opened (incomplete export audit). Plan v3 issued, still showing 15 Oct | SEC-210 L3; Plan v3!F7 |
| 2026-09-15 | STATUS | Nicolas corrects Alex: 22 Oct approved; plan not yet corrected | Teams_15sept L4–5 |
| **2026-09-16** | **ORG** | **Nicolas Perron officially becomes PM** | E06; Note_transition L4; Teams_16sept L4 |
| 2026-09-17 | VALIDATION / ISSUE | **INT-101 validated (120/120) and closed** (16:10). ACC-303 opened (modal focus) | INT-101 L17–18; E12; ACC-303 L3, L14 |
| 2026-09-18 | STATUS | Follow-up: INT-101, DATA-401, PERF-501 closed; SEC-210 fix in prep; ACC-301/302 closed; runbook not final; 22 Oct still approved | M05 L6–13 |
| 2026-09-19 | DELIVERY | SEC-210 fix deployed to validation (Boréal); Sophie: do not close before security validation | E08; SEC-210 L23–24; Teams_19sept |
| 2026-09-21 | REPORT / DRAFT | Status report: security and accessibility GREEN (prepared before detailed ticket check). Alex drafts "NOVA au vert" message | Rapport_Statut p.1; E11 |
| 2026-09-22 | FINANCE / ISSUE | INV-003 54 000 $ incl. CR-04 18 000 $, "En validation". Julien thought advanced mobile was in scope; Nicolas: no | INV-003 p.1; Teams_22sept L4–5 |
| 2026-09-23 | FINANCE | Amélie asks for CR-04 approval before releasing INV-003 | E07 |
| **2026-09-24** | **DECISION** | **CR-04 advanced mobile deferred to phase 2**; no CR-04 spending/invoicing without new approval | Decision_Portee_Phase2; E10 |
| 2026-09-25 | ISSUE | OPS-601 opened: runbook (25 Sept version) missing rollback and post-deploy validation | OPS-601 L3, L14; OPS-601_runbook.png |
| **2026-09-26** | **DECISION** | **Committee sets three go-live conditions**; ACC-303 still open (blocker); SEC-210 retest planned, stays EN VALIDATION; CR-04 not to be invoiced | M06 L7–25; ACC-303 L16; SEC-210 L25; OPS-601 L15 |
| 2026-09-27 | STATUS | Nicolas: 22 Oct approved but conditional; do not announce as guaranteed | E09 |
| 2026-09-29 | STATUS / REPORT | Olivier: final runbook still not received. Risk register issued (R-01 stale) | OPS-601 L16; Registre_Risques_29sept |
| **2026-09-30 09:00** | — | **BASELINE REFERENCE POINT** | README |
| 2026-10-22 | (future) | Target go-live, conditional | M04; M06; E09 |
| 2026-10-31 | (future) | Contract period ends | CONTRAT p.1; M04 L15 |

---

## 9. Decisions register (lifecycle view)

| ID | Subject | Proposed (who, when, source) | Decided (who, when, source) | Delivered | Validated | Status @ baseline |
|---|---|---|---|---|---|---|
| D1 | Data location | Sophie requirement, 22 Jul (E02) | Workshop + ADR-007, 23 Jul (M02 L13–17; ADR-007) | Boréal, 26 Aug (E03; arch v2) | Architecture team, by 27 Aug (M03 L5) | **Done** |
| D2 | Go-live date 15→22 Oct | Julien/Boréal, 8 Sept (E05) | Steering committee, 10 Sept (M04 L17–23) | — | — | **Approved, conditional** |
| D3 | Go-live conditions | Sophie, Mélissa, Olivier positions (M06 L7–10) | Committee, 26 Sept (M06 L11–16) | — | — | **0 of 3 met** |
| D4 | PM handover | Planned ("comme convenu", E06) | Élodie announcement, 16 Sept (E06) | — | — | **Done** |
| D5 | CR-01 advanced reports +24 000 $ | — | Project committee, 14 Aug (CR-01) | Invoiced in INV-002 | Paid (INV-002) | **Done** |
| D6 | CR-04 advanced mobile 18 000 $ | Boréal, 4 Sept (CR-04 draft) | **Not approved** (M04 L33); **deferred to phase 2**, 24 Sept (Decision_Portee_Phase2; E10) | Boréal "looking at adjustments" (M06 L22) | — | **Rejected for phase 1** |
| D7 | Auth = SSO only in prod | Marc question (M02 L18) | Workshop, 23 Jul (M02 L19, L30) | "already planned" (M02 L20) | Not documented | Decided; validation TBC |
| D8 | Admin audit logging | Sophie (M02 L28) | Agreed to validate (M02 L29–30) | SEC-210 fix, 19 Sept | **Pending** (SEC-210 EN VALIDATION) | **Open** |

---

## 10. Contradictions register

Rubric needs **≥2 explained by authority or date, one in a plan or risk register**. C1 and C2 satisfy that. Resolution rule: higher authority wins; at equal authority, the later **date of the facts** wins; the file timestamp is irrelevant.

| ID | Contradiction | Side A | Side B | Resolution (rule) |
|---|---|---|---|---|
| **C1** | **Go-live date in the plan** | Plan v3 dated 12 Sept: P-06 Mise en production 2026-10-15 (`Plan_Projet_NOVA_v3_12sept.xlsx#Plan projet!E7:F7`, G7 "Cible de planification") | Committee approved 22 Oct on 10 Sept (M04 L17–23); confirmed 18, 26, 27 Sept (M05 L13; M06 L16; E09) | **Authority + date:** committee decision (DECISION) prevails over a plan (REPORT). The plan was not updated: Nicolas says so on 15 Sept (Teams_15sept L5); the transition note asks to update all plans (L7). Also stale: charter (by design, L20), June plan, personal notes |
| **C2** | **Connector risk in the risk register** | Registre 29 Sept: R-01 "Retard du connecteur interne" = **Ouvert**, comment "Suivi au 9 septembre 2026" (`#Risques!F2,H2`) | INT-101 validated and closed 17 Sept (INT-101 L17–18; E12; M05 L6) | **Date of facts:** the row's content dates from 9 Sept, before closure; the 29 Sept file date does not make it current. **Authority:** ticket closure by the integration owner. R-01 should be closed (action A8) |
| C3 | Security and accessibility "GREEN" | Status report 21 Sept: Sécurité VERT "Correctif SEC-210 livré", Accessibilité VERT "Correctifs appliqués"; Alex's draft "sécurité et accessibilité complétées" (E11) | SEC-210 EN VALIDATION (SEC-210 L6, L25; M06 L7); ACC-303 OPEN since 17 Sept, before the report (ACC-303 L6) | **Authority:** validating owners and committee prevail over a report that admits it was prepared before the detailed ticket check. The draft message must not be sent as-is (A9) |
| C4 | SEC-210 "fixed" | Boréal: "pour nous, le problème est corrigé" (E08); "devrait être good" (Teams_19sept L4) | Sophie: "déployé != accepté" (Teams_19sept L5); M06 L7 | **Authority:** only security can accept. Delivery ≠ validation |
| C5 | Accessibility "compliant" | Julien 20 Aug: "Tout devrait maintenant être conforme" (E04) | ACC-303 opened 17 Sept, open at baseline; Mélissa had asked for a modal keyboard pass (E04 quote; M03 L11) | **Date + authority:** later facts and the validator prevail; labels/contrast are indeed closed |
| C6 | Mobile scope | Julien thought advanced mobile was in initial scope (Teams_22sept L4); INV-003 bills CR-04 | Charter/contract scope has no advanced mobile; M01 L20; M04 L33–35; Decision 24 Sept; E10 | **Authority:** contract + committee + decision doc. CR-04 is a draft |
| C7 | Hosting region | Architecture v1: East US | ADR-007, M02, arch v2: Canada Central | **Authority + date:** ADR supersedes v1 explicitly |
| C8 | Project owner in plan | Plan v3 (12 Sept) D7 = Nicolas Perron | Official transition 16 Sept (E06) | **Date of facts:** plan anticipated the handover; official date is 16 Sept |
| C9 | Accessibility severity | Risk register R-04 impact "Moyen" (`#Risques!D5`) | ACC-303 = committee blocker (M06 L9, L11) | **Authority:** committee condition prevails. Minor; mention as nuance |

---

## 11. Actions register (baseline)

`Type`: **COMMITMENT** = documented in the corpus · **RECOMMENDATION** = proposed by our team (must be labeled as such, README deliverable 2). `Owner`: **confirmed** (named in corpus for that action) or **proposed** (our suggestion). Due: known date or **TBC** (never invent).

| ID | Action | Linked condition | Owner | Type | Evidence | Due |
|---|---|---|---|---|---|---|
| **A1** | Re-run SEC-210 security scenario and give (or refuse) security acceptance | **Cond. 1** | Sophie Lambert (confirmed) | COMMITMENT | SEC-210 L24–25; M06 L7, L11; Registre!G3 | Retest "planifié", date **TBC**; must precede go-live (22 Oct) |
| **A2** | Deliver ACC-303 fix (modal focus) in next build | **Cond. 2** | Boréal / Julien Moreau (confirmed) | COMMITMENT | M06 L15; ACC-303 L16 | "prochaine build", date **TBC** |
| **A3** | Keyboard re-test and close ACC-303 | **Cond. 2** | Mélissa Gagnon (confirmed) | COMMITMENT | M06 L9, L13; Registre!G5 | **TBC**, before 22 Oct |
| **A4** | Complete runbook: step 4 rollback + step 5 post-deployment functional validation, executable by a third party | **Cond. 3** | Boréal ops team, chased by Julien (confirmed) | COMMITMENT | M06 L15; OPS-601 L14; runbook screenshot | Final version not received at 29 Sept; due **TBC** ("quelques jours avant", M04 L12) |
| **A5** | Approve runbook (operations go) | **Cond. 3** | Olivier Côté (confirmed) | COMMITMENT | M06 L10, L14; OPS-601 L15 | **TBC**, before 22 Oct |
| A6 | Do not pay CR-04 line (18 000 $); request corrected invoice / credit note; process 36 000 $ milestone line separately | — | Amélie Fortin (Finances) + Nicolas Perron (proposed) | RECOMMENDATION (based on documented rule: E10, M06 L23, contract clause) | INV-003; E07; E10 | **TBC** |
| A7 | Update project plan v3: P-06 date 15 Oct → 22 Oct (and conditions) | — | Nicolas Perron (proposed) | COMMITMENT (transition note asks to update all plans) | Note_transition L7; Teams_15sept L5; Plan v3!F7 | **TBC** |
| A8 | Close/refresh risk R-01 (connector) in the register | — | Marc Gervais, risk owner (proposed) | RECOMMENDATION | Registre!F2,H2; INT-101 L18 | **TBC** |
| A9 | Correct status report / Alex's draft communication (security and accessibility not complete; 22 Oct conditional) | — | Nicolas Perron with Alex Deschamps (proposed) | RECOMMENDATION (consistent with E09 instruction) | E11; Rapport_Statut; E09 | Before any communication; **TBC** |
| A10 | Hold a formal go/no-go checkpoint verifying the three conditions before 22 Oct | Conds 1–3 | Nicolas Perron (proposed) | RECOMMENDATION | M06 L16; E09 | **TBC** (before 22 Oct) |
| A11 | Confirm to Boréal in writing that no CR-04 work is executed/billed in phase 1 | — | Nicolas Perron (confirmed position) | COMMITMENT (already stated) | E10; M06 L23–25 | Done verbally 26 Sept; written follow-up **TBC** |
| A12 | Watch contract end (31 Oct): any slip past 22 Oct shrinks margin; past 31 Oct needs contractual action | — | Nicolas Perron (proposed) | RECOMMENDATION | CONTRAT p.1; M04 L15 | Monitor |

---

## 12. One-page handover brief (draft, baseline)

> Render as a single printable page (Letter/A4). Every line carries an evidence chip. Our recommendations are visibly labeled.

**NOVA — Handover brief · State as of Sept 30, 2026, 09:00 (Montréal)**

**Owner.** Nicolas Perron, project manager since Sept 16, 2026 (took over from Élodie Caron). `E06` `Note_transition L4`

**Approved date and conditions.** Go-live **Oct 22, 2026**, approved by the steering committee on Sept 10 (proposed by Boréal on Sept 8). **Conditional, not a guaranteed go.** Three conditions, none met yet:
1. SEC-210 security validation — fix delivered Sept 19, retest planned, status EN VALIDATION (Sophie Lambert). `M06 L7, L11` `SEC-210 L25`
2. ACC-303 closure — Save button unreachable by keyboard in modal; fix promised for next build (Boréal → Mélissa Gagnon). `ACC-303 L14–16`
3. Runbook approval incl. rollback — rollback TODO and post-deployment validation incomplete; final version not received Sept 29 (Olivier Côté). `OPS-601_runbook.png` `OPS-601 L16`
The original cause of the delay (connector INT-101) is resolved since Sept 17. `E12`

**Scope.** Phase 1: SSO, request creation and tracking, attachments, workflow, dashboard, standard reports, plus CR-01 advanced reports. Data hosted in Canada Central (ADR-007, verified Aug 27). **Advanced mobile (CR-04) is out of phase 1**, deferred to phase 2. `CONTRAT p.1` `CR-01` `Decision_Portee_Phase2`

**Budget (CAD, before tax).** Authorized **204 000 $** (180 000 $ + CR-01 24 000 $). `CONTRAT` `CR-01`

**Invoices.** INV-001 60 000 $ paid · INV-002 72 000 $ paid · INV-003 54 000 $ in validation, **includes 18 000 $ for unapproved CR-04**. Paid 132 000 $; valid invoiced 168 000 $; 36 000 $ authorized remaining. `INV-001/002/003` `E07`

**Priorities (next 3 weeks).**
1. Close the three go-live conditions (A1–A5), then a go/no-go checkpoint before Oct 22 *(our recommendation)*.
2. Block the CR-04 line on INV-003; request a corrected invoice *(recommendation based on E10 / contract)*.
3. Fix stale sources: plan v3 date, risk R-01, status report and draft communication *(recommendations; plan update requested in transition note)*.

**Watch.** Contract ends Oct 31; any slip beyond Oct 22 eats the margin. All due dates for the conditions are **TBC** in the corpus.

---

## 13. Update-after-event playbook + rehearsal kit

### 13.1 What the jury checks (README)
- **Check A:** distinguish **problem status**, **prior decision** and **new proposal**.
- **Check B:** keep the baseline; produce **sourced** impacts and actions **without inventing an approval and without closing other conditions**.

`consignes.pdf` adds the three questions to answer out loud: **What just changed? Which previous information is now affected? Which actions should be taken?**

### 13.2 The procedure (same in the app and if we must do it by hand)
1. **Ingest** the new file (any format) → new source `U00n-S1` with locators. Never edit baseline files.
2. **Classify** the new information:
   - *Problem status* — e.g. a ticket's state changed (reopened, retest failed, validated).
   - *Prior decision* — what was decided before and **remains in force until governance decides otherwise** (e.g. 22 Oct approved on 10 Sept).
   - *New proposal* — a suggestion (often from the vendor) that **is not a decision** until the right authority approves it.
   - *New decision* — only if the file shows the **right authority** deciding (committee / PM / validating owner). Otherwise, never.
3. **Find impacts**: which answers (Q01–Q10), conditions (1–3), actions (A1–A12), brief lines, timeline entries, contradictions are touched. Match on ticket IDs, CR/INV numbers, people, dates, amounts.
4. **Guardrail checks** (must all pass, shown in UI):
   - No approval invented (`approval_invented = false`).
   - No other go-live condition closed unless the file explicitly shows its validating owner closing it.
   - Contract end check: any new date after **2026-10-31** → flag "contractual impact: outside contract period (ends Oct 31)".
   - Dates in UTC (Z) normalized to UTC−04:00.
5. **Write ChangeSet `U00n`** (section 15) with sourced impacts and new/changed actions (owner, evidence, due or TBC, commitment vs recommendation).
6. **Publish** as a new version. The UI shows *Baseline (Sept 30 09:00)* vs *Current (after U00n)* with a diff. Baseline stays untouched and viewable.
7. **Say it out loud** in the 3-column format: Problem status | Prior decision (still in force) | New proposal (not approved).

### 13.3 Likely shape of the real event
The README check wording strongly suggests: *a problem's status changes* + *the 22 Oct decision stays in force* + *a new proposal (probably a new date) appears*. Prepare for it. Possible variants: SEC-210 retest fails; ACC-303 fix slips; runbook still missing; a connector regression; Boréal proposes a new date (e.g. late October, or after Oct 31).

### 13.4 Rehearsal kit (create these test files, ticket M360-506)
Put them in `rehearsal/` (NOT in `corpus/`). They are fake; never present them as real NOVA facts. Run each through the upload flow and check the expected output.

**R1 — `R1_retest_SEC-210_echec.eml` (email, failed retest + new date proposal)**
```
Date: Thu, 01 Oct 2026 14:10:00 -0400
From: Sophie Lambert <sophie.lambert@demo.example>
To: nicolas.perron@demo.example
Subject: SEC-210 - re-test non concluant
Content-Type: text/plain; charset="utf-8"

Bonjour Nicolas,
Notre re-test de SEC-210 est non concluant : l'identifiant du dossier apparaît
maintenant, mais le résultat de l'export est toujours absent du journal.
Le ticket reste EN VALIDATION. Boréal propose un nouveau correctif le 8 octobre
et suggère de déplacer la mise en production au 29 octobre.
Sophie
```
Expected: *Problem status:* SEC-210 retest failed, still EN VALIDATION (Cond. 1 still open). *Prior decision:* 22 Oct approved on 10 Sept remains the official target. *New proposal:* 29 Oct (Boréal via Sophie's email; **not approved**; needs steering committee). Impacts: Q01 (reservation strengthened), Q08, Q10, brief, A1 (new retest after 8 Oct fix), new action "committee decision on proposed 29 Oct" (owner Nicolas, proposed, TBC). Cond. 2 and 3 untouched. 29 Oct < 31 Oct (in contract, 2-day margin) → flag tight.

**R2 — `R2_Teams_ACC-303_valide.txt` (chat, one condition closes)**
```
Canal : Projet NOVA / Général
2 octobre 2026

10:02 - Julien (Boréal) : Build 2026.10.01 déployée avec le correctif ACC-303.
10:40 - Mélissa : Re-test clavier OK sur Chrome et Edge, Enregistrer est atteint. Je ferme ACC-303.
```
Expected: Cond. 2 closed by the validating owner (Mélissa). Cond. 1 and 3 **remain open**. 22 Oct still conditional (1 of 3 met).

**R3 — `R3_runbook_v2.png` (screenshot, partial progress)**
Make a screenshot (HTML page or slide) reproducing the runbook layout with "Version du 2 octobre": steps 1–4 OK, step 5 "À compléter".
Expected: rollback done per screenshot, step 5 still missing; **no approval by Olivier shown → Cond. 3 still open** (a screenshot is not an approval).

**R4 — `R4_INV-003_note_credit.pdf` (PDF, finance)**
Credit note NC-003 from Boréal: −18 000 $ "Annulation ligne CR-04" referencing INV-003.
Expected: INV-003 net 36 000 $; invoiced valid 168 000 $; Q06 updated (treatment executed by vendor); still "not paid" unless stated; A6 progresses.

**R5 — `R5_Plan_Projet_NOVA_v4.xlsx` (spreadsheet, fixes C1)**
Copy plan v3, set P-06 E7/F7 = 2026-10-22, G7 = "Cible approuvée 10 sept - conditionnelle".
Expected: C1 resolved going forward (keep history), A7 done.

**R6 — `R6_Boreal_report_5nov.eml` (email, date beyond contract)**
Julien proposes go-live **5 November** because of runbook delays.
Expected: new proposal (not approved), **flag: outside contract period (ends Oct 31) → contractual amendment needed**, prior decision 22 Oct stays, conditions unchanged.

**R7 — `R7_ACC-303.csv` or `.docx`** (format coverage): any small file referencing ACC-303; checks parser coverage.

### 13.5 If the app fails during the live update (fallback)
Open `docs/UPDATE_TEMPLATE.md`, fill the 3 columns by hand while sharing screen, cite the new file + locator, and show that `docs/baseline/` is unchanged. Rehearse this once.

This is an external review template, not a complete in-app manual ChangeSet editor. The current no-provider app can ingest/review sources and publish a version with three text columns; it cannot manually populate all structured impacts (see §14.1).

---

## 14. Technical architecture

### 14.1 Principles
1. **Two layers.** (a) A **curated knowledge base** (JSON in the repo) written and verified by the team: this is where the 50 points live and it doubles as the standalone export. (b) **The app**, which renders the KB, opens sources at locators, answers questions and ingests new files.
2. **No vector DB.** The corpus is ~38 000 characters of text + 8 screenshots (≈ 12–15k tokens). Use **full-context grounding**: send the KB + all normalized segments to the LLM. Simpler, more accurate, easier to explain.
3. **Deterministic first, LLM second.** Parsing, locators, search, dedupe, citation verification are deterministic code. The LLM is used for: screenshot transcription, natural-language answers, update analysis. Every LLM output is checked by code.
4. **Baseline is immutable.** Updates are additive ChangeSets.
5. **Without a configured AI provider.** Browsing, evidence and search still work. Source files can be uploaded, supported text extracted and reviewed, and published as a new version. The manual fallback edits only problem status, prior decisions and proposal text; it has no controls for citations, proposer/authority metadata, formal new decisions, affected questions/conditions/actions, condition status changes, new actions, or revised answers/brief. Empty impact fields mean analysis was not performed, not that no items are affected. Publishing runs code guardrails and preserves the baseline; it does not complete impact analysis or recompute answers. Chat, building the knowledge base, automatic impact analysis, answer recomputation and AI-assisted update interpretation require a configured provider. New images need a vision-capable provider for transcription; scanned PDFs without a text layer and unreadable formats are retained for manual review, not automatically read. Existing baseline screenshot transcriptions remain available. Jurors need no paid subscription or personal Claude/OpenAI account: hosted AI access comes from the deployment/team's server configuration and supplied demo code (also required for upload/publication when configured).

**Implementation note:** OCR fallback entries below describe planned work, not current no-provider behavior. The current upload path has no OCR or manual transcription editor.

### 14.2 Stack
| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | One codebase for UI + API routes; easy free deploy |
| UI | **Tailwind CSS + shadcn/ui + free 21st.dev components** | Sponsor wants polish; 21st.dev components install via shadcn CLI (copy TSX). Use only free components |
| Validation | `zod` | Schemas for KB and LLM JSON outputs |
| Parsing | `mailparser` (.eml), `pdfjs-dist` or `unpdf` (.pdf), `exceljs` (.xlsx), `papaparse` (.csv), `mammoth` (.docx), native (.txt/.md) | Cover every corpus format + Word |
| Images | Vision-capable LLM; fallback `tesseract.js` (`fra`) | Screenshots carry key facts (Q08–Q10) |
| Search | `minisearch` | Client-side lexical search with accent folding; instant |
| LLM | Provider-agnostic adapter (`src/lib/llm/`) | Plug in any model with JSON + vision |
| Deploy | Vercel free tier (or Netlify/Render) | Free URL for jury; API key server-side |
| Export | Generated Markdown in `docs/` | GitHub renders it; zero-setup evidence browsing |

Python alternative (if the team prefers): FastAPI + `email`, `pdfplumber`, `openpyxl`, `pandas`, `python-docx`, with a Next.js or Streamlit front. Keep the **same data model and locator format**.

### 14.3 Repository layout (`memoire-360-nova`)
```
memoire-360-nova/
├─ README.md                  # what it is, live link, how to run, how to verify
├─ SPEC.md                    # this file
├─ USAGE.md                   # deliverable 5 (usage guide)
├─ corpus/
│  ├─ Projet360_NOVA_ETUDIANTS/   # 64 files, UNCHANGED (fictional data)
│  └─ package/                    # consignes.pdf, Image-defi-2.png, manifest.json
├─ data/
│  ├─ registry/sources.json       # per-source metadata (authority, role, duplicateOf, contentDate)
│  ├─ derived/segments/<id>.json  # normalized text with locators (generated)
│  ├─ derived/vision/<sha>.json   # screenshot transcriptions (generated, human-verified)
│  ├─ baseline/2026-09-30T0900/   # FROZEN curated KB
│  │   ├─ answers.json  timeline.json  decisions.json  contradictions.json
│  │   ├─ actions.json  conditions.json  brief.json  people.json  risks.json
│  └─ updates/U001/               # changeset.json + new source files
├─ docs/                      # generated static export (Markdown)
├─ rehearsal/                 # fake event files R1–R7 (never mixed with corpus)
├─ deck/                      # PowerPoint + PDF export
├─ scripts/
│  ├─ verify-hashes.ts  ingest.ts  vision.ts  verify-citations.ts
│  ├─ export-docs.ts    golden-test.ts
├─ src/
│  ├─ app/                    # pages + api routes (section 19, 20)
│  ├─ components/             # evidence-chip, evidence-drawer, viewers/*, timeline, etc.
│  ├─ lib/ingest/             # eml.ts pdf.ts xlsx.ts csv.ts text.ts image.ts docx.ts index.ts
│  ├─ lib/locator.ts  lib/kb.ts  lib/search.ts  lib/verify.ts  lib/update.ts
│  ├─ lib/llm/                # index.ts (interface), provider adapters
│  └─ types/                  # zod schemas (section 15)
└─ .env.example               # LLM_PROVIDER, LLM_MODEL, LLM_API_KEY, VISION_MODEL
```

### 14.4 Runtime modes
| Mode | Where | Persistence of updates | Use |
|---|---|---|---|
| **Local demo** | Presenter laptop: `npm run build && npm start` | Filesystem `data/updates/` | **Live presentation** (most reliable, works offline except LLM calls) |
| **Hosted** | Vercel URL | In-memory per session + "Download ChangeSet JSON" (optional free KV) | Jury browsing; Devpost link |
| **Static** | `docs/` on GitHub | n/a | Jury fallback, zero setup |

Note: Devpost closes at 11:00, while the new event arrives during the presentation. The Devpost page shows the update feature with a rehearsal example **clearly labeled as a simulation**. Ask organizers before committing anything to the repo after the deadline.

---

## 15. Data model and locator format

### 15.1 Core types (TypeScript / zod)
```ts
type Version = 'baseline' | `U${string}`;           // 'U001', 'U002'
type Authority = 'DECISION'|'VALIDATION'|'OFFICIAL'|'VENDOR_CLAIM'|'REPORT'
               | 'INFORMAL'|'DRAFT'|'UNOFFICIAL'|'UNRELATED';
type Role = 'CORE'|'CONTEXT'|'TRAP'|'NOISE';

interface Source {
  id: string;              // short id: 'E05', 'M04', 'SEC-210', 'PLAN-V3', 'U001-S1'
  path: string;            // relative path under corpus/ or data/updates/
  kind: 'eml'|'txt'|'md'|'pdf'|'xlsx'|'csv'|'png'|'jpg'|'docx'|'other';
  sha256: string;
  title: string;
  contentDate?: string;    // ISO date of the FACTS (not file mtime)
  authority: Authority;
  role: Role;
  duplicateOf?: string;    // id of identical source (not independent)
  parentId?: string;       // for email attachments
  attachments?: string[];
  version: Version;        // 'baseline' for the 64 corpus files
  notes?: string;
}

interface Segment {        // smallest citable unit
  id: string;              // `${sourceId}#${fragment}`
  sourceId: string;
  locator: string;         // full locator (15.3)
  text: string;            // verbatim, normalized whitespace only
  meta?: { line?: number; page?: number; sheet?: string; cell?: string;
           speaker?: string; time?: string; header?: string; region?: string };
}

interface Citation { sourceId: string; locator: string; quote: string; verified?: boolean; }

interface Answer {
  id: 'Q01'|'Q02'|'Q03'|'Q04'|'Q05'|'Q06'|'Q07'|'Q08'|'Q09'|'Q10';
  question_fr: string; question_en: string;
  answer_en: string; answer_fr: string;
  citations: Citation[];            // >= 2 distinct (non-duplicate) sources
  traps: string[]; confidence: 'high'|'medium'|'low';
  version: Version;
}

type Lifecycle = 'PROPOSAL'|'DECISION'|'DELIVERY'|'VALIDATION'|'STATUS'|'ISSUE'|'FINANCE'|'ORG'|'REPORT';
interface TimelineEvent { id: string; date: string; time?: string; tag: Lifecycle;
  title_en: string; detail_en?: string; citations: Citation[]; version: Version; }

interface Step { who: string; when: string; citations: Citation[]; }
interface Decision { id: string; subject: string; proposed?: Step; decided?: Step;
  delivered?: Step; validated?: Step; status: string; version: Version; }

interface Contradiction { id: string; topic: string;
  sideA: { claim: string; citations: Citation[] };
  sideB: { claim: string; citations: Citation[] };
  resolution: string; rule: 'authority'|'date'|'authority+date';
  inPlanOrRiskRegister: boolean; version: Version; }

interface Condition { id: 1|2|3; title: string; owner: string;
  status: 'open'|'met'; citations: Citation[]; version: Version; }

interface Action { id: string; title: string; condition?: 1|2|3;
  owner: string; ownerStatus: 'confirmed'|'proposed';
  type: 'COMMITMENT'|'RECOMMENDATION';
  due: string | 'TBC'; status: 'open'|'done';
  citations: Citation[]; version: Version; }

interface ChangeSet {
  id: string;                       // 'U001'
  createdAt: string; newSources: string[];
  summary_en: string;
  problemStatus: { subject: string; before: string; after: string; citations: Citation[] }[];
  priorDecisions: { decisionId: string; statement: string; stillInForce: boolean; citations: Citation[] }[];
  newProposals:  { statement: string; proposer: string; citations: Citation[]; approvedBy: null }[];
  newDecisions:  { statement: string; authority: string; citations: Citation[] }[];  // only with authority evidence
  affected: { answers: string[]; conditions: number[]; actions: string[];
              brief: string[]; timeline: string[]; contradictions: string[] };
  newActions: Action[];
  changedActions: { id: string; before: Partial<Action>; after: Partial<Action> }[];
  guardrails: { approvalInvented: false; otherConditionsClosed: false;
                beyondContractEnd: boolean; notes: string[] };
  reviewedBy?: string; publishedAt?: string;
}
```

### 15.2 Current view
`current = baseline ⊕ U001 ⊕ U002 …` computed at read time. Each entity shows a version badge. Baseline JSON files are never rewritten (enforce with a test that hashes `data/baseline/`).

### 15.3 Locator format (MUST be consistent everywhere)
`<relative path>#<fragment>` — relative to `corpus/Projet360_NOVA_ETUDIANTS/` for baseline sources.

| Kind | Fragment | Example | Display label |
|---|---|---|---|
| .txt / .md | `L<n>` or `L<a>-L<b>` (1-based, split on `\r?\n`, same as `cat -n` / VS Code) | `02_Reunions/M04_Transcript_Comite_direction_10sept.txt#L17-L23` | `M04 · L17–23` |
| .eml body | `body:P<n>` (paragraph, blank-line separated, after decoding) | `01_Courriels/E05_Retard_integration.eml#body:P3` | `E05 · ¶3` |
| .eml header | `header:<Name>` | `…E05….eml#header:Date` | `E05 · Date` |
| .eml attachment | `att:<filename>` then nested fragment | `…E07….eml#att:INV-003.pdf#page=1` | `E07 ▸ INV-003 · p.1` |
| .pdf | `page=<n>` | `05_Contrats_et_finances/INV-003.pdf#page=1` | `INV-003 · p.1` |
| .xlsx | `<Sheet>!<Cell>` or range | `04_Documents_projet/Plan_Projet_NOVA_v3_12sept.xlsx#Plan projet!F7` | `Plan v3 · F7` |
| .csv | `row=<n>` (header = row 1) | `03_Tickets/DATA-401_echantillon.csv#row=3` | `DATA-401.csv · row 3` |
| .png / .jpg | `region=<label>` + verbatim visible text in quote | `03_Tickets/OPS-601_runbook.png#region=row-4` | `Runbook.png · row 4` |
| .docx | `P<n>` | `…#P5` | `… · ¶5` |

Every citation also stores a **verbatim quote** (French, as in the source). Line numbers in this SPEC follow this convention; when in doubt, the quote wins.

### 15.4 Conflict resolution (encode in `lib/kb.ts` and in prompts)
Authority rank: DECISION 6 > VALIDATION 5 > OFFICIAL 4 > VENDOR_CLAIM 3 > REPORT 2 = INFORMAL 2 > DRAFT 1 > UNOFFICIAL 0 > UNRELATED (excluded).
1. Exclude UNRELATED and collapse DUPLICATE sources.
2. Compare **content dates** (date of the facts), never file mtime.
3. A later fact from equal-or-higher authority supersedes. A later fact from **lower** authority (e.g. a status report) does **not** supersede a validation or decision; flag it as a contradiction.
4. Lifecycle never skips: PROPOSAL ≠ DECISION; DELIVERY ≠ VALIDATION. A ticket is closed only when its validating owner closes it.
5. If unresolved → show both sides + "to be confirmed".

---

## 16. Ingestion pipeline (per format)

Common flow: `bytes → sha256 → dedupe → parse → segments with locators → metadata (contentDate, entities, people) → registry entry`. Same code path for baseline (build script) and live upload (API).

| Format | Library | Segmenting | Gotchas in this corpus |
|---|---|---|---|
| .eml | `mailparser` `simpleParser` | Headers (Date, From, To, Subject) + body paragraphs `P1..Pn`; quoted reply lines (`>`) kept as their own paragraph; attachments recursively ingested as child sources | Quoted-printable + encoded-word headers (`=?utf-8?q?…?=`) must be decoded; 5 attachments duplicate standalone files (mark `duplicateOf` via sha256); E12 duplicated in archives; `**bold**` markdown inside bodies |
| .txt (minutes, tickets, Teams, logs) | native | Lines `L1..Ln`; detect utterances `^(\d{1,2}:\d{2})\s*(?:-\s*)?([^:]+?)\s*:\s*(.*)$` (speaker, time); ticket fields `^(Titre\|Créé\|Demandeur\|Priorité\|Statut)\s*:`; ticket comments `^\d{1,2} \w+\.?( \d{2}:\d{2})? - [^:]+ :` | Mixed CRLF/LF; logs in **UTC (Z)**; ticket comments use FR month names ("sept", "août") |
| .md | native | Lines; also capture `**Statut :**` style fields | ADR and decision doc are short and authoritative |
| .pdf | `pdfjs-dist` / `unpdf` | One segment per page + table rows as lines | All are 1-page; tables (invoice lines) come out as text lines; viewer renders the page with pdf.js |
| .xlsx | `exceljs` | One segment per non-empty cell `Sheet!A1` + one per row (for search); read cell notes/comments | No comments in this corpus, but the update may include some; dates stored as strings `2026-10-15` |
| .csv | `papaparse` | One segment per row, `row=n` | Small CSV is evidence, not an answer key |
| .png / .jpg | Vision LLM → JSON (prompt 21.4); fallback `tesseract.js` (`fra`) | Segments per visible row/region (`region=row-4`) + header context (version/build/environment) | **Historical** screenshots: tag `historical: true` unless the file is new; runbook rows 4–5 and audit-log row EXPORT_CSV are key |
| .docx | `mammoth` | Paragraphs `P1..Pn` | Not in corpus; supported for the live event |
| other | none | Store, list, mark "manual review" | Never crash on upload |

**Metadata extraction (regex, deterministic):**
- Ticket IDs `\b(ACC|SEC|OPS|INT|DATA|PERF)-\d{3}\b`; CRs `\bCR-\d{2}\b`; invoices `\bINV-\d{3}\b`; risks `\bR-\d{2}\b`; plan rows `\bP-\d{2}\b`.
- Amounts `\b\d{1,3}(?:[\s\u00A0\u202F]\d{3})*\s?\$` → integer CAD.
- Dates: ISO, `DD mois YYYY`, `DD mois` (infer 2026), email `Date:` header (with offset).
- People: match against the directory (section 29.2), including first-name-only mentions in transcripts.
- Content date: email Date header; "Date :" line; "Créé :" field + comment dates; filename date (`_16sept`) as last resort, flagged low confidence.

**Baseline build:** `npm run ingest` (deterministic, no LLM except cached vision) → `data/derived/`. `npm run vision` runs once for the 8 screenshots; results are human-verified and committed (ticket M360-110), so the demo never depends on live vision for baseline files.

---

## 17. Search, chat and citation verification

### 17.1 Search (`/sources?q=`, Cmd+K)
- MiniSearch index over segments: fields `text`, `title`, `sourceId`; `processTerm` = lowercase + NFD diacritic stripping (so `echeance` finds `échéance`); prefix search; fuzzy 0.2; boost title ×2.
- Results grouped by source, each hit shows its **locator chip** and highlighted snippet. Filters: folder, file type, authority, role (hide NOISE by default with a toggle), version.
- This is what we show when the jury asks "show us your search" (Usage criterion).

### 17.2 Chat (`/ask`, also from the top bar)
- **Context:** system prompt (21.1) + current-version KB JSON (answers, conditions, decisions, contradictions, actions, timeline) + all segments serialized as `[[<locator>]] <text>` + screenshot transcriptions. Temperature 0. JSON output (schema 21.1).
- **Language:** answer in the user's language (EN or FR); quotes stay in French.
- **Version switch:** "Answer as of baseline (Sept 30 09:00)" or "as of current (after U00n)".
- **Refusal pattern:** if the corpus does not contain the answer → "Not documented in the corpus" + what is known + who could confirm. Never guess.

### 17.3 Citation verifier (`lib/verify.ts`, also `npm run verify-citations`)
For each citation: load segment(s) at the locator → normalize (NFC, collapse whitespace, unify quotes « » " ' ’, case-insensitive) → check `quote` is a substring. Unverified citations are **dropped** from the chat answer and the answer is marked "partially verified". Run the same verifier in CI on all KB JSON files. This is a strong demo talking point: *"the model cannot cite what isn't there."*

### 17.4 Golden tests (`npm run golden`)
Ask the 10 README questions + the 8 example questions from `consignes.pdf` (e.g. "Quelle est la date de livraison actuellement prévue et pourquoi?", "Quels engagements ne sont toujours pas complétés?", "Existe-t-il des informations contradictoires?", "Si je devais reprendre le projet demain matin, que devrais-je savoir?"). Check required key facts appear (e.g. Q05 must contain `204 000`, `180 000`, `24 000`, and must NOT state that CR-04 is approved). Run before every demo rehearsal.

---

## 18. Update engine (live upload)

### 18.1 Flow
```
Upload (any format) ──► ingest (16) ──► new Source U00n-Sk (version U00n)
        │
        ▼
Entity match (deterministic): ticket/CR/INV/R/P ids, people, dates, amounts
        │   → candidate affected items from KB
        ▼
LLM analysis (prompt 21.3) with: new segments + baseline KB + rules
        │   → ChangeSet draft (JSON, schema 15.1)
        ▼
Code guardrails:
  • every claim cites the new file or baseline (verifier 17.3)
  • newDecisions require an authority citation (committee/PM/validating owner) else moved to newProposals
  • conditions only closed if the validating owner's closure is quoted
  • any date > 2026-10-31 → beyondContractEnd = true + note
  • UTC→UTC−04:00 normalization
        ▼
Review screen (human edits/approves) ──► Publish U00n ──► current view recomputed
        ▼
Diff view + "What changed / What's affected / What to do" + export docs/updates/U00n.md
```

### 18.2 Review screen layout
Three columns, exactly the rubric's wording: **Problem status** | **Prior decision (still in force)** | **New proposal (not approved)**. Below: affected items (answers, conditions with open/met badges, actions, brief lines), new/changed actions with owner/evidence/due-or-TBC/type, guardrail checklist (all green before publish), and the source viewer for the new file.

### 18.3 Performance target
Upload → draft ChangeSet in < 30 s for a 1-page file. Show progress steps ("Reading file", "Matching project items", "Checking evidence").

---

## 19. UI / UX specification

### 19.1 Blueprint: the sponsor's own image
`corpus/package/Image-defi-2.png` shows what Loto-Québec imagines: "Le cerveau du projet" with a left sidebar (**Vue d'ensemble, Chronologie, Décisions, Tâches, Risques, Documents, Équipe**), a top bar **"Poser une question en langage naturel…"**, overview tiles (project status, key decisions, deadlines, people, risks, next actions), a timeline strip with legend (événement, décision, risque, échéance), a "Documents et sources" list, and a floating "Quelles sont les prochaines étapes?" prompt. Its bottom row restates the 9 capabilities.

**Match this structure** so the jury instantly recognizes it, but with honest content: their mock says "En bonne voie"; NOVA's truth is **"22 Oct — conditional, 0 of 3 conditions met"**. Use that contrast in the demo: *"Your mock-up says on track. Our memory says conditional, and shows you why."*

### 19.2 Information architecture (sidebar order)
| Sidebar (EN / FR) | Route | Content |
|---|---|---|
| Overview / Vue d'ensemble | `/` | Status sentence, 3 conditions tracker, budget bar, next actions, recent changes, version stamp |
| Brief / Brief de reprise | `/brief` | One-page brief (section 12), print-ready |
| Questions / Questions | `/questions` | Q01–Q10 cards: answer, FR short answer, evidence chips, traps avoided |
| Timeline / Chronologie | `/timeline` | Vertical timeline by month, lifecycle filter chips, decision milestones emphasized |
| Decisions / Décisions | `/decisions` | Lifecycle table: proposed → decided → delivered → validated |
| Contradictions / Contradictions | `/contradictions` | Side-by-side A vs B, resolution rule badge (authority / date) |
| Actions / Tâches | `/actions` | Table with condition link, owner (confirmed/proposed), type (commitment/recommendation), due or TBC |
| Risks / Risques | `/risks` | Register as-is + our annotations (e.g. R-01 stale) |
| Sources / Documents | `/sources`, `/sources/[id]` | Folder tree + per-type viewers; badges: duplicate, historical, noise, superseded |
| Team / Équipe | `/team` | People, roles, since when, what they own |
| Update / Mise à jour | `/update` | Dropzone (all formats) → analysis → review → publish; diff baseline vs current |
| Guide / Mode d'emploi | `/guide` | Usage guide (deliverable 5), limits, uncertainty |
| Ask (top bar + `/ask`) | `/ask` | Grounded chat with citation chips |

Header: product name, **version stamp** ("State as of Sept 30, 2026 09:00 · Baseline" / "Current · after U001"), baseline/current toggle, EN/FR toggle (P2), search (Cmd+K).

### 19.3 Signature elements
1. **Evidence chip** — small pill `M04 · L17–23` next to every claim. Click → right-side **evidence drawer** opens the source viewer scrolled to the locator with the passage highlighted in marker yellow, plus "open full file" and "copy locator". Keyboard reachable, Esc closes, focus returns to the chip.
2. **Lifecycle colors** — the same five colors everywhere (timeline, decisions, badges), with a text label (never color alone):
   - Proposal = violet · Decision = deep blue · Delivery = amber · Validation = green · Open/blocker = red · TBC = grey dashed outline.
3. **Conditions tracker** on the overview: three rows (SEC-210 / ACC-303 / Runbook), each with owner, state, last evidence date, next step; header "0 of 3 met".
4. **Budget bar**: one horizontal bar of 204 000 $ split into paid 132 000 / invoiced-valid unpaid 36 000 / remaining 36 000, with the disputed 18 000 $ CR-04 shown **outside** the authorized bar in red hatch.
5. **Diff view** after an update: changed items show "before → after" with both evidence chips; baseline always one click away.

### 19.4 Visual tokens (adjust, but decide once)
| Token | Value | Use |
|---|---|---|
| `--ink` | `#172033` | Text |
| `--canvas` | `#F5F7FA` | App background (cool, not cream) |
| `--surface` | `#FFFFFF` | Panels |
| `--primary` | `#0E4C92` | Decision, primary buttons, links |
| `--marker` | `#FFE27A` | Evidence highlight only (the one bold accent) |
| `--proposal` | `#6E56B8` | Proposal |
| `--delivery` | `#A86A12` | Delivery (vendor says done) |
| `--validation` | `#1E7A4C` | Validation / met |
| `--blocker` | `#B42318` | Open / blocker / not payable |
| `--muted` | `#667085` | TBC, metadata |

Typography: **Source Sans 3** for UI and our synthesis; **Source Serif 4** for verbatim French quotes from the corpus (visually separates *our words* from *source words*). Tabular figures for amounts and dates. Sentence case labels; no all-caps eyebrows; no "→" on buttons; no gradient washes; vary panel shapes by hierarchy instead of a uniform card grid. One orchestrated motion only (the evidence drawer slide-in); respect `prefers-reduced-motion`.

### 19.5 Using 21st.dev (sponsor's suggestion)
- Browse 21st.dev for: sidebar/app shell, command palette, timeline, file dropzone, data table, badges, sheet/drawer, tabs, AI chat input, stepper/progress, diff/compare.
- Use **free** components only. Install with the shadcn CLI command shown on each component page (or via 21st.dev's MCP integration in Cursor / Claude Code). Check each component's license.
- **Restyle with our tokens** after install; don't ship the demo look as-is. Keep the dependency count low.
- Prompt for an AI coding tool: *"Install the 21st.dev component <URL> and adapt it to the tokens in SPEC.md 19.4: Source Sans 3, lifecycle colors, evidence chip pattern. Keep it keyboard accessible (focus visible, Esc closes, focus trap includes all focusable elements)."*

### 19.6 Quality floor
- Keyboard: every interactive element reachable; **modals must include all focusable elements in their focus trap** (the exact ACC-303 defect; say this in the demo).
- Contrast ≥ 4.5:1 for text (the ACC-302 lesson).
- Responsive down to a laptop at 1280 px and a projector at 1024 px; mobile is nice-to-have.
- Brief prints on one page (`@media print`: hide nav, 11pt, chips as compact text).
- Empty and error states give direction ("No AI provider configured: browsing and evidence still work. Source upload/review/publication and the three text columns remain available; AI analysis and answer recomputation require a provider.").

---

## 20. API specification (Next.js route handlers)

| Method | Route | Body / params | Returns |
|---|---|---|---|
| GET | `/api/kb` | `?version=baseline\|current\|U001` | Full KB JSON for that version |
| GET | `/api/sources` | `?folder=&kind=&role=` | Source registry list |
| GET | `/api/sources/[id]` | — | Source metadata + segments |
| GET | `/api/sources/[id]/raw` | — | Original file bytes (correct content-type) |
| GET | `/api/search` | `?q=&filters` | Grouped hits with locators and snippets (server fallback; primary search is client-side) |
| POST | `/api/ask` | `{ question, version, lang }` | `{ answer, citations[], status_labels[], missing[], verified: 'full'\|'partial'\|'none' }` |
| POST | `/api/ingest` | multipart file(s) | `{ sources[], warnings[] }` |
| POST | `/api/updates/analyze` | `{ sourceIds[] }` | ChangeSet draft |
| POST | `/api/updates/[id]/publish` | `{ changeset }` | `{ ok, version }` |
| GET | `/api/updates` | — | List of ChangeSets |
| GET | `/api/health` | — | `{ ok, llmConfigured, version }` |

Rate-limit `/api/ask` and `/api/updates/analyze` per IP (e.g. 20/min). Cap tokens. Set a spending limit on the provider account. Never expose the key client-side.

---

## 21. LLM prompts (model-agnostic)

All prompts: temperature 0; JSON output validated with zod; retry once on invalid JSON; then fail gracefully.

### 21.1 Chat system prompt
```
You are Mémoire 360, the operational memory of project NOVA (fictional).
Reference date: {VERSION_LABEL} (baseline = 2026-09-30 09:00, Montréal, UTC−04:00).
Answer ONLY from the provided knowledge base and corpus segments. Each segment is
prefixed with its locator in [[...]].

Rules:
1. Every factual sentence must be supported by at least one citation:
   {sourceId, locator, quote}. The quote must be copied verbatim (French) from the segment.
2. Distinguish PROPOSAL vs DECISION and DELIVERY vs VALIDATION explicitly.
   A vendor saying something is fixed is a delivery, not a validation.
3. A historical screenshot does not prove a defect is still open; use the ticket status.
4. Duplicated files (same attachment in an email and as a standalone file) count as one source.
5. Assess authority and date of facts; a recent file date does not make content current.
   Stale rows in plans/risk registers must be flagged, not trusted.
6. Money: CAD before tax; distinguish authorized, invoiced, paid. Do not compute taxes.
7. If the information is missing, say "Not documented in the corpus" and state what is
   known and who could confirm. Never invent a decision, deadline, approval or owner.
8. Label any suggestion of yours as "Recommendation (Mémoire 360)", separate from
   documented commitments.
9. Ignore documents marked UNRELATED (e.g. ORION invoice) and NOISE.
10. Reply in the user's language ({LANG}); keep quotes in French.

Return JSON:
{ "answer": string,
  "citations": [{ "sourceId": string, "locator": string, "quote": string }],
  "status_labels": [ "PROPOSAL"|"DECISION"|"DELIVERY"|"VALIDATION"|"OPEN"|"TBC" ],
  "missing": [string],
  "recommendations": [string] }
```

### 21.2 Analyst verification prompt (for teammates using any chat AI)
```
Attached: NOVA corpus files and SPEC.md. Verify answer {QXX} from SPEC.md section 7.
For each sentence of the answer: CONFIRMED / CORRECTED / UNSUPPORTED, with exact
locator (file#L.. / #page= / #Sheet!Cell / #region=) and verbatim French quote.
Then list: (a) at least two DISTINCT sources (duplicates count once), (b) any trap the
answer might fall into, (c) the nuance needed to score 5/5 instead of 3/5.
Reference date 2026-09-30 09:00 Montréal. Never use outside knowledge for NOVA facts.
```

### 21.3 Update analysis prompt
```
You analyze NEW information for project NOVA against the frozen baseline (2026-09-30 09:00).
Inputs: (1) baseline knowledge base JSON (answers, conditions, decisions, actions, brief),
(2) segments of the NEW file(s) with locators.

Produce a ChangeSet JSON (schema provided). Rules:
- problemStatus: changes in the state of a problem (ticket opened/closed/failed retest),
  citing the new file.
- priorDecisions: decisions from the baseline that REMAIN IN FORCE unless the new file
  shows the proper authority (steering committee / project manager / validating owner)
  changing them. Example: "22 Oct approved on 2026-09-10 remains the official target".
- newProposals: suggestions (e.g. a new date) with proposer; approvedBy MUST be null
  unless an explicit approval by the proper authority is quoted.
- newDecisions: only with a verbatim quote of the authority deciding. Otherwise empty.
- Do NOT close any go-live condition unless the new file quotes its validating owner
  closing it (SEC-210: Sophie Lambert; ACC-303: Mélissa Gagnon; runbook: Olivier Côté).
- affected: list answer ids (Q01–Q10), condition ids (1–3), action ids, brief sections.
- newActions / changedActions: owner (confirmed|proposed), type (COMMITMENT|RECOMMENDATION),
  due date only if stated, else "TBC", with citations.
- guardrails: approvalInvented=false, otherConditionsClosed=false,
  beyondContractEnd=true if any proposed/decided date is after 2026-10-31.
- Normalize UTC (Z) times to UTC−04:00.
Return JSON only.
```

### 21.4 Screenshot transcription prompt (vision)
```
Transcribe this screenshot from project NOVA exactly. Return JSON:
{ "header_context": string,          // e.g. "NOVA · Version du 25 septembre", build, environment
  "title": string,
  "rows": [ { "label": string, "value": string } ],   // tables/lists, in order, verbatim
  "annotations": [string],           // red notes, QA observations, callouts, verbatim
  "visible_text": [string],          // every other visible line, verbatim French
  "description_en": string,          // 1–2 sentences, neutral
  "historical_caveat": "A screenshot shows a past state; check the ticket status." }
Do not infer anything not visible. Keep French text verbatim (accents included).
```

### 21.5 New-source claim extraction (optional, before 21.3)
```
Extract atomic claims from this NOVA document. For each: text (EN), type
(PROPOSAL|DECISION|DELIVERY|VALIDATION|STATUS|REQUIREMENT|AMOUNT_AUTHORIZED|
AMOUNT_INVOICED|AMOUNT_PAID|ASSIGNMENT|CONDITION), subject (ticket/CR/invoice/person/date),
actor, date (ISO, Montréal time), citation {locator, verbatim quote}. JSON array only.
```

---

## 22. Ticket backlog

Format: **ID · Title** — Priority (P0 must-have for scoring/demo, P1 strong, P2 nice) · estimate · role (section 23) · depends on.
Then *Do* and *Done when* (acceptance criteria). Move tickets on a GitHub Project board (To do / Doing / Review / Done). One PR per ticket where possible; the reviewer is someone else.

### EPIC 0 — Setup and admin

**M360-001 · Repo and app scaffold** — P0 · 1h · DEV-FE · —
*Do:* Public GitHub repo `memoire-360-nova`; Next.js + TS + Tailwind; `npx shadcn@latest init`; ESLint/Prettier; MIT license; README stub; `.env.example`.
*Done when:* `npm run dev` works; first deploy URL live; all teammates have push access.

**M360-002 · Commit corpus unchanged + hash check** — P0 · 0.5h · DEV-BE · 001
*Do:* Copy the 64 files to `corpus/Projet360_NOVA_ETUDIANTS/` and package files to `corpus/package/`. Script `verify-hashes.ts` checks file count (64) and sizes vs `MANIFEST.csv`; records sha256 in `data/registry/hashes.json`.
*Done when:* script passes; README states data is fictional and unchanged.

**M360-003 · Devpost draft + HxBuddy team check** — P0 · 0.5h · LEAD · —
*Do:* Create the Devpost project now; invite teammates; select **Loto-Québec - Projet 360**; confirm team name = HxBuddy team name exactly.
*Done when:* draft visible to all members.

**M360-004 · LLM adapter + env** — P0 · 1h · DEV-BE · 001
*Do:* `src/lib/llm/index.ts` interface `complete({system, messages, images?, json?})`; one provider adapter (any model with vision + JSON); env vars; app runs with no key (chat and automatic update analysis unavailable with clear message; source upload/review/publication and three-column text editing remain available, as limited in §14.1).
*Done when:* `/api/health` reports `llmConfigured`; pages load without a key.

### EPIC 1 — Ground truth (highest value: 50 + 30 pts)

**M360-101 · Verify Q01–Q05** — P0 · 2h · AN-1 · —
*Do:* Check every claim and locator in SPEC §7 Q01–Q05 against the files (prompt 21.2 allowed, human confirms). Write `data/baseline/2026-09-30T0900/answers.json` (schema 15.1).
*Done when:* each answer has ≥2 distinct non-duplicate sources, verbatim quotes, traps; `verify-citations` passes.

**M360-102 · Verify Q06–Q10** — P0 · 2h · AN-2 · —
*Do:* Same for Q06–Q10. Personally open the 3 key screenshots (SEC-210, ACC-303, OPS-601) and confirm transcriptions.
*Done when:* same as 101.

**M360-103 · Timeline JSON** — P0 · 1.5h · AN-1 · 101
*Do:* Encode §8 into `timeline.json` with lifecycle tags and citations.
*Done when:* proposal (8 Sept), decision (10 Sept) and validations (17 Sept, 27 Aug) are distinct entries with sources.

**M360-104 · Decisions register** — P0 · 1h · AN-1 · 103
*Do:* Encode §9 into `decisions.json`.
*Done when:* D2 shows proposed/decided steps with different people/dates/sources.

**M360-105 · Contradictions register** — P0 · 1h · AN-2 · 101
*Do:* Encode §10 into `contradictions.json`; C1 (plan) and C2 (risk register) marked `inPlanOrRiskRegister: true`; each with rule (authority/date).
*Done when:* ≥2 contradictions explained by authority or date, one in plan/register.

**M360-106 · Actions + conditions** — P0 · 1h · AN-2 · 102
*Do:* Encode §11 into `actions.json` and the three conditions into `conditions.json`.
*Done when:* conditions 1–3 each link to ≥1 action with owner (confirmed/proposed), evidence, due or TBC; commitments vs recommendations labeled.

**M360-107 · One-page brief** — P0 · 1h · AN-1 · 101–106
*Do:* Encode §12 into `brief.json` (+ Markdown). Cover the 5 themes. Fit one printed page.
*Done when:* printed preview = 1 page; all 5 themes present; each line has a chip.

**M360-108 · People directory** — P1 · 0.5h · AN-2 · —
*Do:* `people.json` from §29.2 (role, since, owns).
*Done when:* Team page renders it.

**M360-109 · Source registry metadata** — P0 · 1.5h · AN-1 + DEV-BE · 002
*Do:* `data/registry/sources.json` with id, authority, role, contentDate, duplicateOf (from §6).
*Done when:* 64 entries; 6 duplicate links; ORION marked UNRELATED; noise tagged.

**M360-110 · Screenshot transcriptions verified** — P0 · 1h · AN-2 + DEV-BE · 207
*Do:* Run vision on 8 PNGs (+ package image), human-check every line, commit to `data/derived/vision/`.
*Done when:* runbook rows 4–5 and audit row EXPORT_CSV exact; files committed.

### EPIC 2 — Ingestion

**M360-201 · Ingestion core + schemas** — P0 · 1.5h · DEV-BE · 004
*Do:* zod schemas (§15.1); `ingest(fileBuffer, filename, version)` dispatcher; sha256 dedupe; registry merge.
*Done when:* unit test ingests one file per type in the corpus.

**M360-202 · Text/markdown parser** — P0 · 1h · DEV-BE · 201
*Do:* Line segments; utterance + ticket-field detection (§16); CRLF safe.
*Done when:* `M04#L23` returns « 15:25 Élodie : Donc **approuvé**… ».

**M360-203 · Email parser** — P0 · 1.5h · DEV-BE · 201
*Do:* `mailparser`; decoded headers; body paragraphs `P1..Pn`; attachments ingested as children; duplicates flagged.
*Done when:* E07 attachment detected as `duplicateOf: INV-003`; E05 `#body:P3` contains « Notre recommandation ».

**M360-204 · PDF parser** — P0 · 1h · DEV-BE · 201
*Do:* Text per page; viewer renders the page.
*Done when:* INV-003 page 1 contains "Optimisation interface mobile - CR-04" and "18 000 $".

**M360-205 · XLSX parser** — P0 · 1h · DEV-BE · 201
*Do:* Cell segments `Sheet!A1`, row segments, comments/notes.
*Done when:* `Plan_Projet_NOVA_v3_12sept.xlsx#Plan projet!F7` = `2026-10-15`.

**M360-206 · CSV parser** — P1 · 0.5h · DEV-BE · 201
*Done when:* `DATA-401_echantillon.csv#row=3` = record 8402.

**M360-207 · Image parser (vision + cache + OCR fallback)** — P0 · 1.5h · DEV-BE · 004
*Do:* Prompt 21.4; cache by sha256; `tesseract.js` fallback if no key.
*Done when:* new PNG upload returns structured rows in < 20 s.

**M360-208 · DOCX parser** — P1 · 0.5h · DEV-BE · 201
*Done when:* a test .docx is ingested into paragraphs.

**M360-209 · Baseline build script** — P0 · 0.5h · DEV-BE · 202–207
*Do:* `npm run ingest` → `data/derived/segments/*.json` deterministic.
*Done when:* re-running produces identical output (no diff).

### EPIC 3 — Search and evidence

**M360-301 · Locator resolver** — P0 · 1h · DEV-BE · 201
*Do:* `parseLocator` / `formatLabel` for every kind (§15.3) + tests.
*Done when:* all examples in §15.3 round-trip.

**M360-302 · Evidence chip + drawer** — P0 · 2h · DEV-FE · 301
*Do:* Chip component; drawer with per-type viewer, highlight, copy locator, open full file; keyboard accessible.
*Done when:* clicking `M04 · L17–23` opens the transcript scrolled to L17 with L17–23 highlighted.

**M360-303 · Per-type viewers** — P0 · 2.5h · DEV-FE · 302
*Do:* Text (line numbers), email (headers, body ¶, attachments list), PDF (pdf.js page), XLSX (grid + cell highlight), CSV (table), image (zoomable + transcription side panel + "historical" badge).
*Done when:* each viewer highlights its locator type.

**M360-304 · Search (MiniSearch)** — P0 · 1.5h · DEV-FE · 209
*Do:* Index segments; accent folding; filters; Cmd+K palette.
*Done when:* "echeance", "rollback", "CR-04", "Sophie" return correct hits with locators.

**M360-305 · Citation verifier** — P0 · 1h · DEV-BE · 301
*Do:* `lib/verify.ts` + `npm run verify-citations` over all KB JSON.
*Done when:* a fake quote fails; all KB citations pass.

### EPIC 4 — Chat

**M360-401 · /api/ask grounded** — P0 · 2h · DEV-BE · 004, 209, 305
*Do:* Prompt 21.1; full-context; JSON parse; verifier; version + lang.
*Done when:* "Is security accepted?" answers No, distinguishes delivery vs validation, cites SEC-210 + M06 with verified quotes.

**M360-402 · Chat UI** — P0 · 1.5h · DEV-FE · 401, 302
*Do:* Top-bar input + `/ask` page; chips; verification badge; "Not documented" state; suggested questions (from consignes.pdf).
*Done when:* demo questions render in < 15 s with clickable chips.

**M360-403 · Golden tests** — P1 · 1h · DEV-BE · 401
*Do:* §17.4 script; required/forbidden facts per question.
*Done when:* all pass before rehearsal #1.

### EPIC 5 — Update engine

**M360-501 · Versioning model** — P0 · 1h · DEV-BE · 201
*Do:* Baseline frozen (hash test); ChangeSets; `current` view composition; toggle in header.
*Done when:* publishing U001 never changes `data/baseline/` hashes.

**M360-502 · Upload endpoint + dropzone** — P0 · 1h · DEV-FE + DEV-BE · 201
*Do:* `/api/ingest`; drag-and-drop accepting .eml .txt .md .pdf .xlsx .csv .png .jpg .docx; progress steps.
*Done when:* each rehearsal file R1–R7 uploads without error.

**M360-503 · /api/updates/analyze** — P0 · 2h · DEV-BE · 502, 401
*Do:* Entity match + prompt 21.3 + code guardrails (§18.1).
*Done when:* R1 yields: problem status (retest failed), prior decision (22 Oct in force), new proposal (29 Oct, approvedBy null); conditions 2–3 untouched.

**M360-504 · Review and publish UI** — P0 · 2h · DEV-FE · 503
*Do:* 3-column layout (§18.2), editable fields, guardrail checklist, publish.
*Done when:* publish creates U001 and the overview reflects it with a "changed" badge.

**M360-505 · Diff views** — P1 · 1.5h · DEV-FE · 504
*Do:* Before → after for answers/conditions/actions/brief; baseline link; export `docs/updates/U00n.md`.
*Done when:* Q01 shows baseline and current side by side after R1.

**M360-506 · Rehearsal kit** — P0 · 1h · AN-2 · —
*Do:* Create R1–R7 (§13.4) in `rehearsal/`; record expected outputs; run through the app twice.
*Done when:* each produces the expected classification; failures logged as bugs.

### EPIC 6 — UI

**M360-601 · Design tokens + app shell** — P0 · 1.5h · DEV-FE · 001
*Do:* Tokens §19.4, fonts, sidebar (§19.2 order, EN labels with FR subtitles), header with version stamp and toggle, Cmd+K. Pull free 21st.dev components and restyle.
*Done when:* every route renders inside the shell; keyboard navigation works.

**M360-602 · Overview page** — P0 · 2h · DEV-FE · 601, 106
*Do:* Status sentence, conditions tracker, budget bar, next actions, recent changes.
*Done when:* reads "Oct 22, 2026 — conditional · 0 of 3 conditions met" at baseline.

**M360-603 · Brief page + print** — P0 · 1h · DEV-FE · 107
*Done when:* prints on one page with chips as compact references.

**M360-604 · Questions page** — P0 · 1h · DEV-FE · 101, 102
*Done when:* Q01–Q10 with EN answer, FR short answer, chips, traps avoided (collapsible).

**M360-605 · Timeline page** — P0 · 1.5h · DEV-FE · 103
*Done when:* filter by lifecycle; 10 Sept decision and 26 Sept conditions visually prominent.

**M360-606 · Decisions + contradictions pages** — P0 · 1.5h · DEV-FE · 104, 105
*Done when:* contradiction cards show both sides with chips and a rule badge.

**M360-607 · Actions + risks pages** — P0 · 1h · DEV-FE · 106
*Done when:* filters by condition, owner, type; TBC visibly distinct.

**M360-608 · Sources explorer** — P0 · 1.5h · DEV-FE · 303, 109
*Done when:* folder tree with badges (duplicate, historical, noise, superseded); search integrated.

**M360-609 · Team page** — P2 · 0.5h · DEV-FE · 108

**M360-610 · Update page** — P0 (covered by 502/504/505)

**M360-611 · Guide page** — P0 · 0.5h · DEV-FE · 801

**M360-612 · EN/FR UI toggle** — P2 · 1h · DEV-FE · 601

**M360-613 · Accessibility + responsive pass** — P1 · 1h · DEV-FE · all UI
*Done when:* Tab reaches every control in drawers/modals; contrast checked; 1024 px projector OK.

### EPIC 7 — Export and deploy

**M360-701 · Static Markdown export** — P0 · 1h · DEV-BE · 101–107
*Do:* `npm run export-docs` → `docs/BRIEF.md, ANSWERS.md, TIMELINE.md, DECISIONS.md, CONTRADICTIONS.md, ACTIONS.md, SOURCES.md, UPDATE_TEMPLATE.md` with relative links to corpus files (`../corpus/...`) and locators.
*Done when:* browsing `docs/ANSWERS.md` on GitHub, every link opens the right file.

**M360-702 · Deploy + safeguards** — P0 · 1h · DEV-BE · 001
*Do:* Deploy; key server-side; rate limit; spending cap; health check.
*Done when:* URL works in a private window with no login.

**M360-703 · Offline/local runbook (ours)** — P0 · 0.5h · DEV-BE · 702
*Do:* README section "Run locally in 2 commands"; ZIP of repo for Devpost upload.
*Done when:* a teammate runs it on a clean machine from README only.

### EPIC 8 — Deliverables, demo, submission

**M360-801 · USAGE.md (deliverable 5)** — P0 · 1h · LEAD · most
*Do:* Fill §26 template.
*Done when:* covers opening, navigation, tools used, manual steps, limits, uncertain information.

**M360-802 · Repo README** — P0 · 0.5h · LEAD
*Done when:* top section has live link, docs link, 30-second pitch, how to verify evidence.

**M360-803 · PowerPoint deck** — P0 · 2h · DEV-FE or LEAD · 602
*Do:* §24.2 outline; screenshots from the app; export PDF too.

**M360-804 · Demo script + 2 timed rehearsals** — P0 · 1.5h · ALL · 504
*Do:* §24.1; include a live upload with a rehearsal file; practice the "show your search" moment.

**M360-805 · Devpost submission** — P0 · 0.5h · LEAD · all
*Do:* §25 checklist. Submit by 10:30 at the latest.

**M360-806 · Final QA** — P0 · 1h · ALL · all
*Do:* §28 checklist, sign-off by two people.

---

## 23. Schedule and team roles

### 23.1 Roles (map to people)
| Role | Responsibility | Primary tickets |
|---|---|---|
| **LEAD** | Scope keeper, Devpost, README/USAGE, timekeeper, final say on cuts | 003, 801, 802, 805, 806 |
| **AN-1** (analyst) | Q01–Q05, timeline, decisions, brief, source registry | 101, 103, 104, 107, 109 |
| **AN-2** (analyst) | Q06–Q10, contradictions, actions, screenshots, rehearsal kit | 102, 105, 106, 108, 110, 506 |
| **DEV-BE** | Parsers, locators, verifier, chat API, update engine, export, deploy | 002, 004, 2xx, 301, 305, 401, 403, 501, 503, 7xx |
| **DEV-FE** | Shell, design, evidence drawer, viewers, all pages, deck visuals | 001, 302–304, 402, 502, 504, 505, 6xx, 803 |

Team of 4: Person 1 = LEAD + AN-1 · Person 2 = AN-2 · Person 3 = DEV-BE · Person 4 = DEV-FE.
Team of 3: Person 1 = LEAD + AN-1 + AN-2 (use AI heavily for verification) · Person 2 = DEV-BE · Person 3 = DEV-FE.
Team of 2: Person 1 = LEAD + analysts + deck · Person 2 = full-stack; cut all P1/P2 tickets.

### 23.2 Timeline to the deadline (assumes start ~15:00 Oct 3; shift if needed)
| Time | Block | Goals | Checkpoint (15 min, everyone) |
|---|---|---|---|
| 15:00–15:30 | Kickoff | Read §1–5; assign roles; 001, 002, 003 | Repo + Devpost draft exist |
| 15:30–19:00 | Block 1 | AN: 101, 102, 109 · BE: 004, 201–205, 209 · FE: 601, 302 | **19:00** Answers verified (draft JSON); all corpus ingested; app shell |
| 19:00–23:00 | Block 2 | AN: 103–107, 110 · BE: 207, 301, 305, 401, 501 · FE: 303, 304, 602–604 | **23:00** KB complete; chat answers with verified citations; overview + questions pages |
| 23:00–03:00 | Block 3 | BE: 502, 503, 403, 701, 702 · FE: 504, 605–608 · AN: 506, review UI content, draft USAGE | **03:00** Live upload works end-to-end on R1 and R2 |
| 03:00–07:00 | Block 4 | Sleep in rotation (2–3 h each). 505, 613, 803 (deck), bug fixes, golden tests | **07:00** Feature freeze |
| 07:00–09:30 | Polish | Rehearsal ×2 (804), README, USAGE, export, Devpost text | **09:30** Go/no-go on what ships |
| 10:00 | Code freeze | Only typo fixes | — |
| **10:30** | Submit | §25 checklist | Submitted |
| **11:00** | Deadline | — | — |

Cut order if late (cut from the top): 612 FR/EN toggle → 609 team page → 505 diff polish → 403 golden tests → 208 docx. **Never cut** 101/102 (answers), 302 (evidence drawer), 502–504 (live update), 701 (static export), 801 (usage guide).

---

## 24. Demo script and PowerPoint outline

Sponsor asked for live demo **and** PowerPoint at the same time. Run the app full-screen on one display/tab and the deck in another; switch with a single shortcut. One presenter drives, one handles Q&A, one watches the clock.

### 24.1 Demo script (~7 min + Q&A)
| Time | Screen | Say / do |
|---|---|---|
| 0:00 | Slide 1 | "Taking over a project means reading 64 scattered files. We built a memory that does it in 10 minutes, with proof." |
| 0:30 | Slide 2 | Principles: evidence first; proposal ≠ decision; delivered ≠ validated; baseline preserved |
| 1:00 | App · Overview | "Your mock-up says *on track*. Our memory says **Oct 22, conditional, 0 of 3 conditions met**." Point at conditions tracker |
| 1:45 | Click runbook chip | Drawer opens the screenshot: step 4 rollback TODO, step 5 to complete. "Only visible in the screenshot." |
| 2:15 | Questions · Q05 | 204 000 $ = 180 000 + CR-01; CR-04 is a draft; invoiced vs paid. Click CR-01 chip |
| 2:45 | Contradictions | Plan v3 still says Oct 15 (12 Sept); risk register still lists the connector (29 Sept). "A recent file date doesn't make it true." |
| 3:15 | Ask | "Is security accepted?" → No; delivery Sept 19 vs validation pending; verified quotes. Mention citation verifier |
| 3:45 | Update | Drop the organizers' new file. Show the 3 columns: problem status / prior decision / new proposal. Guardrails green. Publish. Diff on Q01 and conditions. "Baseline is still here." |
| 5:30 | Slide | How it works (one diagram), tools, manual steps, limits |
| 6:15 | Slide | What's next (multi-project, auto briefing) + thank you |

**Prepared Q&A answers:** How does it operate (ingest → segments with locators → curated KB → grounded chat → update engine)? What formats (eml+attachments, txt, md, pdf, xlsx, csv, png/jpg, docx)? What if the LLM is down (all pages and evidence still work; static docs)? How do you prevent hallucination (citations must match source text verbatim; guardrails on approvals)? What was manual (answers and screenshot transcriptions human-verified; update reviewed before publishing)? What's uncertain (§26 list)?

### 24.2 PowerPoint outline (8–9 slides, export to PDF too)
1. Title: Mémoire 360 — NOVA's operational memory (team name exactly as HxBuddy)
2. The problem: 64 files, 8 formats, contradictions, traps (one visual of the corpus map)
3. Our principles: evidence-first + lifecycle (proposal → decision → delivery → validation)
4. NOVA at a glance (baseline): owner, date + 3 conditions, scope, budget/invoices
5. Ten answers: scoreboard view with sources count per answer
6. Contradictions we resolved (C1 plan, C2 risk register, C3 status report)
7. Live update: how we integrate new information without losing history
8. How it's built: architecture diagram, tools, manual steps, limits
9. What's next + thank you

Style: same tokens as the app; real screenshots of the app; minimal text; no stock AI imagery.

---

## 25. Devpost submission checklist

- [ ] Project name: **Mémoire 360 — NOVA** (or team's choice); team = exact HxBuddy team name and members
- [ ] Tagline (≤ 1 line): "Take over a project in 10 minutes, with proof."
- [ ] Description includes a **deliverables map**:
  1. One-page brief → app `/brief` + `docs/BRIEF.md`
  2. Consultable memory (timeline, decisions, contradictions, sources, actions) → app routes + `docs/`
  3. Ten sourced answers → app `/questions` + `docs/ANSWERS.md`
  4. Update after new information with preserved history → app `/update` + rehearsal example (labeled simulation) + `docs/UPDATE_TEMPLATE.md`
  5. Usage guide → `USAGE.md` + app `/guide`
- [ ] Links: **public** GitHub repo; live URL (no login); `docs/` link
- [ ] Image gallery: 3–5 app screenshots (overview, evidence drawer, update review)
- [ ] Optional video < 2 min
- [ ] Built with: Next.js, TypeScript, Tailwind, shadcn/ui, 21st.dev, mailparser, pdf.js, exceljs, papaparse, MiniSearch, [LLM provider]
- [ ] Additional info → Sponsor / Special Prizes → **Loto-Québec - Projet 360** (exactly one)
- [ ] Upload ZIP of the repo (backup)
- [ ] Accept terms → **Submit** by 10:30; check it shows as submitted
- [ ] Open the live URL and repo in a private window to confirm public access

---

## 26. Usage guide template (USAGE.md, deliverable 5)

```
# Mémoire 360 — Usage guide

## Opening
- Live: <URL> (jurors need no paid subscription or personal Claude/OpenAI account;
  hosted AI access uses the deployment/team's server configuration and supplied demo code)
- Static (no app needed): <repo>/docs/BRIEF.md, ANSWERS.md, …
- Local: `npm install && npm run build && npm start` (Node 20+). For AI features, set
  ANTHROPIC_API_KEY (or OPENAI_API_KEY + LLM_MODEL) in .env.local. Without a provider,
  browsing, evidence, search and source upload/review/publication still work.
  Chat, building the knowledge base, automatic impact analysis, answer recomputation
  and AI-assisted update interpretation require a configured provider.

## Navigation
Sidebar: Overview, Brief, Questions, Timeline, Decisions, Contradictions, Actions, Risks,
Sources, Team, Update, Guide. Header: version stamp + Baseline/Current toggle, search (Cmd+K),
question bar.

## Finding evidence
Every statement has an evidence chip (e.g. "M04 · L17–23"). Click it to open the source at
the exact line/page/cell/screenshot region. Locator format: <file>#L17-L23 | #page=1 |
#Sheet!F7 | #region=row-4 | #body:P3.

## Asking questions
Type in the question bar (EN or FR). Answers cite verbatim quotes; unverifiable citations
are removed and flagged. "Not documented in the corpus" means the files don't say it.

## Adding new information
With a configured AI provider: Update → drop any file (.eml, .txt, .md, .pdf, .xlsx, .csv, .png, .jpg, .docx) → review the
analysis (problem status / prior decision / new proposal, affected items, actions,
guardrails) → Publish as U00n. Baseline (Sept 30, 2026 09:00) is never modified; switch
versions in the header.
Without a provider: upload → review supported extracted text → optionally edit problem status,
prior decisions and proposal text → publish (demo code required if configured). This editor has
no controls for citations, proposer/authority metadata, formal new decisions, affected questions/
conditions/actions, condition status changes, new actions, or revised answers/brief. Empty impact
fields mean analysis was not performed. Publication checks guardrails and preserves the baseline;
it does not complete impact analysis or recompute answers. New images need a vision provider;
scanned PDFs without a text layer and unreadable formats are retained for manual review.
Existing baseline screenshot transcriptions remain available.

## Tools used
<list frameworks, libraries, LLM provider + model, 21st.dev components, AI coding assistants>

## Manual steps
- The ten answers, timeline, decisions, contradictions, actions and brief were curated
  by the team and verified line by line against the corpus.
- Screenshot transcriptions were generated by a vision model, then checked by a human.
- Every update is reviewed by a human before publishing.

## Limits
- LLM answers can be wrong; citations are machine-checked but interpretation is not.
- Screenshots show past states; ticket status prevails.
- Hosted version keeps updates in memory (download the ChangeSet); local version persists.
- Spreadsheet formulas are read as values; very large files are not optimized.

## Uncertain or missing information (as of Sept 30, 2026 09:00)
- SEC-210 security retest date (planned, not dated).
- ACC-303 fix build date ("next build").
- Runbook final delivery and approval date ("a few days before" go-live).
- Approval status of INV-003's milestone-3 line (36 000 $) is not documented.
- SSO-only production setting: decided, validation not documented.
- Data location: target environment verified in Canada Central; production not yet live.
```

---

## 27. Risks and fallbacks

| Risk | Likelihood | Impact | Mitigation / fallback |
|---|---|---|---|
| Wrong or imprecise answer (−2/−5 pts each) | Med | High | Two-person verification; golden tests; prompt 21.2 cross-check |
| LLM/API down or rate-limited during demo | Med | High | Precomputed baseline (no LLM needed); local run; manual update template §13.5; a second provider key |
| Live upload of an unexpected format | Med | High | "other" handler never crashes; manual review path; rehearse with R7 |
| Vision misreads a screenshot | Low | Med | Baseline transcriptions human-verified and cached |
| Model invents an approval in update | Med | High | Code guardrails move it to newProposals; human review before publish |
| UI eats all the time | High | Med | Feature freeze 07:00; cut order §23.2; 21st.dev for speed |
| Repo not public / Devpost challenge not selected | Low | Fatal | §25 checklist; private-window check |
| Jury can't open the app | Low | High | Static `docs/` + ZIP on Devpost |
| Team exhaustion | High | Med | Sleep rotation in Block 4 |
| Late submission | Low | Fatal | Submit at 10:30; draft created at kickoff |

---

## 28. Final QA checklist (definition of done)

**Content**
- [ ] Q01–Q10 each: correct, nuanced, ≥2 distinct sources, verbatim quotes, locators open the right place
- [ ] Proposal vs decision (Q03), delivery vs validation (Q08) explicit
- [ ] Budget: authorized 204 000 $; invoiced vs paid separated; CR-04 excluded; ORION excluded
- [ ] Runbook: steps 4 and 5 both named (Q10)
- [ ] ≥2 contradictions with rule; C1 (plan) and C2 (risk register) present
- [ ] Brief: 5 themes on one printed page; 3 conditions → actions/owners/due-or-TBC
- [ ] Recommendations labeled as ours; commitments sourced; no invented dates
- [ ] Duplicates not counted twice; noise ignored; historical screenshots labeled

**Product**
- [ ] Opens with no login and no API key; static docs render on GitHub
- [ ] Every chip opens the right locator (spot-check 15 random chips)
- [ ] Search finds "rollback", "CR-04", "échéance"/"echeance", "Sophie"
- [ ] Chat answers 5 demo questions with verified citations; says "Not documented" for an unknown fact
- [ ] Upload works for every format; R1 and R2 produce the expected 3-column output; baseline hashes unchanged after publish
- [ ] Keyboard: drawers/modals fully reachable by Tab, Esc closes; contrast OK; projector resolution OK

**Submission**
- [ ] Repo public; README with links; USAGE.md complete; deck + PDF in `deck/`
- [ ] Devpost: team name = HxBuddy; Loto-Québec - Projet 360 selected; links work in private window; submitted before 10:30

---

## 29. Glossary FR ↔ EN and people directory

### 29.1 Glossary
| French (corpus) | English | Note |
|---|---|---|
| mise en production / go-live | go-live / production launch | |
| date cible | target date | |
| chargé(e) de projet | project manager | |
| comité de direction / comité de projet | steering committee / project committee | CR-01 approved by "Comité de projet" |
| **CR** | **⚠ two meanings**: *compte rendu* (meeting minutes, e.g. `M01_CR_Demarrage`) and *demande de changement* (change request, e.g. `CR-01`, `CR-04`) | Don't confuse |
| demande de changement | change request | |
| brouillon | draft | |
| approuvé(e) | approved | |
| facture · payée · en validation | invoice · paid · under review | |
| jalon · acompte | milestone · deposit | |
| hors taxes | before tax | |
| portée | scope | |
| correctif · livré · déployé | fix · delivered · deployed | delivered ≠ accepted |
| re-test · validation · accepté | retest · validation · accepted | |
| journalisation · journal d'audit | logging · audit log | |
| retour arrière (rollback) | rollback | |
| validation fonctionnelle post-déploiement | post-deployment functional validation | |
| go exploitation | operations go-ahead | |
| hébergement · localisation des données | hosting · data location | |
| doublons · idempotence | duplicates · idempotency | |
| jeton (de service) | (service) token | |
| échéance · à confirmer | due date · to be confirmed (TBC) | |
| bloquant | blocker | |
| ouvert · fermé · en validation | open · closed · in validation | |

### 29.2 People directory (all fictional)
| Person | Organization / role | Since / period | Owns |
|---|---|---|---|
| **Nicolas Perron** | Project manager (chargé de projet) | **Since 16 Sept 2026** (official); chairs Friday committee | Overall; go/no-go; scope position on CR-04 |
| Élodie Caron | Former project manager | 7 Jul → 16 Sept 2026 (available a few days after) | Chaired 10 Sept decision |
| Sophie Lambert | Security | Throughout | SEC-210 validation (Cond. 1); risk R-02; data-in-Canada requirement |
| Mélissa Gagnon | Accessibility / QA; integrated tests (plan P-04) | Throughout | ACC-303 closure (Cond. 2); risk R-04 |
| Olivier Côté | Operations (exploitation); plan P-05 | From 10 Sept committee | Runbook approval (Cond. 3); risk R-03 |
| Marc Gervais | Architecture / integration (connector) | Throughout | INT-101 (closed); risk R-01; architecture validation |
| Camille Beaulieu | Data migration | Throughout | DATA-401 (closed); risk R-05 (closed) |
| Julien Moreau | **Boréal Numérique** (vendor) lead | Throughout | Fixes (ACC-303 next build), runbook content (ops team), proposals (22 Oct, CR-04) |
| Amélie Fortin | Finances | — | INV-003 validation |
| Alex Deschamps | Communications | — | Status message draft (E11) |
| Boréal Numérique Inc. | Vendor (contract 180 000 $ max, 7 Jul–31 Oct 2026) | — | Phase-1 delivery |

---

*End of SPEC. If something here conflicts with README.txt or the sponsor's instructions, the instructions win; update this file and tell the team.*
