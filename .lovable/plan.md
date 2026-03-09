
## Full Analysis

### What's Already Done (Good news!)
The Crawl4AI integration is **already implemented** from the previous approved plan:
1. `supabase/functions/crawl4ai-bridge/index.ts` - fully built (282 lines), handles `scrape` and `ingest` modes with polling
2. `supabase/functions/chatbot/index.ts` - already has `fetchWebContext()` and web fallback logic
3. `src/pages/AdminChatbotSettings.tsx` - already has a "Crawler" tab (lines 671-828) with crawl form + history
4. `crawl_history` DB table - already migrated
5. Secrets `CRAWL4AI_API_URL` and `CRAWL4AI_API_TOKEN` - already saved

### What the User is NOW Asking
1. **Read the Crawl4AI docs** (done — key findings below)
2. **Improve/verify the integration against actual docs** — fix any API mismatches
3. **"Applicable in my build release"** — add the setup guide to the APK release notes and/or admin panel

### Key Findings from Crawl4AI Docs

**Docker API (what we're using):**
```bash
docker run -p 11235:11235 unclecode/crawl4ai:basic
# Endpoint: POST http://localhost:11235/crawl
```

**Current code issue #1:** The bridge uses `/crawl` POST with `urls` array + `crawler_params`. Per docs this is the correct REST API.

**Current code issue #2:** The chatbot's `fetchWebContext` tries to crawl a Google search URL (`google.com/search?q=...`) — **Google blocks headless crawlers**. This will always return empty content. Should use a direct educational URL or a proper search API instead.

**Current code issue #3:** The bridge sends `crawler_params: { headless: true }` and `extra: { only_text: true }` — the correct Crawl4AI v0.4+ REST API fields are `crawler_params` with `headless` (correct), but `extra` is not a standard field. Should use `extraction_config` or just rely on default markdown output.

**Current code issue #4:** The Crawler tab's "Setup Banner" says "Docker experimental" but the latest docs (v0.4+) have a stable Docker API at port 11235. Need to update copy to reflect this.

**Current code issue #5:** The setup guide in AdminChatbotSettings says:
```
docker run -p 11235:11235 -e CRAWL4AI_API_TOKEN=yourtoken unclecode/crawl4ai:latest
```
But per docs, the tag is `unclecode/crawl4ai:basic` for the API server. The `latest` tag may be the Python package, not the server.

**"Applicable in build release"** means:
- The GitHub Actions APK build workflow should embed a proper deployment guide 
- The `src/pages/Install.tsx` should show Crawl4AI setup instructions for admins
- OR, more likely: add a "Deployment Checklist" section to the admin panel that shows what needs to be set up including Crawl4AI

### What Needs to Be Fixed

**1. Fix `crawl4ai-bridge/index.ts`:**
- Fix the API body to match actual Crawl4AI Docker REST API format
- The correct POST body per docs: `{ urls: ["..."], priority: 8 }` — `crawler_params` is nested inside correctly
- Remove `extra: { only_text: true }` which is not a valid field; markdown is returned by default

**2. Fix `chatbot/index.ts` - `fetchWebContext()`:**
- Don't crawl Google (it blocks bots)
- Instead, use a direct educational URL approach — build a topic URL like `https://ncert.nic.in/textbook.php` or use a Wikipedia search URL which is crawlable
- Better: use `https://en.wikipedia.org/wiki/Special:Search?search=QUERY` or directly `https://en.wikipedia.org/wiki/TOPIC`

**3. Update Admin Crawler Tab UI:**
- Fix setup banner text to use correct Docker image tag (`basic` not `latest`)  
- Add a "Test Connection" button to verify the Crawl4AI service is reachable
- Add Railway deployment link with step-by-step

**4. "Applicable in build release" — add to GitHub Actions release notes:**
- Add a "Admin Setup Required" section to the release body in `build-apk.yml`
- This tells whoever deploys the APK that they need Crawl4AI running

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/crawl4ai-bridge/index.ts` | Fix API body format, remove invalid `extra` field, improve error messages |
| `supabase/functions/chatbot/index.ts` | Fix `fetchWebContext` to not crawl Google; use Wikipedia/NCERT direct URLs instead |
| `src/pages/AdminChatbotSettings.tsx` | Fix Docker image tag, add "Test Connection" button, improve setup guide |
| `.github/workflows/build-apk.yml` | Add Admin Setup section to release notes mentioning Crawl4AI |

### Plan

**1. Fix `crawl4ai-bridge` edge function:**
- Remove `extra: { only_text: true }` (invalid field per docs)
- Use correct request format matching Crawl4AI Docker REST API v0.4+
- The response format: `result.results[0].markdown` is correct
- Add a `GET /health` check endpoint support for the test button

**2. Fix chatbot web fallback:**
- Replace Google search URL (blocked by bots) with:
  - Wikipedia search: `https://en.wikipedia.org/wiki/Special:Search?search=QUERY&ns0=1`
  - Or NCERT for science/math: construct based on query classification
- This makes web fallback actually work when Crawl4AI is deployed

**3. Update Admin UI in `AdminChatbotSettings.tsx`:**
- Fix Docker tag from `latest` → `basic`  
- Add "Test Crawl4AI Connection" button (calls bridge with `mode: 'health'`)
- Add step-by-step Railway deployment mini-guide with correct commands
- Show connection status (green/red dot)

**4. Update `build-apk.yml` release body:**
- Add "Admin Deployment Checklist" section mentioning Crawl4AI Docker setup
- This makes the APK release self-documenting for admins

---

## Plan Summary

**4 files to change**, all focused on correctness vs the actual Crawl4AI docs:

1. Fix the bridge edge function API format (remove invalid field, match actual Docker REST API)
2. Fix chatbot fallback to use a crawlable URL instead of Google 
3. Update Admin UI with correct Docker tag + connection test button
4. Update APK release notes to include admin deployment steps

The integration is architecturally sound — just needs these accuracy fixes based on reading the actual docs.
