
## Analysis

### What this app can and cannot do

This is a **pure React + Vite frontend** project. The user's proposal includes a separate "Node.js/Express Zoom backend microservice" — but this platform **cannot run Node.js servers**. The backend must be Supabase Edge Functions (Deno).

The Zoom Meeting SDK for Web is a **npm package** that can absolutely be embedded inside this React app. The Zoom OAuth + signature generation must be a Supabase Edge Function.

### What the Zoom integration actually requires

1. **Zoom Server-to-Server OAuth App** (not User-managed) — generates JWTs for meeting creation and SDK signatures without needing each teacher to connect their Zoom account. This is the simplest path for a coaching center.
2. **Two Supabase Edge Functions:**
   - `create-zoom-meeting` — creates a meeting via Zoom API, returns meetingNumber + password
   - `get-zoom-signature` — generates the Meeting SDK JWT signature for joining
3. **New Supabase table: `doubt_sessions`** — stores meeting requests + Zoom meeting metadata
4. **Frontend components:**
   - `ZoomMeetingEmbed.tsx` — embeds the Zoom Meeting SDK inline
   - `DoubtsPage.tsx` (`/doubts`) — student can request a session; teacher/admin can create + manage
5. **Admin tab** — add "Doubts" tab to Admin.tsx for managing all requests

### Architecture (simplified for this stack)

```
React App (this project)
  │
  ├── /doubts (student) → create doubt request → saved to doubt_sessions table
  │
  ├── Admin panel → "Doubts" tab → see requests → click "Create Zoom Meeting"
  │     └── calls Edge Function: create-zoom-meeting
  │           └── Zoom API: creates meeting → returns meetingNumber, password
  │           └── saves to doubt_sessions row
  │
  └── Student/Teacher → click "Join Meeting"
        └── calls Edge Function: get-zoom-signature
              └── returns SDK JWT signature
              └── ZoomMeetingEmbed.tsx launches Zoom SDK inline
```

### Secrets needed from the user

The user needs to:
1. Go to [marketplace.zoom.us](https://marketplace.zoom.us) → Build App → **Server-to-Server OAuth**
2. Get: `Account ID`, `Client ID`, `Client Secret`, `SDK Key`, `SDK Secret`
3. Store as Supabase secrets

### Plan

---

## Database

New table: `doubt_sessions`
```sql
CREATE TABLE public.doubt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  teacher_id uuid REFERENCES auth.users(id),
  course_id bigint REFERENCES public.courses(id),
  subject text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | scheduled | active | completed | cancelled
  zoom_meeting_id text,
  zoom_join_url text,
  zoom_password text,
  zoom_meeting_number text,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: students see own, teachers/admins see all
```

---

## Supabase Edge Functions

### `supabase/functions/create-zoom-meeting/index.ts`
- Auth: checks caller is admin or teacher
- Gets Server-to-Server OAuth token from Zoom
- Creates meeting via `POST /v2/users/me/meetings`
- Updates `doubt_sessions` row with zoom fields
- Returns: `{ meetingId, meetingNumber, joinUrl, password }`

### `supabase/functions/get-zoom-signature/index.ts`
- Takes `{ meetingNumber, role }` (0=participant, 1=host)
- Generates HMAC-SHA256 JWT signature using SDK Key + Secret
- Returns `{ signature, sdkKey }`

---

## Frontend Files

### CREATE: `src/pages/Doubts.tsx` (`/doubts`)
**Student view:**
- Form: subject, description, preferred time, course selector → submits to `doubt_sessions`
- List of own past/upcoming sessions with status badges
- "Join" button when status = active/scheduled (opens ZoomMeetingEmbed)

**Teacher/Admin view:**
- All pending requests in a list with student name, subject, description
- "Schedule & Create Zoom" button → calls edge function → updates row
- "Go Live" / "Mark Complete" controls

### CREATE: `src/components/live/ZoomMeetingEmbed.tsx`
- Props: `{ meetingNumber, password, userName, role (0|1) }`
- Calls `get-zoom-signature` edge function on mount
- Dynamically loads `@zoom/meetingsdk` (CDN script tag, no npm needed to avoid bundle bloat)
- Renders the Zoom component-view inside a `div#zmmtg-root`
- Shows loading spinner while SDK initializes

### MODIFY: `src/App.tsx`
- Add `/doubts` route

### MODIFY: `src/components/Layout/Sidebar.tsx`
- Add "Doubts" item with `VideoIcon` icon

### MODIFY: `src/components/Layout/BottomNav.tsx`
- Optionally replace or add "Doubts" tab

### MODIFY: `src/pages/Admin.tsx`
- Add "Doubts" tab (grid-cols-11 → grid-cols-12)
- Render a `DoubtsAdminPanel` sub-component showing all sessions with create-meeting action

### MODIFY: `src/pages/Dashboard.tsx`
- Add small "Upcoming Doubt Sessions" card if student has any scheduled sessions

---

## Summary

```text
NEEDS FROM USER (before implementation):
  Zoom Server-to-Server OAuth credentials:
  - Account ID
  - Client ID  
  - Client Secret
  - SDK Key
  - SDK Secret
  → Store as Supabase secrets

CREATE (DB):
  doubt_sessions table + RLS policies

CREATE (Edge Functions):
  supabase/functions/create-zoom-meeting/index.ts
  supabase/functions/get-zoom-signature/index.ts

CREATE (Frontend):
  src/pages/Doubts.tsx           Student request + join UI
  src/components/live/ZoomMeetingEmbed.tsx   Embedded Zoom SDK

MODIFY:
  src/App.tsx                Add /doubts route
  src/components/Layout/Sidebar.tsx    Add Doubts nav item
  src/pages/Admin.tsx        Add Doubts tab
  src/pages/Dashboard.tsx    Add upcoming doubts card
```

---

## One Critical Blocker

Before any code can be written, the user **must create a Zoom app and provide credentials**. The edge functions are useless without `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_SDK_KEY`, and `ZOOM_SDK_SECRET`.

**Step-by-step for the user:**
1. Go to [https://marketplace.zoom.us](https://marketplace.zoom.us)
2. Sign in → top menu → **Develop** → **Build App**
3. Choose **"Server-to-Server OAuth"** (NOT General App — simpler, no user OAuth needed)
4. Name it `Sadguru Doubt Sessions`
5. After creation: copy `Account ID`, `Client ID`, `Client Secret`
6. Under **Features** → **Meeting SDK** tab: get `SDK Key` and `SDK Secret`
7. Add scopes: `meeting:write:admin`, `meeting:read:admin`
8. Activate the app

I will ask the user for these credentials before proceeding.
