
## Problem: Two separate issues causing duplicate thumbnails

### Issue 1 — Visual: BatchSelector shows 2 images in trigger
**Root cause**: Radix `<SelectValue>` mirrors the full content of the selected `<SelectItem>` (including its `<img>`) into the trigger. The trigger ALSO has an explicit `<img src={selectedBatch.image_url}>` rendered before `<SelectValue>`. So two images appear: one hardcoded, one reflected from the SelectItem.

**Fix**: Remove the explicit `<img>` from inside `<SelectTrigger>` and instead pass a `placeholder` to `<SelectValue>`, or use the `displayValue` pattern. The cleanest fix: keep the explicit img but hide SelectValue's mirrored image by using `SelectValue` with a fixed text-only display via the `children` prop override.

Simplest approach: Replace the SelectItem's image+text layout with text-only for what gets mirrored into SelectValue, and show the image only in the dropdown list. Use `SelectValue`'s `children` prop to render a plain text label, so Radix doesn't mirror the img.

```tsx
// In SelectTrigger: keep the explicit img + show a plain text span
<SelectValue>
  {selectedBatch?.title} {selectedBatch?.grade && `(Class ${selectedBatch.grade})`}
</SelectValue>
```
This overrides Radix's mirror behavior so only one image shows.

### Issue 2 — Data: Duplicate enrollment rows in DB
The `enrollments` table has no `UNIQUE(user_id, course_id)` constraint. The prompt's SQL is correct:
1. Clean existing duplicates (keep earliest per user+course)
2. Add `UNIQUE(user_id, course_id)` constraint

The Dashboard query already deduplicates in JS (lines 92–99), and BatchContext already deduplicates (lines 49–63), so the frontend is safe. But the DB constraint prevents future duplicates at the source.

The `upsert` in `useEnrollments.ts` already uses `onConflict: 'user_id,course_id'` — this will work correctly once the constraint exists.

---

## Files to change

### 1. `src/components/dashboard/BatchSelector.tsx`
- Remove the explicit `<img>` from inside `<SelectTrigger>` OR keep it but override `<SelectValue>` with a custom render that shows only text — preventing Radix from mirroring the SelectItem img into the trigger
- Specifically: wrap `SelectValue` so it renders `{selectedBatch?.title}` as text, not the full SelectItem JSX

### 2. DB Migration (SQL)
```sql
-- Step 1: Remove duplicate enrollments, keep earliest per user+course
DELETE FROM enrollments
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, course_id) id
  FROM enrollments
  ORDER BY user_id, course_id, purchased_at ASC NULLS LAST
);

-- Step 2: Add unique constraint
ALTER TABLE enrollments 
ADD CONSTRAINT unique_user_course UNIQUE (user_id, course_id);
```

No changes needed to `Dashboard.tsx` or `BatchContext.tsx` — they already deduplicate in JS correctly.

---

## Summary

| Change | File | Impact |
|---|---|---|
| Fix double-image in BatchSelector trigger | `BatchSelector.tsx` | Visual fix for duplicate thumbnails |
| Remove duplicate DB rows + add UNIQUE constraint | Migration | Prevents future duplicates at DB level |
