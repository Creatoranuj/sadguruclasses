
## Goal
Integrate Crawl4AI into Sadguru Sarthi AI chatbot so that:
1. Sarthi can **scrape live web content** (NCERT, study sites, current affairs, etc.) when a student asks a question that needs up-to-date or external information
2. Admin can **trigger URL crawling** from the Chatbot Settings panel to auto-populate the `knowledge_base` table (RAG memory) with fresh content

---

## Key Technical Understanding

### Why Crawl4AI Cannot Run Directly in Lovable
Crawl4AI is a **Python library** that requires:
- Playwright (headless browser)
- Python runtime
- Docker container

Lovable runs TypeScript/Deno Edge Functions — Python cannot run here directly.

### The Solution: Crawl4AI as an External Microservice
```text
[Student asks question]
        ↓
[Sarthi chatbot Edge Function]
        ↓ (if web search needed)
[crawl4ai-bridge Edge Function] ──────→ [Crawl4AI Docker API on Railway/Render]
        ↓                                        (POST /crawl, port 11235)
[Scraped markdown returned]
        ↓
[Injected into AI prompt as context]
        ↓
[AI gives grounded, up-to-date answer]
```

### Crawl4AI Docker API facts (confirmed from docs):
- Runs on port `11235`
- POST `/crawl` → returns `task_id`
- GET `/task/{task_id}` → polls for result
- `CRAWL4AI_API_TOKEN` env var enables bearer token auth
- Returns markdown, links, HTML — perfect for RAG injection
- **Free & open-source** — deploy once on Railway (free tier) or any VPS

---

## What Will Be Built

### 1. New Supabase Secret: `CRAWL4AI_API_URL` + `CRAWL4AI_API_TOKEN`
Stored securely as Supabase secrets → never exposed in frontend code.

### 2. New Edge Function: `supabase/functions/crawl4ai-bridge/index.ts`
A Deno edge function that:
- Accepts a `url` and `mode` (`scrape` or `ingest`)
- Calls the self-hosted Crawl4AI Docker API
- Polls for result (async job)
- Returns cleaned markdown text
- `ingest` mode also saves result directly to `knowledge_base` table

### 3. Updated `chatbot` Edge Function
Add a **web search trigger** — when query type is `technical` or `general` AND no RAG result is found, it:
- Calls `crawl4ai-bridge` with a relevant URL
- Injects the scraped content as additional context
- Labels it clearly: "Live web content" in the prompt

### 4. Admin Panel Update: `AdminChatbotSettings.tsx` — "Web Crawler" Tab
New 5th tab in the chatbot settings page:
- **URL Input**: Admin pastes any URL (NCERT chapter, Sadguru website page, etc.)
- **"Crawl & Add to Memory" button** — calls `crawl4ai-bridge` in `ingest` mode
- Shows crawl status (pending → completed → saved)
- **Crawl History**: Table showing last 10 crawled URLs, date, KB entries created

### 5. Database: New table `crawl_history`
```sql
id uuid, url text, status text, 
knowledge_entries_created int, 
crawled_at timestamptz, crawled_by uuid
```

---

## Architecture Diagram
```text
Frontend (React)
│
├── /admin/chatbot-settings
│   └── "Web Crawler" tab (NEW)
│       ├── Input URL → crawl4ai-bridge → knowledge_base
│       └── Crawl history log
│
└── Chat Widget (existing)
    └── User message → chatbot edge fn
                       └── (if needed) crawl4ai-bridge → scraped markdown
                                                          → AI response with fresh context
                                                          
Supabase Edge Functions
├── chatbot/index.ts (UPDATED — add web fallback)
└── crawl4ai-bridge/index.ts (NEW)

External Service (you deploy once)
└── Crawl4AI Docker Container
    └── Railway / Render / VPS
        └── POST /crawl → returns task_id
        └── GET /task/{id} → returns markdown
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/crawl4ai-bridge/index.ts` | CREATE new edge function |
| `supabase/functions/chatbot/index.ts` | UPDATE — add web fallback logic |
| `src/pages/AdminChatbotSettings.tsx` | UPDATE — add Web Crawler tab |
| `supabase/config.toml` | UPDATE — add crawl4ai-bridge function config |
| Supabase secrets | ADD `CRAWL4AI_API_URL` and `CRAWL4AI_API_TOKEN` |
| SQL migration | CREATE `crawl_history` table |

---

## Security: How API Keys Are Hidden
- `CRAWL4AI_API_URL` → Supabase secret (Deno.env.get) — never in frontend
- `CRAWL4AI_API_TOKEN` → Supabase secret (Deno.env.get) — never in frontend  
- Frontend only calls `supabase.functions.invoke('crawl4ai-bridge')` — no URL/token exposed
- Crawl4AI Docker runs behind token auth — only our Edge Function can access it

---

## Deployment Step for User (One-Time Manual)
After code changes are deployed, user needs to:
1. Deploy Crawl4AI Docker on **Railway** (free):
   ```
   docker run -p 11235:11235 -e CRAWL4AI_API_TOKEN=your_secret unclecode/crawl4ai:latest
   ```
2. Copy the Railway public URL → Add as `CRAWL4AI_API_URL` Supabase secret
3. Add `CRAWL4AI_API_TOKEN` as Supabase secret

This is a one-time setup. The plan includes step-by-step instructions on the admin panel.

---

## What the Crawl4AI Python file shows
The uploaded `.py` notebook is a **Google Colab demo** showing:
- `crawl4ai` v0.8.0 installation  
- `playwright`, `AsyncWebCrawler` usage
- This confirms the library capabilities we're integrating via its Docker REST API

The Python code itself won't run in Lovable — we use the same library's **HTTP API** (Docker) instead, which is the production-recommended approach per crawl4ai docs.
