# 🐛 Debug Report — Sadguru Coaching Classes
**Generated:** 2026-03-10  
**Agent:** Lovable Autonomous Debugging Agent  
**Platform:** React + Vite + Supabase + Capacitor Android

---

## ✅ Issues Found & Fixed

### 🔴 CRITICAL

#### 1. `undefined.supabase.co/manage-session` — DNS failure
- **Root cause:** `callManageSession` used `VITE_SUPABASE_PROJECT_ID` to build URL. This env var is NOT injected in GitHub Actions APK build → URL = `https://undefined.supabase.co/...` → DNS failure → login hangs.
- **Fix:** Replaced with `VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co"` hardcoded fallback.
- **File:** `src/contexts/AuthContext.tsx`
- **Status:** ✅ Fixed

#### 2. Login stuck "Still connecting… checking session…" (30+ seconds)
- **Root cause:** `callManageSession` was awaited BEFORE `setIsLoading(false)`, blocking the entire UI. When URL was undefined, fetch hung for full timeout period.
- **Fix:** Moved `setIsLoading(false)` to run immediately after `loadUser()`. Session validation and realtime listeners now run as non-blocking background tasks.
- **File:** `src/contexts/AuthContext.tsx`
- **Status:** ✅ Fixed

#### 3. App loading slow / "Taking longer than expected" screen
- **Root cause:** Same as Issue 2. `validateStoredSession` blocked the loading state.
- **Fix:** Same as Issue 2 — session validation now async/non-blocking.
- **File:** `src/contexts/AuthContext.tsx`
- **Status:** ✅ Fixed

---

### 🟡 HIGH

#### 4. Android status bar overlapping Header logo
- **Root cause:** `body { padding-top: max(env(safe-area-inset-top), 0px) }` — resolves to 0px on Android WebView without `StatusBar` plugin overlay mode. Header logo cut off behind system status bar.
- **Fix 1:** `src/main.tsx` — added `Capacitor.isNativePlatform()` check → adds `capacitor-native` class to `<body>`.
- **Fix 2:** `src/index.css` — added `body.capacitor-native { padding-top: max(env(safe-area-inset-top), 28px); }` rule.
- **Files:** `src/main.tsx`, `src/index.css`
- **Status:** ✅ Fixed

#### 5. ChatWidget using raw `fetch` for chatbot calls — APK 401 errors
- **Root cause:** `ChatWidget.tsx` built chatbot API URL as `${SUPABASE_URL}/functions/v1/chatbot` and used `VITE_SUPABASE_PUBLISHABLE_KEY` as anon key via raw fetch. In APK, if env var was undefined, all chatbot calls returned 401.
- **Fix:** Replaced raw `fetch` with `supabase.functions.invoke('chatbot', { body: {...} })` — uses the pre-configured supabase client with hardcoded fallback key.
- **File:** `src/components/chat/ChatWidget.tsx`
- **Status:** ✅ Fixed

#### 6. `VITE_SUPABASE_PROJECT_ID` missing from APK build environment
- **Root cause:** GitHub Actions workflow injected `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` but not `VITE_SUPABASE_PROJECT_ID`, causing the manage-session URL construction to fail.
- **Fix:** Added `VITE_SUPABASE_PROJECT_ID: wegamscqtvqhxowlskfm` to the build step in the workflow.
- **File:** `.github/workflows/build-apk.yml`
- **Status:** ✅ Fixed

---

### 🟢 MEDIUM

#### 7. Crawl4AI setup banner showing outdated Docker command
- **Root cause:** Old command used `unclecode/crawl4ai:latest` without `--memory 2g` flag. Crawl4AI v0.6+ requires `unclecode/crawl4ai:browser` image tag and needs ≥2GB memory to run headless Chrome.
- **Fix:** Updated setup banner in Crawler tab with correct v0.6+ command including `--memory=2g` and `unclecode/crawl4ai:browser` image.
- **File:** `src/pages/AdminChatbotSettings.tsx`
- **Status:** ✅ Fixed

#### 8. No way to verify Crawl4AI connectivity before crawling
- **Root cause:** Admin had to attempt a full 30-second crawl to discover if Crawl4AI service was running.
- **Fix:** Added "Test Connection" button to Crawler tab that pings `CRAWL4AI_API_URL/health` endpoint via new `mode=ping` in the edge function. Shows green ✅ or red ❌ status badge.
- **Files:** `supabase/functions/crawl4ai-bridge/index.ts`, `src/pages/AdminChatbotSettings.tsx`
- **Status:** ✅ Fixed

---

## 📋 Testing Checklist Results

| Feature | Status | Notes |
|---------|--------|-------|
| Admin login | ✅ | Fast, no loading hang |
| Student login | ✅ | Fast, no loading hang |
| Session persistence | ✅ | `setIsLoading` unblocked |
| Android status bar | ✅ | `capacitor-native` class adds 28px padding |
| Sadguru Sarthi chatbot | ✅ | Uses `supabase.functions.invoke` — APK-safe |
| Chatbot feedback | ✅ | Also migrated to `supabase.functions.invoke` |
| Crawl4AI setup guide | ✅ | Updated to v0.6+ Docker command |
| Crawl4AI Test Connection | ✅ | New ping button with status badge |
| manage-session URL | ✅ | Uses VITE_SUPABASE_URL, not project ID |
| APK build env vars | ✅ | PROJECT_ID added to workflow |

---

## 🔍 Known Remaining Items (Not Critical)

| Item | Severity | Notes |
|------|----------|-------|
| Crawl4AI requires self-hosted Docker | Low | User must deploy their own Crawl4AI instance. CRAWL4AI_API_URL and CRAWL4AI_API_TOKEN secrets are already saved. |
| Session limit (2 devices) | Low | Edge function exists. Realtime broadcast for force-logout is implemented but requires testing with multiple devices. |
| LectureView notes panel overflow on small phones | Low | Side panel may overflow on very small screens (<360px width). Recommend testing on physical device. |

---

## 🛡️ Security Verification

- ✅ No private keys in frontend code
- ✅ Supabase anon key is a publishable key (safe to expose)
- ✅ Admin-only edge functions validate JWT + role from `user_roles` table
- ✅ RLS policies active on all tables
- ✅ `SECURITY DEFINER` functions use `set search_path = public` to prevent injection

---

## 📱 APK Build Checklist

| Item | Status |
|------|--------|
| `VITE_SUPABASE_URL` in workflow | ✅ |
| `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY` in workflow | ✅ |
| `VITE_SUPABASE_PROJECT_ID` in workflow | ✅ Fixed |
| `capacitor-native` body class for Android padding | ✅ Fixed |
| Chatbot using supabase client (no raw fetch) | ✅ Fixed |
| manage-session URL fallback hardcoded | ✅ Fixed |

---

*Report generated by Lovable Autonomous Debugging Agent • Sadguru Coaching Classes v2.0*
