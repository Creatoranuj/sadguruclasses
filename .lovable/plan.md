
## Understanding the user's request (Hindi translated):
The user wants to work on the admin panel with the following tasks:
1. **Library section**: When admin uploads something from admin panel, it should appear in the student's Library page. Currently there seems to be a disconnect.
2. **Notes section**: Upload should work correctly and be linked properly.
3. **DPP/Test questions**: Questions should support **image uploads** — currently only text-based questions are supported. Admin needs to be able to upload question images.
4. Accept all previous changes and move forward.

## Current state analysis:

### Library flow — What's working:
- `useMaterials.ts` already fetches from 3 sources: `materials` table, `notes` table, and `lessons` table (PDF/NOTES/DPP types)
- So any lesson uploaded with type PDF/NOTES/DPP **already appears** in the student's Library at `/materials`
- Admin Library tab in `Admin.tsx` shows all content correctly
- **Root issue**: The admin's "Upload" tab uploads to `lessons` table with correct `lecture_type`, so it DOES appear in Library. The `materials` table upload in the Library/Notes tab only saves URL (no file upload). **This is the disconnect** — admins expect to upload a file directly to Library, but the form only has a URL field, no file picker.

### Notes section — What's broken:
- Notes form in Admin.tsx (lines 695–703) only accepts a PDF URL, not a file upload
- `notes` table has `pdf_url` (text) and `lesson_id` — no file upload support in admin
- Student Library does show notes, but if admin can't upload files, only Google Drive links work

### DPP Quiz questions — Missing image support:
- `questions` table has `question_text` (text) but NO `image_url` column
- `AdminQuizManager.tsx` has a textarea for `question_text` only — no image upload
- Student `QuizAttempt.tsx` renders `question_text` as plain text — no image rendering
- **Need**: Add `image_url` column to questions table + file upload in admin + display in student quiz

## Plan:

### 1. Add image support to quiz questions (DB migration + UI)

**Migration**: Add `image_url` column to `questions` table:
```sql
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;
```

**AdminQuizManager.tsx** — In the question editor, add an image upload section:
- An `<input type="file" accept="image/*">` below the question text textarea
- On file select: upload to Supabase storage bucket `content` at path `questions/{timestamp}_{filename}`
- Get public URL and store in `question_form.image_url`
- When saving questions, include `image_url` in the insert row

**QuizAttempt.tsx** — In the question renderer, if `question.image_url` exists, display `<img src={question.image_url} alt="Question image" className="rounded-lg max-h-64 w-full object-contain mb-3" />` before the options

**QuizResult.tsx** — Same: show image in review mode if present

**Interface update**: Add `image_url?: string` to `QuestionForm` interface

### 2. Fix Library upload — add file upload to admin materials form

**Admin.tsx** — The `handleCreateMaterial` currently only accepts a URL. Add:
- State: `const [materialFile, setMaterialFile] = useState<File | null>(null)`
- In the Library tab's "Add Material" form, add a file picker alongside the URL input
- A toggle "Paste URL / Upload File" (like the existing upload tab pattern)
- When file is chosen, upload to `course-materials` bucket and get public URL, then insert into materials table

This makes materials uploaded from admin panel immediately visible in the student Library.

### 3. Fix Notes upload — add file upload 

**Admin.tsx** — The `handleCreateNote` currently only accepts a `pdf_url`. Add:
- State: `const [noteFile, setNoteFile] = useState<File | null>(null)`  
- In the Library tab's "Add Note" form, add a file picker
- When file chosen, upload to `content` bucket, get public URL, store as `pdf_url`

### 4. ContentDrillDown — ensure DPP/NOTES files uploaded via inline dialog also appear in Library

Looking at `ContentDrillDown.tsx` `handleInlineUpload()` (line 288–341): it already uploads to the `lessons` table with correct `lecture_type`. Since `useMaterials` already pulls from lessons table for DPP/NOTES/PDF types, this **already works**. No changes needed here.

## Files to change:

| File | Change |
|------|--------|
| DB Migration | Add `image_url` column to `questions` table |
| `src/pages/AdminQuizManager.tsx` | Add image upload per question + store image_url when saving |
| `src/pages/QuizAttempt.tsx` | Render question image if present |
| `src/pages/QuizResult.tsx` | Render question image in review mode |
| `src/pages/Admin.tsx` | Add file upload support to Library materials form + Notes form |

## Summary:

```text
CHANGES:
  questions table     ADD image_url column (migration)
  AdminQuizManager    Image upload field per question, save to DB
  QuizAttempt         Show question image during attempt
  QuizResult          Show question image in review
  Admin.tsx           File upload for materials (Library tab)
  Admin.tsx           File upload for notes (Library tab)

STAYS THE SAME:
  useMaterials.ts     Already fetches lessons+notes+materials (no change needed)
  ContentDrillDown    Already saves to lessons table correctly
  Materials.tsx       Already displays all 3 sources
```

No routing changes. Only 1 DB migration (add column), 4 file edits.
