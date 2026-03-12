# INTEGRATION.md — Connector Capabilities

## Overview

This project uses two Lovable connectors to power key features:

1. **Telegram Bot** (GuruBot) — PDF storage & messaging
2. **Firecrawl** — Web scraping & knowledge ingestion

Both are linked via Lovable Settings → Connectors and inject API keys as environment variables into Supabase Edge Functions.

---

## 1. Telegram Bot Connector

**Connection ID:** `std_01kkgzv9mefscanb4r6j7gnhpp`  
**Secret injected:** `TELEGRAM_API_KEY`  
**Gateway URL:** `https://connector-gateway.lovable.dev/telegram`

### Capabilities

| Feature | API Method | Description |
|---------|-----------|-------------|
| **Send Message** | `sendMessage` | Send text messages to users/groups/channels |
| **Send Document** | `sendDocument` | Upload & send files (up to 2GB per file) — **used for PDF storage** |
| **Get File** | `getFile` | Get file download path by `file_id` — **used for PDF retrieval** |
| **Send Photo** | `sendPhoto` | Send images |
| **Send Video** | `sendVideo` | Send video files |
| **Send Audio** | `sendAudio` | Send audio files |
| **Get Updates** | `getUpdates` | Long-poll for incoming messages (webhooks not supported in Lovable) |
| **Send Location** | `sendLocation` | Send GPS coordinates |
| **Inline Keyboards** | via `reply_markup` | Interactive buttons in messages |
| **Edit Message** | `editMessageText` | Edit previously sent messages |
| **Delete Message** | `deleteMessage` | Remove messages |
| **Get Chat** | `getChat` | Get chat/channel info |
| **Get Chat Member** | `getChatMember` | Check user membership |
| **Set Webhook** | ❌ Not supported | Use `getUpdates` instead |

### How We Use It: PDF Storage

- **Upload:** Admin uploads PDF → Edge function sends via `sendDocument` to a private channel → stores `file_id` in `telegram_files` table
- **Download:** Student requests PDF → Edge function calls `getFile` → proxies file content back
- **Cost:** ₹0 — Telegram provides unlimited free file hosting (up to 2GB per file)
- **Security:** Bot token never exposed to client; all requests proxied through edge functions

### Required Secret

| Secret | Description |
|--------|-------------|
| `TELEGRAM_CHAT_ID` | The chat/channel ID where PDFs are stored. Get it by forwarding a message from the channel to `@userinfobot` |

---

## 2. Firecrawl Connector

**Connection ID:** `std_01kkh01y8xe6g8drde4rr2x4d2`  
**Secret injected:** `FIRECRAWL_API_KEY`  
**API URL:** `https://api.firecrawl.dev` (direct, no gateway needed)

### Capabilities

| Feature | Endpoint | Description |
|---------|----------|-------------|
| **Scrape** | `POST /v1/scrape` | Extract content from a single URL |
| **Search** | `POST /v1/search` | Web search with optional content scraping |
| **Map** | `POST /v1/map` | Discover all URLs on a website (fast sitemap) |
| **Crawl** | `POST /v1/crawl` | Recursively scrape multiple pages |

### Scrape Output Formats

| Format | Description |
|--------|-------------|
| `markdown` | Clean, LLM-ready text (default) |
| `html` | Processed HTML without scripts/styles |
| `rawHtml` | Original unmodified HTML |
| `links` | Array of all URLs found on the page |
| `screenshot` | Base64 screenshot of the page |
| `branding` | Extracts brand identity (colors, fonts, logos) |
| `json` | LLM-powered structured data extraction |
| `summary` | AI-generated concise summary |

### How We Use It: Knowledge Ingestion

- **Crawl URL → Knowledge Base:** Admin pastes a URL (NCERT chapter, study site, current affairs) → Firecrawl scrapes the page as markdown → content is chunked and saved to `knowledge_base` table → Sarthi chatbot uses it for RAG responses
- **Replaces:** Old Crawl4AI Docker-based scraper (no Docker deployment needed anymore!)

### Search Parameters

| Parameter | Description |
|-----------|-------------|
| `query` | Search query string |
| `limit` | Number of results (1-100) |
| `lang` | Language filter |
| `country` | Country filter |
| `tbs` | Time filter: `qdr:h` (hour), `qdr:d` (day), `qdr:w` (week), `qdr:m` (month) |

### Rate Limits & Credits

- Firecrawl uses a credit-based system
- Each scrape = 1 credit
- Check your plan at [firecrawl.dev](https://firecrawl.dev)
- If you get 402 errors, top up credits or upgrade plan

---

## 3. Edge Functions Summary

| Function | Purpose | Connector Used |
|----------|---------|----------------|
| `telegram-upload` | Upload PDF to Telegram, save `file_id` | Telegram |
| `telegram-download` | Retrieve PDF from Telegram, stream to client | Telegram |
| `crawl4ai-bridge` | Scrape/ingest web content into knowledge base | Firecrawl |
| `chatbot` | AI chatbot with RAG from knowledge base | Lovable AI Gateway |

---

## 4. Architecture Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Admin UI   │────▶│  telegram-upload  │────▶│  Telegram Bot   │
│ (PDF Upload) │     │  (Edge Function)  │     │  (Free Storage) │
└─────────────┘     └──────────────────┘     └─────────────────┘
                                                       │
                                                  file_id saved
                                                       │
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Student UI  │────▶│ telegram-download │────▶│  Telegram API   │
│ (PDF View)   │     │  (Edge Function)  │     │  (getFile)      │
└─────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin UI    │────▶│  crawl4ai-bridge  │────▶│  Firecrawl API  │
│ (Crawler)    │     │  (Edge Function)  │     │  (Scrape)       │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                    chunks saved to
                     knowledge_base
                            │
                    ┌───────▼───────┐
                    │ Sarthi Chatbot│
                    │  (RAG Bot)    │
                    └───────────────┘
```

---

## 5. Setup Checklist

- [x] Telegram connector linked to project
- [x] Firecrawl connector linked to project
- [x] `telegram_files` table created with RLS
- [x] `telegram-upload` edge function deployed
- [x] `telegram-download` edge function deployed
- [x] `crawl4ai-bridge` rewritten to use Firecrawl
- [ ] `TELEGRAM_CHAT_ID` secret set (admin needs to provide)
- [ ] Test PDF upload → Telegram → download flow
- [ ] Test Firecrawl scrape → knowledge base ingestion
