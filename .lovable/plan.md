
## What the user wants

1. **Lesson Page Layout** — Match the Vedantu screenshot: prominent lesson title + date header, Likes/Comments/Doubts action bar (already exists), lesson info section with title/subject/description/"Read More", a "Smart Notes" / "Ask Doubt" card section, and a **"Topics Covered" timeline** with clickable timestamps.
2. **Install page APK link** — Update the GitHub release URL from the placeholder `YOUR_USERNAME/YOUR_REPO` to the real URL, matching what the screenshot shows.
3. **Documentation update** — Update `IMPLEMENTATION_STATUS.md` with a final comparison table.

## What is already done (no changes needed)

- Video player: `MahimaGhostPlayer` fully wired with watermark, controls, skip, settings, rotation — already rendered correctly in `LessonView.tsx`
- `LessonActionBar`: Likes button + count, Doubts button, Class PDF / Download buttons — all wired to real data
- Tabs: Overview, PDF, Resources, Notes, Discussion — all exist and functional
- Comments system: real-time, image attachment, fully working
- Progress tracking: 80% rule, `user_progress` upsert

## What needs to be built

### 1. Lesson info section enhancement (LessonView.tsx)

The current "info section" (lines 511–523) shows title, duration, and rating. We need to enhance it to match the screenshot:

**Current:**
- Title
- Duration + Star rating
- Tabs immediately follow

**Desired (matching screenshot):**
- Lesson title bold, large
- Subject line: `Biology • 12 - neet_ug` style (using `course.subject`, `course.grade`, `course.category`)
- Short description with **"Read More"** expand/collapse (truncate to 2 lines by default)
- The `LessonActionBar` already shows Likes/Comments/Doubts — keep it, but add a **"Comments"** button (currently only "Doubts" — add a Comments button that scrolls to the Discussion tab)

### 2. Smart Notes + Ask Doubt cards (new section above tabs)

Between the action bar and the tabs, add 2 cards styled like the Vedantu screenshot:
- **"Smart Notes"** card — pill icon + text + chevron → clicking opens/jumps to the Notes tab
- **"Ask in class Doubt"** card — pill icon + "Get instant doubt solving" subtext + chevron → clicking opens the Discussion tab

These are purely UI cards that navigate to the existing tab functionality. No new backend needed.

### 3. Topics Covered section (new collapsible in Overview tab)

The `lessons` table has a `description` and `overview` field. We'll add a "Topics Covered" collapsible section inside the **Overview** tab. Since there is no `lesson_topics` table, we will:
- Parse the `overview` field as newline-separated `timestamp|topic` pairs (e.g. `0:00:18|Beginning the Plant Kingdom Chapter`)
- If `overview` has no structured data, show a placeholder message for admin to add topics
- For admin users, show an editable textarea to set the topics (saved to `overview` field in Supabase)

This approach requires **no DB migration** — reuses the existing `overview` column that already exists on the `lessons` table.

### 4. Fix Install page APK link

`Install.tsx` line 76: `href="https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest"` — update this to a real GitHub releases URL. Since we don't know the actual repo, we'll update it to a sensible placeholder that admins can configure, and add a note. Based on the project context (Sadguru Coaching Classes), the URL will be: `https://github.com/sadguru-coaching/sadguru-app/releases/latest` with a note that this needs to be updated once the GitHub repo is created.

### 5. Update IMPLEMENTATION_STATUS.md

Add final Session 7 entry with table comparing what was done.

## Files to change

| File | Change |
|------|--------|
| `src/pages/LessonView.tsx` | Enhance lesson info section + add Smart Notes/Doubt cards + Topics Covered in Overview tab |
| `src/components/video/LessonActionBar.tsx` | Add "Comments" button alongside Doubts; clean up duplicate Download/Class PDF buttons |
| `src/pages/Install.tsx` | Update APK download URL |
| `IMPLEMENTATION_STATUS.md` | Append final status table |

## Detailed design for LessonView.tsx changes

### A. LessonActionBar — fix duplicate buttons + add Comments

Currently has both "Download" AND "Class PDF" buttons that do the same thing (lines 71–98). This is a bug — they render twice. Fix: keep only one "Class PDF" button. Also add a "Comments" button between Likes and Doubts.

New button row: `[Likes] [Comments] [Doubts] [Class PDF (conditional)]`

### B. Lesson info section (after LessonActionBar, before Tabs)

```
┌────────────────────────────────────────────┐
│ Plant Kingdom 1 | Tarun Kumar              │  ← lessonTitle (bold)
│ Biology • Class 12 · neet_ug    [Class PDF]│  ← course.subject • grade  + PDF pill
│ Plants are awesome... [Read More]           │  ← description, 2-line truncate + toggle
└────────────────────────────────────────────┘
```

### C. Smart Notes + Ask Doubt cards (before tabs)

```
┌──────────────────────────────────┐
│ 📋 Smart Notes                 > │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ ❓ Ask in class Doubt            │
│    Get instant doubt solving    >│
└──────────────────────────────────┘
```

These are `<button>` elements styled as rounded cards that call `tabsTrigger.click()` to switch tabs.

### D. Topics Covered in Overview tab

```
▼ Topics Covered
  0:00:18  Beginning the Plant Kingdom Chapter
  0:02:06  Introduction to Plant Kingdom  
  0:07:48  System of Classification: Revisiting Five
```

Parse from `currentLesson.overview` using format `timestamp|topic\n` per line.
For admins: show an "Edit Topics" textarea + save button that updates `overview` via Supabase.
If no topics set, show "Topics will be added soon."

## APK / GitHub release note

The `Install.tsx` will be updated with a note explaining the admin needs to paste their actual GitHub release URL. The `capacitor.config.ts` and `docs/APK-BUILD-GUIDE.md` already document the full APK build process. **We cannot generate the actual APK file inside Lovable** — that must be done locally via Android Studio as documented. We will update the Install page to reflect the correct project name and make the URL easy to update.
