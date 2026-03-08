
## Summary of Current State

### What's already done (verified by reading code):
1. **`formatTime` in MahimaGhostPlayer.tsx** — Already correctly implemented at line 413–420. Returns `H:MM:SS` or `M:SS` format. NO change needed here.
2. **`formatTime` in MahimaVideoPlayer.tsx** — Also correctly implemented at lines 204–211. Same correct format.
3. **Dashboard deduplication** — Already implemented at lines 91–99 in Dashboard.tsx using a `Set<number>`. Works correctly.
4. **DB unique constraint** — Migration was already run in a previous session.

### The REAL issues the user is reporting (based on screenshot):

Looking at the reference screenshot `Screenshot_20260303-053754.Brave.png`, the desired lesson page layout shows:
- Video player with `0:04:30 / 1:56:54` timestamp format at bottom left
- **Title above video**: "Plant Growth and Development 1" with date `23/01/2026`
- **Below video**: `👍 130 Likes` | `? Doubts` (two large pill buttons)
- **Lesson info section**: Large bold title + teacher name, then `Biology · 12 · neet_ug` with Download + Class PDF buttons
- **The timestamp format** `0:04:30` is `H:MM:SS` — already correct in code

**What's actually broken or missing compared to the screenshot:**

1. **Lesson card sidebar**: Currently the sidebar shows plain text list. The screenshot shows a richer style (the sidebar is the right panel course content list in LessonView).

2. **The LessonActionBar** currently shows 4 small buttons: Likes, Comments, Doubts, Class PDF. The screenshot shows **2 large pill buttons** side by side: `👍 130 Likes` and `? Doubts`.

3. **The lesson info area** below the action bar needs the **Download** button alongside Class PDF.

4. **Date in video subtitle** — currently shows `toLocaleDateString()` which may not match `23/01/2026` format (needs `dd/MM/yyyy`).

5. **Dashboard "Continue where you left"** — only shows ONE course card at top. The "My Batches" section below shows a grid of all courses. This matches what we have, but the user says thumbnails are still duplicating.

### Plan:

#### 1. Fix `LessonActionBar` to match the reference screenshot
The reference shows two large pill buttons: **Likes** and **Doubts** (not 4 buttons). Redesign the action bar to:
- Large pill buttons with icon + count
- Style: `👍 130 Likes` and `? Doubts`

#### 2. Add "Download" button to lesson info section
The reference shows `Download` | `Class PDF` buttons in the info area below the action bar.

#### 3. Fix date format in video subtitle
Change `toLocaleDateString()` → `toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })` to get `23/01/2026` format.

#### 4. Dashboard — ensure no duplicates
The code already deduplicates. The issue is likely that the "My Batches" grid below the main card also shows all enrolled courses (as intended), but visually looks like duplicates. User may be seeing the top "Continue Learning" card PLUS the "My Batches" grid showing the same course. This is by design but may confuse — we should remove the "My Batches" section OR merge them into one unified list.

#### 5. Lesson sidebar cards — match reference style
The reference screenshot shows each lesson in the right sidebar as a card-style item. Currently the sidebar has plain list items. The current code already has a decent list style, but we can improve it.

---

## Files to change:

### `src/components/video/LessonActionBar.tsx`
Redesign to 2 primary pill buttons (Likes + Doubts) + optional Download/PDF buttons, matching reference screenshot style.

### `src/pages/LessonView.tsx`
- Fix date format for subtitle to `dd/MM/yyyy`
- Add `Download` button to lesson info section (opens PDF in new tab as download)
- Remove `onComments` separate button (merge into Doubts)

### `src/pages/Dashboard.tsx`
- Remove the "My Batches" section (lines 313–336) so the same course doesn't appear twice on the page — once in the top "Continue Learning" hero card and again in the grid

---

## Summary of what changes vs stays the same

```text
CHANGES:
  LessonActionBar.tsx   Redesign to 2 large pill buttons (Likes + Doubts)
  LessonView.tsx        Fix subtitle date format + add Download button
  Dashboard.tsx         Remove duplicate "My Batches" grid below hero card

STAYS THE SAME:
  formatTime in MahimaGhostPlayer — already correct H:MM:SS
  formatTime in MahimaVideoPlayer — already correct H:MM:SS
  Dashboard deduplication logic — already correct
  DB unique constraint — already applied
```

No database changes needed.
