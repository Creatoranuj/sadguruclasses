
## Current State Analysis

**What exists:**
- `DriveEmbedViewer.tsx` — already handles Archive.org URLs via `extractArchiveId()`, embeds `https://archive.org/embed/{id}`, has download + fullscreen + branding overlay. BUT the download calls `downloadFile(url)` which passes the archive `embed/` URL to `getDownloadUrl()`, which returns `https://archive.org/download/{id}` (the listing page, not the actual PDF file).
- `ArchiveBookReader.tsx` — fetches metadata from `archive.org/metadata/{id}` API, lists all download formats with direct file links. This is already the correct approach for finding the real PDF URL.
- `fileUtils.ts` — `getDownloadUrl` for archive returns the folder listing, not a specific PDF file.

**The problems to fix:**
1. Download button in `DriveEmbedViewer` opens the archive download listing page, not the actual PDF — need to call the metadata API to get the real `.pdf` file URL.
2. Archive.org iframe has its own branding bar at the top — can't hide it cross-origin, but we can cover the top/bottom with our own overlay bars.
3. Screenshots show the PDF viewer inline in the lesson page (not a separate modal) — the current flow using `LessonActionBar` opens the PDF in `window.open`, not embedded. The screenshots show it embedded in the lesson tab area.

**What the screenshots show:**
- `Screenshot_20260308-114201.Chrome.png`: The Archive.org BookReader is embedded in a lesson page under the title "COMPLETE 11 TH NOTES( 1)". Below it are "Show Notes & Description" collapsed section, then "Smart Notes" and "Discussion" tabs. The Archive.org header is visible with a column/nav icon — this is inside the iframe.
- `Screenshot_20260308-114239.Brave.png`: Same content but in Brave browser — the Archive.org BookReader embed with its own left-side controls (magnify, list, ...) overlapping the iframe. This is normal behavior for the Archive.org BookReader.

**Key insight:** The archive.org embed already works for display. The main gap is:
1. Download needs to fetch metadata API to get direct `.pdf` file URL, then use blob download.
2. The "class_pdf_url" in a lesson can be an archive.org URL — when that's clicked it should open the embedded `DriveEmbedViewer` inside the Resources/PDF tab, not just `window.open`.

## Plan

### 1. Fix `fileUtils.ts` — smarter Archive.org download

Update `getDownloadUrl` to try the direct PDF URL pattern first:
```ts
// Archive.org — try direct PDF pattern first
if (archiveId) {
  return `https://archive.org/download/${archiveId}/${archiveId}.pdf`;
}
```

This is synchronous. If CORS blocks it, `downloadFile` already falls back to opening in new tab.

But the real fix is async — fetch the metadata API to get the exact filename. Add a new function `getArchiveDownloadUrl(identifier)` that:
1. Calls `https://archive.org/metadata/{identifier}`
2. Looks for files where `format` includes "pdf"
3. Returns `https://archive.org/download/{identifier}/{filename}`
4. Falls back to `https://archive.org/download/{identifier}/${identifier}.pdf` if no PDF found
5. Falls back to `https://archive.org/download/{identifier}` if metadata fails

### 2. Update `DriveEmbedViewer.tsx` — async download for Archive.org

Change `handleDownload` to use the new async `getArchiveDownloadUrl()` when the URL is an Archive.org URL, then call `downloadFile` with that direct URL.

Also: add a top overlay bar (absolute positioned, z-10) to cover the Archive.org header that shows their logo. Use a thin `h-8` bar matching our app's dark background color, with `pointer-events-none` so iframe clicks pass through — except we need it to cover only the very top strip.

**Reality check on branding suppression:** Archive.org's BookReader iframe shows controls on the LEFT side (as seen in screenshot), not just top. These are inside the cross-origin iframe so CSS cannot reach them. The best we can do:
- Our app header bar (already there) appears ABOVE the iframe with our branding — this is the most visible area.
- We already have a bottom gradient overlay with our logo.
- The top of the IFRAME itself shows Archive.org's book title bar — we can overlay this by placing an absolutely-positioned `div` at the top of the iframe container with `z-10`, height ~40px, matching our dark background.

### 3. Add Archive.org PDF embed in LessonView `class_pdf_url` tab

Currently `onDownloadPdf` in `LessonActionBar` calls `window.open(class_pdf_url, '_blank')`. Instead, add a "PDF" tab (or use the existing Resources tab) that embeds `DriveEmbedViewer` with the `class_pdf_url` when it's an archive.org link. This matches the screenshot where the PDF is shown inline.

In `LessonView.tsx`, the tabs are: Overview, Resources, Notes, Discussion. We should add a conditional **"PDF" tab** that appears when `currentLesson.class_pdf_url` is set — renders `DriveEmbedViewer` with the PDF URL inline.

### 4. Update `memorywork.md` with summary

---

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/fileUtils.ts` | Add `getArchiveDownloadUrl(id)` async function; update `getDownloadUrl` to use `{id}.pdf` pattern as sync fallback |
| `src/components/course/DriveEmbedViewer.tsx` | Use async archive download, add top branding overlay strip to cover Archive.org header |
| `src/pages/LessonView.tsx` | Add "PDF" tab (5th tab, conditional) with inline `DriveEmbedViewer` for `class_pdf_url` |
| `memorywork.md` | Update with Archive.org integration summary |

---

## Technical Details

**`getArchiveDownloadUrl` flow:**
```
fetch https://archive.org/metadata/{id}
  → find file where format contains "pdf" 
  → return https://archive.org/download/{id}/{file.name}
  → fallback: https://archive.org/download/{id}/{id}.pdf
  → fallback: https://archive.org/download/{id}
```

**DriveEmbedViewer branding overlay (top strip):**
```tsx
{/* Top overlay — covers Archive.org header strip */}
{/archive\.org/.test(url) && (
  <div className="absolute top-0 left-0 right-0 h-10 z-10 bg-gray-900 flex items-center px-3 gap-2 pointer-events-none">
    <img src={refreshLogo} className="h-5 w-5 rounded" />
    <span className="text-white text-xs font-semibold">Sadguru Coaching Classes</span>
  </div>
)}
```
This covers the Archive.org bookmark icon and title bar at the very top of the iframe.

**LessonView PDF tab:**
```tsx
{currentLesson?.class_pdf_url && (
  <TabsTrigger value="pdf">
    <FileText className="h-3 w-3 mr-1" />PDF
  </TabsTrigger>
)}
// ...
{currentLesson?.class_pdf_url && (
  <TabsContent value="pdf">
    <DriveEmbedViewer url={currentLesson.class_pdf_url} title={currentLesson.title} />
  </TabsContent>
)}
```

Grid changes from `grid-cols-4` to `grid-cols-5` (or dynamically based on whether PDF tab shows).
