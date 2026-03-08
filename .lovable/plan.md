
## Terminology Rename: "Chapter" → "Subject" and "All Content chapter row" → "Chapter"

### User's request (translated):
- In the breadcrumb and UI, the current structure is: `All Classes > Course > Chapters > 01 (Subject)` 
- Target structure: `All Classes > Course > Subjects > Chapter`
- Also: the same breadcrumb logic used in the `All Classes` flow should be applied to the **My Courses** section too (same format)
- **PURELY DISPLAY CHANGE** — keep all DB table names (`chapters`) as-is, just rename UI labels

---

### All files to change and exact locations:

#### 1. `src/pages/ChapterView.tsx`
The tab that currently says **"Chapters"** should say **"Subjects"**:
- Line 191: `Chapters` → `Subjects`
- Line 237: `"No chapters available yet."` → `"No subjects available yet."`
- Line 151 (loading text): `"Loading chapters..."` → `"Loading subjects..."`
- Breadcrumb segments (line 162–165): currently only `All Classes > course.title`. No changes needed to breadcrumb segments here, it already shows just course name. BUT — the tab label "Chapters" at line 191 becomes "Subjects".

#### 2. `src/pages/LectureListing.tsx`
The breadcrumb at lines 234–244 currently shows:
- `All Classes > Course Title > [parent chapter if exists] > [chapter code: title]`

After rename, the chapter segments should NOT change in the breadcrumb (the chapter title is dynamic from DB, not hardcoded). However, the breadcrumb linking back to the chapters list at line 237:
- href `/classes/${courseId}/chapters` is fine

The word "chapters" in comments/logic is internal, no UI text found here except `"Sub-folders"` (line 287) and `"Direct Lectures"` (line 307) which stay as-is.

No display label changes needed in LectureListing. The chapter title in breadcrumb comes from DB data, not hardcoded.

#### 3. `src/pages/MyCourseDetail.tsx`

**Line 691**: `"Back to Chapters"` → `"Back to Subjects"`
**Lines 707–708**:
```
<h2 className="font-semibold text-foreground">Chapters</h2>
<span className="text-xs text-muted-foreground">{chapters.length} chapters</span>
```
→ 
```
<h2 className="font-semibold text-foreground">Subjects</h2>
<span className="text-xs text-muted-foreground">{chapters.length} subjects</span>
```

Also, the breadcrumb in `MyCourseDetail` currently shows:
`Dashboard > My Courses > Course Title > [Chapter Title]`
After rename: `Dashboard > My Courses > Course Title > [Subject Title]` — the `selectedChapter?.title` is dynamic from DB so no change needed in the segments themselves, BUT the back-button label "Back to Chapters" at line 691 becomes "Back to Subjects".

#### 4. `src/pages/AdminCMS.tsx`

UI display labels to rename:
- Line 269–271: Tab trigger text `"Chapters"` → `"Subjects"` (the tab in the CMS tab bar)
- Line 380: `"Add Chapter"` CardTitle → `"Add Subject"`  
- Line 403: `"Chapter Code (e.g., CH-01)"` → `"Subject Code (e.g., SB-01)"`
- Line 411: `"Chapter Title"` → `"Subject Title"`
- Line 418–419: `Add Chapter` button → `Add Subject`
- Line 427: `"Existing Chapters"` → `"Existing Subjects"`
- Line 462: `"No chapters yet"` → `"No subjects yet"`
- Line 153: `toast.success("Chapter created!")` → `toast.success("Subject created!")`

Note: Line 267 already says `"Subjects"` for the Subjects tab — that stays.

#### 5. `src/components/admin/ContentDrillDown.tsx`

UI display label changes:
- Line 476: `"{selectedCourse?.title} — Chapters"` → `"{selectedCourse?.title} — Subjects"`
- Line 483: `"Create Chapter"` button → `"Create Subject"`
- Line 501: `"New Chapter"` (form header) → `"New Subject"`
- Line 504: `placeholder="Chapter title (e.g. Kinematics)"` → `"Subject title (e.g. Kinematics)"`
- Line 515: `"Creating..."` / `"Create"` buttons → stay (generic)
- Line 543: `"Loading chapters..."` → `"Loading subjects..."`
- Line 544 (empty state): `"No chapters yet. Create one above."` → `"No subjects yet. Create one above."`
- Line 600: `chapters.find(...)?.title || "Chapter"` → `"Subject"` fallback
- Line 746: `placeholder="Chapter"` in the edit lesson dropdown → `"Subject"`
- Line 410: `chapters.find(...)?.title || "Chapter"` in breadcrumb → `"Subject"`

Keep internal variable names (`chapters`, `setChapters`, `chapter`, etc.) unchanged — only visible UI strings change.

---

### Summary of what changes vs what stays the same:

```text
CHANGES (display labels only):
  ChapterView.tsx       "Chapters" tab         → "Subjects"
  ChapterView.tsx       "No chapters" text     → "No subjects"
  MyCourseDetail.tsx    "Back to Chapters"     → "Back to Subjects"
  MyCourseDetail.tsx    "Chapters" heading     → "Subjects"
  MyCourseDetail.tsx    "{n} chapters"         → "{n} subjects"
  AdminCMS.tsx          Chapters tab           → Subjects tab
  AdminCMS.tsx          Add/Existing Chapter   → Add/Existing Subject
  ContentDrillDown.tsx  "— Chapters"           → "— Subjects"
  ContentDrillDown.tsx  "Create Chapter"       → "Create Subject"
  ContentDrillDown.tsx  "New Chapter" form     → "New Subject"
  ContentDrillDown.tsx  "Loading chapters..."  → "Loading subjects..."
  ContentDrillDown.tsx  "No chapters yet..."   → "No subjects yet..."
  ContentDrillDown.tsx  "Chapter" fallback     → "Subject"

STAYS THE SAME:
  All DB queries (.from("chapters"), .eq("chapter_id", ...))
  Variable names (chapters, setChapters, chapter, etc.)
  Route paths (/classes/:id/chapters, /chapter/:id)
  The actual "chapter.title" values shown in breadcrumbs (dynamic from DB)
  LectureListing.tsx (no hardcoded "Chapter" display text found)
```

No DB migrations needed. 5 files total.
