
## Change: "Start >" → "Enroll Now 🚀" on Course Card

### File
`src/pages/MyCourses.tsx` — line 134

### Current code (lines 128–136)
```tsx
<Button
  size="sm"
  variant="ghost"
  className="gap-1 text-primary"
  onClick={() => onNavigate(course.id)}
>
  {course.progressPercent > 0 ? "Continue" : "Start"}
  <ChevronRight className="h-4 w-4" />
</Button>
```

### Change
- Replace `"Start"` with `"Enroll Now 🚀"`
- Keep the `ChevronRight` icon for "Continue" case (progress > 0), but only for the continue state; remove it when it says "Enroll Now" (or keep it — user only asked about "Start" case)
- Since "Continue" is a separate state the user didn't mention, keep it as-is

### New code
```tsx
<Button
  size="sm"
  variant="ghost"
  className="gap-1 text-primary"
  onClick={() => onNavigate(course.id)}
>
  {course.progressPercent > 0 ? (
    <>Continue <ChevronRight className="h-4 w-4" /></>
  ) : (
    "🚀 Enroll Now"
  )}
</Button>
```

This cleanly separates the two states:
- New student → `🚀 Enroll Now` (no arrow, rocket emoji)
- Returning student → `Continue >` (same as before)

One file, one section changed.
