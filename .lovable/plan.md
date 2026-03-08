
## Full Context Analysis

### What the user wants
The screenshot shows the inline lesson player with Overview/Resources/Notes/Discussion tabs. The user wants:
1. The inline lesson view to work correctly (already implemented ✅)
2. The **Resources tab** to display the `class_pdf_url` associated with the current lesson (uploaded from admin)
3. The **Notes tab** to correctly show NOTES-type lesson files
4. The admin upload panel already has the Overview + Class PDF fields correctly implemented ✅

### Current Problem — Resources tab is broken for `class_pdf_url`

**`Lesson` interface** (line 24-37) does NOT include `classPdfUrl` — so `class_pdf_url` is never mapped from the DB.

**Resources tab** (lines 843-880) currently shows:
```
lessons.filter(l => l.lectureType === "PDF" || l.lectureType === "DPP")
```
This only shows PDF/DPP-type lessons from the chapter — it completely ignores the `class_pdf_url` column that admin stores per VIDEO lesson.

**Notes tab** (lines 882-918) shows:
```
lessons.filter(l => l.lectureType === "NOTES")
```
This is chapter-wide, not lesson-specific.

### What needs fixing

**`MyCourseDetail.tsx`** only — no DB changes, no other files:

1. **Add `classPdfUrl` to the `Lesson` interface** (line 36)

2. **Map `class_pdf_url` in the lessons fetch** (line 185-190) — add `classPdfUrl: l.class_pdf_url`

3. **Resources tab** — Show `class_pdf_url` of the current `selectedLesson` as the primary resource, PLUS any PDF/DPP-type lessons from the chapter. Currently it shows zero resources for VIDEO lessons that have a `class_pdf_url` attached.

4. **Notes tab** — Same pattern: show NOTES-type lessons from the chapter (already works) but scoped to the lesson's chapter, not course-wide. Currently `lessons` state holds ALL course lessons, so it shows notes from all chapters. Fix: filter by `selectedLesson.chapterId`.

5. **Overview tab** — Remove the hardcoded "Basic definitions, Real-world examples..." learning points (line 776-779). Replace with the actual `overview` text. If `overview` is rich (multi-paragraph), it already shows. But the static "You will learn" box with hardcoded text should be removed or made conditional. If overview text exists, show it; else show a placeholder.

### Exact changes

**Lines 24-37 (Lesson interface)** — add `classPdfUrl: string | null`:
```ts
interface Lesson {
  ...
  duration: number | null;
  chapterId: string | null;
  classPdfUrl: string | null;  // ADD THIS
}
```

**Lines 185-190 (lesson mapping)** — add `classPdfUrl: l.class_pdf_url`:
```ts
const mappedLessons: Lesson[] = (lessonsData || []).map((l: any, idx: number) => ({
  id: l.id, title: l.title, videoUrl: l.video_url, description: l.description,
  overview: l.overview, isLocked: l.is_locked, lectureType: l.lecture_type || "VIDEO",
  position: l.position || idx + 1, youtubeId: l.youtube_id, createdAt: l.created_at,
  duration: l.duration, chapterId: l.chapter_id,
  classPdfUrl: l.class_pdf_url,   // ADD
}));
```

**Lines 763-780 (Overview tab)** — Remove hardcoded learning points. Keep the overview text display. Make the "You will learn" block conditional only if `overview` is absent:
```tsx
<TabsContent value="overview" className="p-4 mt-0">
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-foreground mb-2">About this lesson</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-line">
        {selectedLesson.overview || selectedLesson.description || "No overview available for this lesson."}
      </p>
    </div>
    {/* Only show static block if no real overview */}
    {!selectedLesson.overview && !selectedLesson.description && (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
          <p className="text-sm text-primary font-medium">Content coming soon</p>
        </div>
      </div>
    )}
  </div>
</TabsContent>
```

**Lines 842-880 (Resources tab)** — Major fix. Show:
1. `selectedLesson.classPdfUrl` as a "Class PDF" resource card (if present)
2. PDF/DPP-type lessons from the **same chapter** as the selected lesson

```tsx
<TabsContent value="resources" className="mt-0">
  {(() => {
    // class_pdf_url from this lesson
    const classPdf = selectedLesson.classPdfUrl 
      ? [{ id: 'class-pdf', title: `${selectedLesson.title} - Class PDF`, videoUrl: selectedLesson.classPdfUrl, lectureType: 'PDF' }]
      : [];
    // PDF/DPP type lessons in the same chapter
    const chapterResources = lessons.filter(l => 
      (l.lectureType === "PDF" || l.lectureType === "DPP") && 
      l.chapterId === selectedLesson.chapterId
    );
    const resList = [...classPdf, ...chapterResources];
    
    if (resList.length === 0) return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">No resources available for this lesson.</p>
      </div>
    );
    // show first item or selected inline viewer
    const activeRes = inlineViewer && resList.find(r => r.videoUrl === inlineViewer.url)
      ? inlineViewer
      : { url: resList[0].videoUrl, title: resList[0].title };
    return (
      <div className="flex flex-col">
        {resList.length > 1 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-muted/30">
            {resList.map(r => (
              <button key={r.id}
                onClick={() => setInlineViewer({ url: r.videoUrl, title: r.title })}
                className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  activeRes.url === r.videoUrl
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary"
                )}
              >{r.title}</button>
            ))}
          </div>
        )}
        <div className="px-3 pb-3 pt-2">
          <PdfViewer url={activeRes.url} title={activeRes.title} />
        </div>
      </div>
    );
  })()}
</TabsContent>
```

**Lines 882-918 (Notes tab)** — Scope notes to `selectedLesson.chapterId`:
```tsx
const notesList = lessons.filter(l => 
  l.lectureType === "NOTES" && l.chapterId === selectedLesson.chapterId
);
```

### Files changed
- `src/pages/MyCourseDetail.tsx` only — 4 targeted edits
- No DB changes, no new files
