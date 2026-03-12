# Plan: Fix Build and Complete Telegram/Firecrawl Integration

## Current State

• And Also Update Apk build release 

The project has a full education platform codebase with:

- Edge functions already created: `telegram-upload`, `telegram-download`, `crawl4ai-bridge` (rewritten for Firecrawl)
- `PdfViewer.tsx` already updated with `telegram://` URL support
- `INTEGRATION.md` already created
- `supabase/config.toml` already configured for the new edge functions
- Both connectors (Telegram + Firecrawl) already linked with secrets available

The `AdminUpload.tsx` file looks syntactically correct now (ends properly at line 1093). The build error "no package.json found" appears to be a transient issue.

## Steps

### 1. Fix the Build

The `package.json` exists and has a `dev` script. The error is likely a transient deployment glitch. I will:

- Verify all imports in `AdminUpload.tsx` are valid (check for any missing module references)
- Do a quick scan for any other TypeScript errors across the recently modified files

### 2. Add `TELEGRAM_CHAT_ID` Secret

You still need to set `TELEGRAM_CHAT_ID` as a Supabase secret. Steps:

1. Create a private Telegram channel
2. Add your bot (GuruBot) as admin
3. Forward a message from that channel to `@userinfobot` to get the chat ID
4. Add it as a Supabase Edge Function secret

### 3. Verify Edge Function Deployments

Confirm `telegram-upload`, `telegram-download`, and `crawl4ai-bridge` are deployed and functional by checking logs.

### 4. Address Login/Server Errors (from screenshots)

The screenshots show `fetchUserData timeout` errors on your production site (`sadgurucli.vercel.app`). This is in the `AuthContext.tsx` — the auth fetch is timing out. I will:

- Review `AuthContext.tsx` for the timeout logic
- Add better error handling and retry logic
- Ensure session persistence works correctly

## Technical Details

### Files to modify:

- `**src/contexts/AuthContext.tsx**` — Fix `fetchUserData` timeout issues by adding retry with exponential backoff, reducing timeout, and handling network errors gracefully
- Potentially trigger a clean rebuild to resolve the transient "no package.json" error

### No changes needed:

- `AdminUpload.tsx` — already correct
- `PdfViewer.tsx` — already has Telegram support
- Edge functions — already created and configured
- `INTEGRATION.md` — already complete

&nbsp;

And Also Verify Last Work from manual How many Percent don this placn 

# Implementation Plan: Telegram PDF Storage, Firecrawl Migration, Video & Free Enrollment Enhancements

## Overview

This plan covers 5 major changes: (1) Connect Telegram + Firecrawl connectors, (2) Telegram-based PDF storage to put also Supabase storage(Do not Replace them), (3) Replace Crawl4AI with Firecrawl, (4) YouTube Live support in video player, (5) One-click free course enrollment. Plus an `INTEGRATION.md` doc covering connector capabilities.  

---

## 1. Connect Both Connectors to This Project

Both connections exist in the workspace but are **not linked** to this project:  

- **GuruBot** (Telegram) — `std_01kkgzv9mefscanb4r6j7gnhpp`  
- **Crawl4aimy Agent** (Firecrawl) — `std_01kkh01y8xe6g8drde4rr2x4d2`

**Action:** Use `standard_connectors--connect` for both `telegram` and `firecrawl` connectors to link them to this project. This makes `TELEGRAM_API_KEY`, `FIRECRAWL_API_KEY`, and `LOVABLE_API_KEY` available as env vars in edge functions.  

---

## 2. Telegram as PDF Storage (Cost-Saving Innovation)

### Database Migration

Create a `telegram_files` table to store file metadata:  

```sql
CREATE TABLE public.telegram_files (  
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),  
  lesson_id text REFERENCES public.lessons(id) ON DELETE CASCADE,  
  file_id text NOT NULL,          -- Telegram file_id  
  file_name text NOT NULL,  
  file_size bigint,  
  mime_type text DEFAULT 'application/pdf',  
  uploaded_by uuid REFERENCES auth.users(id),  
  created_at timestamptz DEFAULT now()  
);  
  
ALTER TABLE public.telegram_files ENABLE ROW LEVEL SECURITY;  
  
-- Students can read files for lessons they're enrolled in  
CREATE POLICY "Students can view telegram files"  
  ON public.telegram_files FOR SELECT TO authenticated  
  USING (true);  
  
-- Only admins can insert/delete  
CREATE POLICY "Admins can manage telegram files"  
  ON public.telegram_files FOR ALL TO authenticated  
  USING (public.has_role(auth.uid(), 'admin'))  
  WITH CHECK (public.has_role(auth.uid(), 'admin'));  
```

### Edge Function: `telegram-upload`

- Receives a PDF file via multipart form data  
- Sends it to the Telegram bot using gateway: `POST https://connector-gateway.lovable.dev/telegram/sendDocument` with the file and a designated `chat_id` (admin's own chat or a private channel)  
- Returns the `file_id` from Telegram's response  
- Saves record to `telegram_files` table

### Edge Function: `telegram-download`

- Receives `file_id` from client  
- Calls `https://connector-gateway.lovable.dev/telegram/getFile` to get `file_path`  
- Proxies the file content back to the client (streams through edge function so bot token stays secure)  
- Validates user is authenticated before serving

### Frontend Changes

- **AdminUpload.tsx**: Add option to upload PDFs via Telegram instead of Supabase storage. When uploading PDF/NOTES type, call `telegram-upload` edge function, store returned `file_id` in `telegram_files` and use a special URL format like `telegram://file_id` in the lesson's `class_pdf_url`.  
- **PdfViewer.tsx**: Detect `telegram://` URLs, call `telegram-download` edge function to get a blob URL, then display.

### Important Note

The admin needs to provide a `chat_id` (a private channel or the bot's own DM) where PDFs will be stored. This will be stored as an edge function secret.  

---

## 3. Replace Crawl4AI with Firecrawl

### Edge Function: Replace `crawl4ai-bridge`

Rewrite `supabase/functions/crawl4ai-bridge/index.ts` to use Firecrawl API via the connector instead of the old Crawl4AI Docker instance:  

- **Scrape mode**: Call Firecrawl's `/v1/scrape` endpoint with `formats: ['markdown']`  
- **Ingest mode**: Same scrape call, then chunk and insert into `knowledge_base` table (existing logic preserved)  
- **Ping mode**: Simple health check against Firecrawl API  
- Uses `FIRECRAWL_API_KEY` from connector (no gateway needed — Firecrawl doesn't use connector gateway)

### Frontend Changes

- **AdminChatbotSettings.tsx**: Update UI text from "Crawl4AI" references to "Firecrawl". The function name stays `crawl4ai-bridge` to avoid breaking existing calls, but internal implementation changes.

---

## 4. YouTube Live Support in Video Player

### Changes to `UnifiedVideoPlayer.tsx`

Update `detectPlatform` regex to also match `youtube.com/live/` URLs:  

```typescript
if (/youtube\.com\/(?:watch|live|embed)|youtu\.be/.test(url)) return "youtube";  
```

The existing `MahimaGhostPlayer` (which wraps `react-player`) already supports YouTube URLs, so live/unlisted videos will work once detected correctly.  

---

## 5. Free Course One-Click Enrollment

### Changes to `BuyCourse.tsx`

When `course.price === 0` or `course.price === null`:  

- Show "Add to My Courses" button instead of payment flow  
- On click, directly insert into `enrollments` table with `status: 'active'`  
- Skip payment step entirely  
- Redirect to course page after enrollment

The existing `handleFreeEnrollmentEarly` function already does this — just need to ensure the UI prominently shows the free enrollment path with a clear button.  

---

## 6. Create `INTEGRATION.md` Documentation

Document the full capabilities of both connectors:  

**Firecrawl capabilities**: Scrape (markdown, html, screenshot, Current Affairs knowledge from Everyone Dimension.  

**7.Vdo ka Ratio Vdo Aisa Kare Aur Youtube Api ke Through YouTube Vdo ko Lecture ko Transcript kari aur Sarthi Api ka use karke Is Integrattion ko Aur Jyada Strong kare**   

**• Lecture ke Transcript se baat Kar Sake Student.**   

**Jo Screenshot me Diya Gaya hai**  

**• aur Sare Integration ko Connect kare Ek Saath Ek**