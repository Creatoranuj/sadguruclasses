
## What the user wants

From the screenshot (circled icon = ExternalLink button) and message:

1. **Remove the `ExternalLink` (open in new tab) button** from both `DriveEmbedViewer.tsx` and `PdfViewer.tsx` — this is the circled redirect button
2. **Block all redirects** — remove `allow-popups-to-escape-sandbox` from the iframe `sandbox` attribute so Archive/PDF iframes can't navigate away
3. **Download button = one-click download + auto-archive** — when clicking Download:
   - Immediately trigger the file download (already works)
   - **Also automatically save to IndexedDB** (the Downloads archive/history) so it appears in My Downloads instantly — currently `onDownloaded` callback is optional and may not always be wired up
4. **Make `DriveEmbedViewer` self-archiving** — accept `useDownloads.addDownload` internally so one click does both: download the file AND save to the Downloads archive

## Files to change

### 1. `src/components/course/DriveEmbedViewer.tsx`
- **Remove** the `ExternalLink` button (lines 148–156)
- **Remove** `allow-popups-to-escape-sandbox` from iframe `sandbox` attribute (line 177) → prevents any redirect out of app
- **Import `useDownloads`** hook → call `addDownload` inside `handleDownload` after success, so every download auto-archives to IndexedDB
- Remove `ExternalLink` from import

### 2. `src/components/video/PdfViewer.tsx`
- **Remove** the `ExternalLink` button (lines 92–101)
- **Remove** `allow-popups-to-escape-sandbox` from iframe `sandbox` (line 110)
- Remove `ExternalLink` from import

### Result
```
Before:   [Download] [Fullscreen] [ExternalLink ← REMOVE]
After:    [Download] [Fullscreen]
```
- No redirect buttons anywhere
- Archive.org/Drive iframes cannot escape via sandbox
- One click on Download = file saved to device + auto-added to My Downloads history
- No other files need changes
