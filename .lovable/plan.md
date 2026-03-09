
## Full Analysis

### Current State
- Auth is handled entirely by Supabase's built-in session management (`supabase.auth.signInWithPassword`, `onAuthStateChange`)
- No custom session tracking exists — no `user_sessions` table, no device detection, no concurrent limit
- `AuthContext.tsx` has `login()` and `logout()` functions that call Supabase directly
- Admin panel has tabs: payments, users, teachers, courses, content, upload, schedule, library, social, live, banners, doubts — a 13th "sessions" tab will be added
- The app is a PWA + Android APK — device type can be `web` or `mobile`

### Architecture Decisions

**Why NOT use Supabase auth sessions directly for the limit:**
Supabase's built-in auth doesn't expose a way to count/evict concurrent sessions per user. We build our own lightweight tracking layer on top.

**How the limit works:**
1. On login → insert a row into `user_sessions` with a `session_token` (crypto.randomUUID), device type, and user agent
2. Before inserting → count active sessions for that user. If ≥ 2, expire the oldest one
3. Broadcast a real-time event to the evicted session's device via Supabase Realtime channels
4. The client listens on a user-specific channel. If it receives `force_logout` for its session token, it signs out and redirects to `/login` with a message
5. On page load (`AuthContext` init) → validate our custom `session_token` from localStorage is still active. If not, sign out
6. On logout → mark the row inactive

**Why a custom `session_token` vs just using Supabase's `access_token`:**
Supabase access tokens rotate every hour (auto-refresh). Our `session_token` is stable for the lifetime of the session — it's what we use to identify "which tab/device this is". The Supabase auth session still handles actual authentication.

---

## Files & Changes

### 1. Database Migration — `user_sessions` table

```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'web' CHECK (device_type IN ('web', 'mobile')),
  user_agent TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users see only their own sessions
CREATE POLICY "Users view own sessions" ON public.user_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Users can insert their own session on login (INSERT handled via Edge Function with service role)
-- Users can update their own sessions (for logout)
CREATE POLICY "Users update own sessions" ON public.user_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Admins can see all sessions
CREATE POLICY "Admins view all sessions" ON public.user_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

**Note on INSERT**: The session insertion is done by an Edge Function using service_role (to bypass count check + insert atomically). This prevents race conditions.

### 2. Edge Function — `supabase/functions/manage-session/index.ts`

Handles 3 actions:
- `create`: count active sessions for user. If ≥ 2, expire oldest, broadcast `force_logout` to that session's channel. Insert new session. Return `session_token`.
- `heartbeat`: update `last_active_at` for a session token (called every 5 min from client)
- `terminate`: mark session inactive on logout

Uses `SUPABASE_SERVICE_ROLE_KEY` (already configured as secret).

### 3. `src/contexts/AuthContext.tsx` — Session lifecycle integration

Add 4 things:
1. **`detectDeviceType()`** helper — checks `navigator.userAgent` + `display-mode: standalone`
2. **On login**: after `signInWithPassword` succeeds, call `manage-session` Edge Function with `action: create`. Store returned `session_token` and `session_id` in `localStorage`
3. **On mount** (`useEffect`): if `session_token` exists in localStorage, validate it by querying `user_sessions` — if `is_active = false`, call `logout()` and show toast "Your session was terminated because another device logged in"
4. **Real-time subscription**: subscribe to channel `session:{user_id}`. On `force_logout` event — if `payload.sessionToken === localStorage.getItem('session_token')` → sign out
5. **On logout**: call `manage-session` Edge Function with `action: terminate`
6. **Heartbeat**: `setInterval` every 5 min calling `manage-session` with `action: heartbeat`

### 4. `src/pages/Admin.tsx` — Sessions monitoring tab

Add a 13th tab `"sessions"` (Monitor icon) between `doubts` and the end.

Tab content: table showing all active `user_sessions` with columns:
- User (name/email from a JOIN)
- Device type (web/mobile badge)
- Last active (relative time)
- Logged in at
- User agent (truncated)
- Actions: "Force Logout" button → calls `manage-session` with `action: terminate` + broadcasts logout

Stats card: add "Active Sessions" count to the stats grid (6th card, visible on lg screens).

### 5. `src/pages/Settings.tsx` — "My Sessions" section for students

Show the student their own active sessions with device type, last active, and ability to terminate individual sessions (except the current one).

---

## File Summary

| File | Change |
|------|--------|
| `supabase/migrations/20260309140000_user_sessions.sql` | Create `user_sessions` table with RLS |
| `supabase/functions/manage-session/index.ts` | New Edge Function: create/heartbeat/terminate |
| `supabase/config.toml` | Register new edge function with `verify_jwt = false` |
| `src/contexts/AuthContext.tsx` | Integrate session creation, validation, real-time eviction |
| `src/pages/Admin.tsx` | Add Sessions monitoring tab + force logout + active sessions stat |
| `src/pages/Settings.tsx` | Add "My Active Sessions" section for users |

---

## How Force-Logout Works (Sequence)

```text
Device A (Web) logged in → session_token_A stored in localStorage
Device B (Mobile) logged in → session_token_B stored
Device C (Mobile-2) logs in:
  1. manage-session Edge Fn: count = 2 (A + B)
  2. Oldest = A → UPDATE user_sessions SET is_active=false WHERE id=session_A
  3. Broadcast to channel "session:{userId}": { event: "force_logout", sessionToken: "token_A" }
  4. INSERT new session for C → return session_token_C
  5. Device A's listener receives force_logout
  6. Device A checks: token_A === localStorage token? YES
  7. Device A: supabase.auth.signOut() + localStorage.clear() + navigate("/login")
  8. Device A shows toast: "You were signed out because a new device logged in"
```

## Security Notes
- Session INSERT uses service_role in Edge Function — the client cannot bypass the 2-session limit
- RLS: users can only SELECT/UPDATE their own sessions; INSERT is blocked at table level
- Admin force-logout also goes through the Edge Function (so it broadcasts correctly)
- `session_token` is `crypto.randomUUID()` — cryptographically random, not guessable
