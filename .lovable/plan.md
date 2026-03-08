
## Problem
When an Archive.org URL is used (video lesson URL or class PDF URL), the `DriveEmbedViewer` embeds the PDF iframe which shows the **Internet Archive logo/header bar** at the top of the embedded content. The user's screenshot (annotated with red arrows) confirms this.

The current code in `DriveEmbedViewer.tsx` (line 184–194) only adds a **watermark at the bottom-right**, but has **no masking overlay for the top** of the iframe where Archive.org's logo appears.

For Archive **video** embeds in `UnifiedVideoPlayer.tsx` (line 86), there IS already a black bar: `<div style={{ height: "50px", background: "black" }} />` — but this is only for the video iframe path, not the document/PDF path that goes through `DriveEmbedViewer`.

## Fix — `DriveEmbedViewer.tsx` only

Add a **masking overlay `div`** that covers the top of the iframe **only when `isArchive === true`**. This is a transparent-to-the-outside black bar that sits over the Archive.org navbar:

```
[Our header bar: title + Download + Fullscreen + Open]
[iframe content]
 ┌──────────────────────────────────────┐
 │ ████████████ MASK TOP ~50px ████████ │  ← absolute div z-30, black, covers Archive logo
 │  [Archive.org iframe content below]  │
 │                                      │
 └──────────────────────────────────────┘
[Sadguru watermark bottom-right]
```

### Exact change in `DriveEmbedViewer.tsx`

**In the `{/* PDF / iframe area */}` section (lines 161–195)**, after the existing iframe render, add a conditional top masking overlay when `isArchive` is true:

```tsx
{/* Archive.org top-bar mask — hides the IA logo/nav that bleeds through */}
{isArchive && iframeSrc && (
  <div
    className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
    style={{ height: "52px", background: "black" }}
    aria-hidden="true"
  />
)}
```

This mirrors exactly what `UnifiedVideoPlayer.tsx` already does for Archive video embeds at line 86.

### Also improve iframe URL for Archive PDFs

Currently line 174:
```tsx
src={isArchive ? `${iframeSrc}#toolbar=0&navpanes=0` : iframeSrc}
```
This already appends `#toolbar=0&navpanes=0` for archive — good. But the **direct PDF URL** (`https://archive.org/download/id/file.pdf`) renders natively in the browser PDF viewer which shows the browser's own PDF toolbar, not Archive's page. The masking div covers both cases correctly.

### Files changed
- `src/components/course/DriveEmbedViewer.tsx` — 1 addition: conditional top-mask div (~5 lines)
- No other files needed

### Result
- Archive.org logo/navbar is covered by a black bar matching the app background
- The Sadguru watermark still shows bottom-right (existing behavior)
- For non-Archive URLs (Google Drive, direct PDF), no change in appearance
- The existing Archive loading state, download, fullscreen, open-in-tab buttons are unaffected
