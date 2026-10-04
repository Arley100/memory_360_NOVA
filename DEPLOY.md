# Deploying Mémoire 360 on Vercel (shared test environment)

The live demo still runs from the presenter's laptop (fastest, no cold starts). The hosted copy lets the whole
team test and rehearse from a browser.

## What changes when hosted

- **Updates are stored outside the repository** in Upstash Redis (the hosted filesystem is read-only).
  The baseline (corpus + knowledge base) ships with the code and is never modified.
- **A demo code protects everything that spends API credits or changes the state**: Ask, update analysis,
  publish and reset. Browsing, evidence and search stay open. A browser stays unlocked for 7 days.
- **Uploads are limited to about 4.5 MB per request** (hosting limit). Compress or split larger files.

Jurors need no paid subscription or personal Claude/OpenAI account. AI access is provided by the
deployment/team's server configuration; jurors use the supplied demo code.

Without a configured AI provider, browsing, evidence and search still work. Source files can be uploaded,
supported text extracted and reviewed, and published as a new version (with the demo code if configured).
The manual fallback edits only problem status, prior decisions and proposal text. It has no controls for
citations, proposer/authority metadata, formal new decisions, affected questions/conditions/actions,
condition status changes, new actions, or revised answers/brief. Empty impact fields mean analysis was
not performed, not that no items are affected. Publishing runs code guardrails and preserves the baseline;
it does not complete impact analysis or recompute answers.

Chat, building the knowledge base, automatic impact analysis, answer recomputation and AI-assisted update
interpretation require a configured provider. New images need a vision-capable provider for transcription;
scanned PDFs without a text layer and unreadable formats are retained for manual review, not automatically
read. Existing baseline screenshot transcriptions remain available.

## Steps (about 10 minutes)

1. **Push the repo to GitHub** (private is fine).
2. **Import it in Vercel**: vercel.com → Add New → Project → pick `memory_360_NOVA` → Framework: Next.js
   (detected). Don't deploy yet if it offers; or let it deploy and redeploy after step 4.
3. **Add storage**: in the project, open **Storage** → create or connect an **Upstash for Redis** database
   (free plan) → connect it to this project. This adds the connection variables automatically
   (`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`; both work).
4. **Add environment variables** (Settings → Environment Variables, Production):
   - `ANTHROPIC_API_KEY` = a key created for this deployment only (e.g. `codeml-nova-vercel`), marked **Sensitive**
   - `DEMO_CODE` = a code you choose (not a password you use anywhere else)
   - optional: `LLM_CACHE_TTL` = `1h`
5. **Deploy** (Deployments → Redeploy if it was already deployed). Open the URL:
   the header should show the green "AI configured" dot, and Ask should ask for the demo code.
6. **Share the URL and the code with teammates privately** (team DM, never a public channel).

Every `git push` to `main` redeploys automatically.

## Rehearsing on the hosted copy

Add new information → drop the files from `rehearsal/` → review → publish. Use **Reset to baseline** on the
same page when you're done, so the next person starts clean. Reset before the real presentation.

## After the hackathon

Delete the Vercel project (or its `ANTHROPIC_API_KEY` variable) and delete the API key in the Claude Console.
