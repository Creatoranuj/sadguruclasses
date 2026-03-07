
## What I Found

**Security scan shows 2 Errors + 5 Warnings. Here's the full status:**

### Errors (still showing as "outdated"):
1. **Comments RLS conflict** — The migration to drop the loose policies was created but is marked "outdated" in the scan. The actual DB still has the old permissive policies. Need a fresh migration.
2. **Receipts public bucket** — The migration `UPDATE storage.buckets SET public = false WHERE id = 'receipts'` was created but scan still shows it as outdated. Need to re-run.

### Warnings:
3. **Paid Lesson Video/PDF Access Enforced Only on Client Side** — `video_url` and `class_pdf_url` are visible to ALL authenticated users even for locked lessons. This is the "client-side bypass" issue. Fix: Supabase Edge Function `get-lesson-url` that checks enrollment before returning the URL. Then strip `video_url`/`class_pdf_url` from the DB query or return null for locked lessons.
4. **RLS Policy Always True** — `leads` INSERT uses `WITH CHECK (true)`. This is intentional (public lead form). Mark as ignored.
5. **Leaked Password Protection** — Requires user action in Supabase Auth dashboard.
6. **Lead contact information** — Admins can see leads. This is intentional. Mark as ignored.
7. **Public profile view has no access restrictions** — `profiles_public` has no SELECT policies. Need to add one.

### Admin panel: Add delete buttons for chapters/sub-folders
Currently chapters and sub-folders in `AdminUpload.tsx` have no delete option. Need to add delete buttons with confirmation.

### Branding: Change "Naveen Bharat Prism" → "Sadguru Coaching Classes"
The user wants to revert back to "Sadguru Coaching Classes". Found in:
- `src/pages/Index.tsx` (nav title, hero default)
- `src/components/Layout/Sidebar.tsx` (already says "Sadguru Coaching")
- Other places already say Sadguru

---

## Plan

### 1. Fix Security Errors (DB Migrations)

**Migration A — Fix comments RLS conflict (re-run the drop):**
```sql
DROP POLICY IF EXISTS "Users can update their comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.comments;
```

**Migration B — Ensure receipts bucket is private:**
```sql
UPDATE storage.buckets SET public = false WHERE id = 'receipts';
```

**Migration C — Add SELECT policy to profiles_public view:**
```sql
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (true);
```

### 2. Fix Client-Side Bypass (Edge Function)

Create Supabase Edge Function `get-lesson-url`:
- Accepts `{ lesson_id }` in request body
- Checks `auth.uid()` is authenticated
- Checks if lesson `is_locked = false` OR user has active enrollment for the lesson's course
- If authorized: returns `{ video_url, class_pdf_url }`
- If not: returns 403

Then update `LessonView.tsx` and `LectureView.tsx` to call this Edge Function to get the video URL instead of reading it directly from the lessons table query. The lessons table `SELECT` policy can remain as-is for non-sensitive fields; only the URL fields become gated.

**Simpler approach (no Edge Function required):**
Add a DB function that returns null for `video_url`/`class_pdf_url` for locked lessons unless the caller has an enrollment — via a view with `security_invoker=true`. This is cleaner but complex.

**Recommended approach: Edge Function** (more secure, works with existing code):
- `supabase/functions/get-lesson-url/index.ts`
- Called client-side: `supabase.functions.invoke('get-lesson-url', { body: { lesson_id } })`
- LessonView & LectureView call this function, display the URL from response

### 3. Add Delete Buttons for Chapters/Sub-folders in AdminUpload

Add `handleDeleteChapter` function:
```ts
const handleDeleteChapter = async (chapterId: string, isSubfolder = false) => {
  if (!confirm("Delete this folder and all its content?")) return;
  // Delete all lessons in the chapter first
  await supabase.from('lessons').delete().eq('chapter_id', chapterId);
  // Delete the chapter
  await supabase.from('chapters').delete().eq('id', chapterId);
  // Refresh list
};
```

Add `Trash2` icon button next to each chapter row (Level 2 list) and each sub-folder row (Level 3 list).

### 4. Branding: Revert "Naveen Bharat Prism" → "Sadguru Coaching Classes"

Update `src/pages/Index.tsx`:
- `title: "Welcome to Sadguru Coaching Classes"` (defaultHeroData)
- Nav span text: `Sadguru Coaching Classes`
- SheetTitle: `Sadguru Coaching Classes`
- Alt text: `Sadguru Coaching Classes`

### 5. Mark Intentional Warnings as Ignored

Use `security--manage_security_finding` to:
- Mark `leads` INSERT always-true as **ignored** (intentional public form)
- Mark `lead contact info` as **ignored** (admin-only access is correct)
- Mark leaked password protection as **update with high remediation_difficulty** (requires manual dashboard action)

---

## Files to Modify

| File | Change |
|------|--------|
| SQL Migration (new) | Drop loose comments policies, fix profiles_public policy |
| `supabase/functions/get-lesson-url/index.ts` | New Edge Function for server-side lesson URL gating |
| `src/pages/LessonView.tsx` | Call Edge Function for video URL instead of direct DB read |
| `src/pages/LectureView.tsx` | Same — call Edge Function |
| `src/pages/AdminUpload.tsx` | Add delete chapter/subfolder handlers + Trash2 buttons, revert branding |
| `src/pages/Index.tsx` | Revert nav/hero text to "Sadguru Coaching Classes" |
