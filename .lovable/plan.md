
## Analysis of Current State

### What's already done well:
1. **PdfViewer.tsx** — Has Download button with loading state, Sadguru watermark, fullscreen. No Archive.org logo shown. ✅
2. **DriveEmbedViewer.tsx** — Already handles Archive.org direct PDFs (async resolve via metadata API), Google Drive preview embed, sandbox attributes. ✅
3. **fileUtils.ts** — `downloadFile` utility already tries blob fetch first, falls back to new tab. ✅

### What's missing / needs building:
1. **Downloads page (`/downloads`)** — Does NOT exist. No page, no route, no sidebar entry, no IndexedDB logic.
2. **`useDownloads` hook + `indexedDB.ts` lib** — Don't exist.
3. **Download tracking** — When `downloadFile` succeeds, nothing is saved to any local store.
4. **Sidebar "Downloads" link** — Not present.
5. **BottomNav "Downloads" tab** — Not present.

### Screenshots analysis:
- Screenshot 1: Lesson view with PDF badges in course content sidebar
- Screenshot 2: Professional chapter table with Download links
- Screenshot 3/4: Archive.org reader (already handled inside app with direct PDF)

The user is mainly asking for:
1. In-app Downloads section with IndexedDB storage
2. Download button logs to Downloads history
3. Sidebar/nav entry for Downloads page
4. Downloads page UI showing history

---

## Plan

### Files to create:

**`src/lib/indexedDB.ts`** — IndexedDB wrapper with schema:
```
DB: sadguru_app, version 1
Store: downloads
  key: id (auto-increment)
  fields: title, filename, url, downloadedAt (ISO), fileType, thumbnailIcon
```
Exports: `addDownload(item)`, `getDownloads()`, `deleteDownload(id)`

**`src/hooks/useDownloads.ts`** — React hook wrapping IndexedDB:
- State: `downloads[]`, `loading`
- Methods: `addDownload(title, url, filename, fileType)`, `deleteDownload(id)`, `refresh()`

**`src/pages/Downloads.tsx`** — New page at `/downloads`:
- Header: "My Downloads" with count badge
- Empty state: icon + "No downloads yet. Download PDFs from lessons to see them here."
- List view: Card per download showing title, date, file type badge (PDF/NOTES/DPP), "Open" button (→ PdfViewer), "Delete" button
- Clean professional layout matching screenshots (table-style on desktop, cards on mobile)

### Files to modify:

**`src/utils/fileUtils.ts`** — Export a new `downloadFileWithTracking(url, filename, title, fileType, onLog)` function that calls `downloadFile` internally and then calls `onLog(metadata)` callback on success. This keeps the tracking optional and decoupled.

**`src/components/video/PdfViewer.tsx`** — Pass an optional `onDownloaded` callback prop. When download succeeds, call `onDownloaded({ title, url, filename })` so parent can log it.

**`src/components/course/DriveEmbedViewer.tsx`** — Same: add optional `onDownloaded` prop.

**`src/pages/LessonView.tsx`** — When user downloads from PdfViewer/DriveEmbedViewer inside LessonView, call `addDownload` from `useDownloads`.

**`src/App.tsx`** — Add `<Route path="/downloads" element={<Downloads />} />`.

**`src/components/Layout/Sidebar.tsx`** — Add "Downloads" link with `Download` icon before "Books".

**`src/components/Layout/BottomNav.tsx`** — Add "Downloads" as 5th tab (replacing or adding next to Profile; or add as 4th visible tab).

---

## Summary

```text
CREATE:
  src/lib/indexedDB.ts        IndexedDB setup: addDownload, getDownloads, deleteDownload
  src/hooks/useDownloads.ts   React hook for downloads state
  src/pages/Downloads.tsx     /downloads page — list downloaded PDFs

MODIFY:
  src/utils/fileUtils.ts      Add onSuccess callback variant for tracking
  src/components/video/PdfViewer.tsx          Add onDownloaded prop
  src/components/course/DriveEmbedViewer.tsx  Add onDownloaded prop
  src/pages/LessonView.tsx    Wire useDownloads to PdfViewer/DriveEmbedViewer
  src/App.tsx                 Add /downloads route
  src/components/Layout/Sidebar.tsx   Add Downloads nav item
  src/components/Layout/BottomNav.tsx Add Downloads tab

NO CHANGES NEEDED:
  PdfViewer embed logic       Archive.org already handled with direct PDF URLs
  fileUtils.ts core logic     downloadFile already correct
  DB/migrations               IndexedDB is client-side only
```

All changes are purely front-end. No Supabase changes. No new dependencies needed (IndexedDB is a browser native API).
