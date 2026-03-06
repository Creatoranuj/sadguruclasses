# Plan: Fix PDF Viewer Full-Page + Download + Archive.org Support

## Problems Found

1. **DriveEmbedViewer returns `null` for Archive.org URLs** — Line 56: `if (!isDrive && !isPdf) return null` means Archive.org content never renders through this component
2. **PdfViewer is never used** — It exists but no component imports it; all PDF/Drive rendering goes through DriveEmbedViewer
3. **Archive.org download URL assumes `{id}.pdf**` — This may not match the actual filename on Archive.org; needs smarter fallback
4. **No fullscreen toggle in DriveEmbedViewer** — PdfViewer has it but DriveEmbedViewer doesn't, and DriveEmbedViewer is what's actually used everywhere
5. Test the PDF viewer with a Google Drive link, Archive.org link, and direct PDF to verify download and fullscreen work correctly
6.   
Add a Google Docs document viewer with export-to-PDF download support in DriveEmbedViewer  
Add a Google Docs document viewer with export-to-PDF download support in DriveEmbedViewer
7.   
Ensure the discussion tab in lecture modal shows real comments and allows posting

## Changes

### 1. Expand DriveEmbedViewer to handle Archive.org URLs (`src/components/course/DriveEmbedViewer.tsx`)

- Add Archive.org detection: if URL contains `archive.org`, extract identifier, use `archive.org/embed/{id}` for embedding
- Remove the `if (!isDrive && !isPdf) return null` guard — instead render any URL that matches drive/pdf/archive/docs patterns
- Add Google Docs detection too (embed via `docs.google.com/document/d/{id}/preview`)
- Add fullscreen toggle (matching PdfViewer's implementation)
- Add branding bar at bottom

### 2. Improve Archive.org download in fileUtils (`src/utils/fileUtils.ts`)

- Keep current approach but add a `no-cors` fallback: if blob fetch fails, open `archive.org/download/{id}` directly which shows Archive.org's own download page with all available formats

### 3. Update UnifiedVideoPlayer Archive.org handling (`src/components/video/UnifiedVideoPlayer.tsx`)

- For Archive.org URLs that are PDFs/documents (not videos), route to DriveEmbedViewer instead of the video iframe
- Detect PDF vs video by checking if URL contains `/details/` patterns for books vs videos

### 4. Remove unused PdfViewer or consolidate

- Since DriveEmbedViewer will now handle all cases, keep PdfViewer as-is but it remains unused — no changes needed

## Files to Modify


| File                                          | Change                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `src/components/course/DriveEmbedViewer.tsx`  | Add Archive.org + Docs support, fullscreen, branding bar, remove null guard |
| `src/components/video/UnifiedVideoPlayer.tsx` | Route archive PDFs to DriveEmbedViewer                                      |
| `src/utils/fileUtils.ts`                      | Minor: improve Archive.org download fallback URL                            |
