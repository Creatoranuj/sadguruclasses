
## Live Class Feature Plan for Sadguru Coaching Classes

### What the user wants
A complete **Live Class system** with:
1. YouTube Live stream embedded in the app (plays live YouTube streams)
2. Live chat (real-time messages during the class)
3. Live doubts (students submit doubts, admin/teacher can answer)
4. Admin panel to schedule and start/stop live sessions

---

### Architecture

```text
Admin creates Live Session
  → stores YouTube Live ID + schedule in DB (live_sessions table)
  → students see "LIVE" badge on Dashboard + in nav

Student opens Live Class page
  → YouTube Live iframe (embedded, no branding via playerVars)
  → Real-time Chat panel (Supabase Realtime)
  → Doubts panel (submit question → admin answers → all see it)
  → Viewer count (real-time presence via Supabase channel)
```

---

### Database Changes (1 new table, 1 migration)

```sql
CREATE TABLE live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_live_id text NOT NULL,   -- YouTube video ID of live stream
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  is_active boolean DEFAULT false,
  course_id bigint,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE live_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'chat',   -- 'chat' | 'doubt'
  is_answered boolean DEFAULT false,
  answer text,
  created_at timestamptz DEFAULT now()
);
```

RLS:
- `live_sessions`: SELECT for all authenticated; ALL for admin
- `live_messages`: SELECT for authenticated; INSERT for authenticated (own user_id); UPDATE (answer) for admin

---

### New Files

| File | Purpose |
|---|---|
| `src/pages/LiveClass.tsx` | Student live class page |
| `src/pages/AdminLiveManager.tsx` | Admin creates/starts/stops live sessions |
| `src/components/live/LivePlayer.tsx` | YouTube live iframe with Sadguru watermark |
| `src/components/live/LiveChat.tsx` | Real-time chat + doubts panel |
| `src/components/live/LiveBadge.tsx` | "LIVE" badge shown on Dashboard |
| `supabase/migrations/...` | live_sessions + live_messages tables |

---

### Key Technical Details

**YouTube Live Embedding**
The live YouTube stream is embedded just like recorded videos using `youtube.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1`. The same Sadguru logo watermark from `MahimaGhostPlayer` overlays the iframe bottom-right.

**Real-time Chat via Supabase**
Using `supabase.channel('live-chat-{sessionId}').on('postgres_changes', ...)` to listen for new `live_messages` rows — same pattern as `Messages.tsx`. Chat auto-scrolls to bottom like a WhatsApp-style chat.

**Doubts Panel**
A tab switch between "Chat" and "Doubts". Doubts are `live_messages` with `type = 'doubt'`. Admin sees unanswered doubts highlighted with an "Answer" button.

**Live Badge on Dashboard**
A `useEffect` queries `live_sessions` where `is_active = true`. If any session exists, a pulsing red "LIVE" badge + "Join Now" button appears at the top of the Dashboard and also in the BottomNav home icon.

**Admin Live Manager**
Under `/admin/live` — shows:
- Create new live session (title, YouTube live ID, scheduled time)
- "Go Live" button — sets `is_active = true`, `started_at = now()`
- "End Live" button — sets `is_active = false`, `ended_at = now()`
- List of past sessions with message counts

**Viewer count**
Supabase Realtime Presence tracks how many students are currently on the live page. Shown as "👁 23 watching" in the header.

---

### Route added to `App.tsx`

```tsx
const LiveClass = lazy(() => import("./pages/LiveClass"));
const AdminLiveManager = lazy(() => import("./pages/AdminLiveManager"));

// Routes:
<Route path="/live/:sessionId" element={<LiveClass />} />
<Route path="/admin/live" element={<AdminLiveManager />} />
```

---

### Files to Create/Edit

| File | Action |
|---|---|
| `supabase/migrations/XXXXXX_live_classes.sql` | New — live_sessions + live_messages tables + RLS |
| `src/pages/LiveClass.tsx` | New — student live page |
| `src/pages/AdminLiveManager.tsx` | New — admin live manager |
| `src/components/live/LivePlayer.tsx` | New — YouTube live iframe + watermark |
| `src/components/live/LiveChat.tsx` | New — real-time chat + doubts |
| `src/App.tsx` | Edit — add 2 routes + lazy imports |
| `src/pages/Dashboard.tsx` | Edit — show LIVE banner when session is active |
| `src/pages/Admin.tsx` | Edit — add "Live Classes" card linking to /admin/live |

