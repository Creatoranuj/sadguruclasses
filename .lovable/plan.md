## Plan: Fix Chapters RLS, PWA Icons & Admin/Student Final Polish

### Summary

Fix 4 critical issues: (1) Chapters table RLS blocking admin inserts, (2) PWA icons still showing old "NB" logo, (3) Admin upload polish with drag-and-drop, (4) LessonView cleanup of unnecessary elements.

---

### 1. Fix Chapters Table RLS — ROOT CAUSE of "new row violates row-level security"

The `chapters` table has RLS enabled but **zero policies**. Every insert/update/delete fails.

**Migration**: Add RLS policies for chapters:

```sql
-- Admins can do everything
CREATE POLICY "Admins full access on chapters"
  ON public.chapters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students can read chapters
CREATE POLICY "Students can read chapters"
  ON public.chapters FOR SELECT
  TO authenticated
  USING (true);
```

Same fix needed for **lessons**, **courses**, and other tables with empty RLS — but `chapters` is the immediate blocker shown in the screenshot.

### 2. PWA Icons — Replace Old "NB" Logo with Sadguru Logo

The screenshot shows the browser install dialog displaying the old "NB" (Naveen Bharat) circular logo. This comes from `public/icons/icon-192x192.png` and `public/icons/icon-512x512.png`.

**Fix**: Generate new PWA icons from the existing `src/assets/sadguru-logo.png` using a script that resizes it to 192x192 and 512x512, then writes to `public/icons/`. This ensures the PWA install dialog, home screen icon, and splash screen all show the Sadguru branding.

### 3. Admin Upload Polish — Drag & Drop + Better UX

In `ContentDrillDown.tsx` upload dialog:

- Add drag-and-drop zone for file uploads (both video and PDF)
- Auto-fill title from filename when file is dropped
- Show file size and type preview before upload
- Add thumbnail URL input field to the upload dialog (currently only in edit mode)
- Better visual feedback during upload with progress indication

### 4. LessonView Cleanup — Remove Unnecessary Elements

In `LessonView.tsx` (1685 lines):

- Remove redundant/unused UI elements for a cleaner premium view
- Ensure the content area focuses on the video/PDF + essential controls
- Clean up any dead imports or unused state variables

### 5. Additional RLS Fixes for Other Tables

Multiple tables have RLS enabled but zero policies. Add appropriate policies for:

- `lessons` — admin full access, authenticated read
- `courses` — admin full access, public read  
- `enrollments` — admin full access, users read own
- `user_progress` — users manage own progress

---

### Files to Modify


| File                                        | Change                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| New migration                               | RLS policies for `chapters`, `lessons`, `courses`, `enrollments`, `user_progress` |
| `public/icons/icon-192x192.png`             | Replace with Sadguru logo                                                         |
| `public/icons/icon-512x512.png`             | Replace with Sadguru logo                                                         |
| `src/components/admin/ContentDrillDown.tsx` | Add drag-and-drop upload, thumbnail field in upload dialog                        |
| `src/pages/LessonView.tsx`                  | Clean up unnecessary elements                                                     |


### Technical Notes

- The `has_role` function already exists in the database — all new policies will use it
- PWA icon generation will use a script to resize the existing Sadguru logo
- No new dependencies needed
- The chapters RLS fix is the **highest priority** — it's blocking all admin content creation

&nbsp;

• Website ka manual likhe in hinglish format 

Lovable proxy error  
(502)