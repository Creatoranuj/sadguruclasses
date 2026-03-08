
## What The User Is Asking

"Ab aap batao kya prompt likhein" — They already have a list of 5 suggested next prompts (from my previous message). They uploaded a file with past prompts. They're NOT asking me to re-audit — they're asking me to **pick one feature and plan it**.

Given:
1. `lecture_notes` table already exists in DB with full RLS (SELECT/INSERT/UPDATE/DELETE for own rows, `lesson_id` + `user_id` columns)
2. `ObsidianNotes.tsx` component already exists (350 lines) — full markdown editor with toolbar, bold/italic/headings/lists, edit+preview toggle, DOMPurify sanitization, and `saveNotes()` function that correctly does `upsert` to `lecture_notes` on conflict `(lesson_id, user_id)`
3. BUT: The Notes tab in `MyCourseDetail.tsx` (lines 936–974) currently only shows **admin-uploaded NOTES-type lesson PDFs** — it does NOT show `ObsidianNotes` for personal student notes at all
4. The `ObsidianNotes` component has **manual save only** (Save button) — no auto-save / debounce
5. The DB `lecture_notes` table has a unique constraint needed for upsert on `(lesson_id, user_id)` — already set up

## Plan

The feature to implement: **Personal Student Notes** — wire up `ObsidianNotes` into the Notes tab of the lesson player, add debounced auto-save with "Saving..." → "Saved ✓" status indicator.

### What needs to change

**1. Add debounce auto-save to `ObsidianNotes.tsx`**
- Import `useCallback` + `useRef`
- After each `setMarkdown`, fire a debounced save (1.5s delay)
- Show `saveStatus`: `"idle"` | `"saving"` | `"saved"` | `"error"`
- Display status in header: nothing when idle, spinning icon + "Saving..." when saving, green checkmark + "Saved ✓" when done
- Keep the manual Save button for explicit saves
- The existing `saveNotes()` function is already correct — just needs to be called from debounce too

**2. Update Notes tab in `MyCourseDetail.tsx` (lines 936–974)**
- The tab currently shows ONLY admin-uploaded NOTES-type PDFs
- Split the Notes tab into two sections:
  - Top: "My Notes" — renders `ObsidianNotes` with `lessonId={selectedLesson.id}` and `userId={user?.id}`
  - Bottom: "Class Notes" (existing PDFs from admin) — show as before if any exist
- OR: Show `ObsidianNotes` always (even when no admin notes exist), so the tab is never empty
- Import `ObsidianNotes` into `MyCourseDetail.tsx`

**3. Ensure unique constraint exists for upsert**
- The `ObsidianNotes.saveNotes()` calls `.upsert({...}, { onConflict: 'lesson_id,user_id' })`
- The DB table schema shows `lesson_id` + `user_id` columns but doesn't show a unique constraint explicitly
- Need a migration to add: `ALTER TABLE lecture_notes ADD CONSTRAINT lecture_notes_lesson_user_unique UNIQUE (lesson_id, user_id);` if it doesn't exist
- Without this, the upsert will fail silently or create duplicates

### Files to change
1. `src/components/lecture/ObsidianNotes.tsx` — add debounced auto-save + status indicator
2. `src/pages/MyCourseDetail.tsx` — import + render `ObsidianNotes` in the Notes tab
3. New migration — add unique constraint on `lecture_notes(lesson_id, user_id)`

### Layout of Notes tab after change
```
┌────────────────────────────────────────────┐
│ Notes                        [Saving... ✓]  │
├────────────────────────────────────────────┤
│  MY PERSONAL NOTES                          │
│  [ObsidianNotes editor — always visible]   │
│  Toolbar: B I H1 H2 H3 List Quote Code     │
│  [Edit] [Preview]                          │
│  Textarea (min 300px)                      │
├────────────────────────────────────────────┤
│  CLASS NOTES (if admin uploaded any)        │
│  [PDF pill buttons]                        │
│  [PdfViewer]                               │
└────────────────────────────────────────────┘
```

### Auto-save status indicator (in ObsidianNotes header)
```
idle:    (nothing shown)
saving:  🔄 "Saving..."   (gray text, spinning icon)
saved:   ✓  "Saved"       (green text, checkmark, fades after 3s)
error:   ✗  "Save failed" (red text)
```

### DB Migration needed
```sql
ALTER TABLE public.lecture_notes 
ADD CONSTRAINT IF NOT EXISTS lecture_notes_lesson_user_unique 
UNIQUE (lesson_id, user_id);
```

This is safe to run even if data exists since each user should only have one note per lesson. If duplicates exist they'd need cleanup first, but since this is fresh data that's not an issue.

### Summary of all files
- `supabase/migrations/[timestamp]_lecture_notes_unique.sql` — unique constraint
- `src/components/lecture/ObsidianNotes.tsx` — debounce auto-save + status display
- `src/pages/MyCourseDetail.tsx` — integrate ObsidianNotes into Notes tab (lines 936–974)
