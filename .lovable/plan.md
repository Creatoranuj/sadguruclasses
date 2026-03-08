
## What I found (current state)

### 1. Library file_type selector
**Current**: In `Admin.tsx`, the Materials form (`handleCreateMaterial` line 668) auto-detects `file_type` from URL extension: `file_url.match(/\.(\w+)($|\?)/)`. There is **no explicit selector** for PDF, Notes, or DPP. The file upload path (lines 1693–1720) hard-codes `fileExt.toUpperCase()` (e.g. "PDF") regardless of the user's intent.

**Impact on student side**: `useMaterials.ts` stores items from the `materials` table with `fileType: m.file_type`. `Materials.tsx` uses `fileType` for the filter dropdown and `getFileIcon()`. So if `file_type` is stored as "PDF" when it should be "DPP", students won't find it under the DPP filter.

**Fix needed**: Add a `<Select>` with options PDF / Notes / DPP in the Materials add-form in `Admin.tsx`. This value gets passed as `file_type` when inserting. The file upload path should also use the selected type, not the file extension.

### 2. Bulk image URL import in AdminQuizManager
**Current**: AdminQuizManager (lines 719+) shows a question list with individual image upload per question. There is **no bulk import feature** for image URLs.

**Fix needed**: Add a "Bulk Import" section/button in the Edit Questions view (or a separate panel) where admin can paste multiple image URLs (one per line). Clicking "Import" auto-creates one new question per URL, with the image_url pre-filled and a blank `question_text` for the admin to fill in.

### 3. Quiz image upload verification
**Current state from code review**:
- `handleSaveQuestions` (lines 272–298): correctly uploads `_imageFile` to `content` bucket → stores public URL as `image_url`
- `loadQuizForEdit` (lines 310–332): correctly loads `image_url` back from DB  
- `QuizAttempt.tsx`: renders `{currentQ.image_url && <img ... />}` — already correct
- `QuizResult.tsx`: renders question images in review mode — already correct
- The image upload UI at lines 901–946 is implemented

**Verdict**: The quiz image feature is fully implemented in code. No code changes needed for this. We should just inform the user it's working.

---

## Files to change

### `src/pages/Admin.tsx`

**Materials section** — Add file type selector state + UI:

1. Add state: `const [materialFileType, setMaterialFileType] = useState<"PDF" | "NOTES" | "DPP">("PDF")`

2. In the Materials add form (around line 1646), add a `<Select>` after the title input:
```tsx
<Select value={materialFileType} onValueChange={(v) => setMaterialFileType(v as any)}>
  <SelectTrigger><SelectValue placeholder="File Type" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="PDF">PDF</SelectItem>
    <SelectItem value="NOTES">Notes</SelectItem>
    <SelectItem value="DPP">DPP</SelectItem>
  </SelectContent>
</Select>
```

3. In `handleCreateMaterial` (line 668–678): change `file_type` from auto-detect to use `materialFileType`:
```diff
- file_type: newMaterial.file_url.match(/\.(\w+)($|\?)/)?.[1]?.toUpperCase() || 'PDF',
+ file_type: materialFileType,
```

4. In the file upload path (lines 1704–1710): change `fileExt?.toUpperCase()` to `materialFileType`:
```diff
- file_type: fileExt?.toUpperCase() || 'PDF',
+ file_type: materialFileType,
```

5. After success, reset: `setMaterialFileType("PDF")`.

### `src/pages/AdminQuizManager.tsx`

**Bulk Import panel** — Add below the Expand/Collapse buttons in the Edit Questions view (around line 755):

1. Add state:
```tsx
const [showBulkImport, setShowBulkImport] = useState(false);
const [bulkImageUrls, setBulkImageUrls] = useState("");
```

2. Add bulk import UI: a collapsible panel with a `<textarea>` for pasting URLs (one per line) and an "Import Questions" button.

3. Import handler:
```tsx
const handleBulkImport = () => {
  const urls = bulkImageUrls.split("\n").map(u => u.trim()).filter(Boolean);
  if (!urls.length) return;
  const newQs = urls.map(url => ({ ...defaultQuestion(), image_url: url }));
  setQuestionForms(prev => [...prev, ...newQs]);
  // Auto-expand newly added questions
  setExpandedQuestions(prev => {
    const next = { ...prev };
    const startIdx = questionForms.length;
    newQs.forEach((_, i) => { next[startIdx + i] = true; });
    return next;
  });
  setBulkImageUrls("");
  setShowBulkImport(false);
  toast.success(`${urls.length} questions added from image URLs`);
};
```

4. Place the bulk import toggle button in the header row next to "Add" button.

---

## Summary of changes

```text
CHANGES:
  Admin.tsx           Add materialFileType state + Select dropdown in Materials form
  Admin.tsx           Use materialFileType in handleCreateMaterial + file upload path
  AdminQuizManager    Add bulk import UI + handler for pasting multiple image URLs

NO CHANGES NEEDED:
  QuizAttempt.tsx     Already renders image_url correctly
  QuizResult.tsx      Already renders image_url in review mode
  useMaterials.ts     Already uses file_type from DB correctly
  Materials.tsx       Already filters by fileType correctly
```

No database migrations needed — `image_url` column already exists on `questions` table.
