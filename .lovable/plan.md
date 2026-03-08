

## Current State Assessment

**Already fully implemented (previous session):**
- `live_sessions` + `live_messages` DB tables with RLS ✅
- `LiveClass.tsx` — student page with YouTube embed + chat + doubts + viewer count ✅  
- `AdminLiveManager.tsx` — admin creates/starts/stops sessions ✅
- `LiveChat.tsx` — real-time chat + doubts tabs + admin can answer doubts ✅
- `LivePlayer.tsx` — YouTube iframe + Sadguru watermark ✅
- `LiveBadge.tsx` — pulsing LIVE banner on Dashboard ✅
- Routes `/live/:sessionId` and `/admin/live` in `App.tsx` ✅
- **Quiz Attempts Sheet** — `openAttempts()`, Users icon button, Sheet with student names, scores, pass/fail badges, submission dates ✅

**What the user's new prompt asks for (delta):**
1. **"Raise Hand" feature** — `live_participants` table with `hand_raised` flag; floating button in live room; teacher/admin sees raised hands list
2. **`live_classes` table** — the user's prompt uses `live_classes` instead of our existing `live_sessions`. Since `live_sessions` is already working, we map `live_classes` → enhance existing system
3. **Teacher view page** — `/teacher/live-class/:id` showing stream + chat + raised hands list with dismiss buttons; teachers (not just admin) can answer doubts
4. **Student dashboard "Live Classes" section** — upcoming scheduled sessions list with countdown
5. **Participant count** — already done via Supabase Presence ✅
6. **Recording URL field** — add `recording_url` column to `live_sessions` so ended sessions can link to YouTube replay
7. **Teacher route in App.tsx** — add `/teacher/live/:sessionId`

**The quiz attempts verification:** Reading `AdminQuizManager.tsx` lines 484–560 confirms the Users icon button exists, `openAttempts()` is wired up, and the Sheet renders correctly with student names, scores, percentages, pass/fail badges, and submission dates. This is already working code.

---

## Plan

### DB Changes (1 migration)

```sql
-- Add live_participants table for raise hand
CREATE TABLE live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  hand_raised boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

-- RLS: students insert/update their own record; admin/teacher read all; students read own
CREATE POLICY "Users manage own participation" ON live_participants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and teachers view all participants" ON live_participants
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Add recording_url to live_sessions for post-class replay link
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS recording_url text;
```

### New Files

| File | Purpose |
|---|---|
| `src/pages/TeacherLiveView.tsx` | Teacher-only live page with stream + raised hands list + answer doubts |
| `src/components/live/RaiseHandButton.tsx` | Floating "Raise Hand" toggle button for students |
| `src/components/live/RaisedHandsList.tsx` | Admin/teacher panel showing students with raised hands + dismiss |

### File Edits

| File | Change |
|---|---|
| `src/pages/LiveClass.tsx` | Add `RaiseHandButton` (floating bottom-right), track join in `live_participants` |
| `src/pages/AdminLiveManager.tsx` | Add "Teacher View" link button per session; add `recording_url` field |
| `src/pages/Dashboard.tsx` | Add upcoming live sessions section below LiveBadge |
| `src/App.tsx` | Add lazy import + route `/teacher/live/:sessionId` |
| `src/components/live/LiveChat.tsx` | Pass `isTeacher` prop so teachers (not just admin) can answer doubts |

### Key Implementation Details

**RaiseHandButton** — queries `live_participants` for current user's row in session. If `hand_raised = true`, shows "✋ Lower Hand" (red). Otherwise shows "🖐 Raise Hand" (blue). On click: upserts into `live_participants` toggling `hand_raised`.

**RaisedHandsList** — subscribes to `live_participants` realtime for the session. Shows list of students where `hand_raised = true`. Admin/teacher sees names + "Dismiss" button that sets `hand_raised = false`. Shows count badge.

**TeacherLiveView** — same layout as `LiveClass.tsx` but with an extra "Raised Hands" tab in the interaction panel alongside Chat and Doubts. Route guarded: redirect if not admin/teacher.

**Dashboard upcoming sessions** — query `live_sessions` where `is_active = false AND ended_at IS NULL AND scheduled_at > now()` ordered by `scheduled_at`. Show a compact horizontal scroll card list with title, scheduled time formatted as "Today 3pm" or "Mar 12, 4pm", and a "Set Reminder" button (just visual/informational for now).

**LiveChat teacher access** — `isAdmin` prop renamed to `canModerate` (or add `isTeacher` alongside), so teachers opening the teacher view can also answer doubts in `LiveChat`.

### No route conflicts
- Existing `/live/:sessionId` for students stays unchanged
- New `/teacher/live/:sessionId` for teacher view
- `AdminLiveManager` gets a "Teacher View" eye icon that navigates to the teacher route

