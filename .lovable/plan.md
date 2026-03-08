
## What needs to be done

Four tasks:
1. **Quiz attempts history on Dashboard** — add a "My Quiz Attempts" section to `Dashboard.tsx`
2. **Teacher role management in Admin** — add role-change buttons to the existing Users tab in `Admin.tsx`
3. **Fix remaining old logo import** — `Dashboard.tsx` line 15 still imports `refresh-logo.png`
4. **Verification notes** — AllClasses duplicate fix is already done (lines 208–221 show the badge), Sidebar is already updated (role-based filtering at lines 48–51)

---

## Task 1: My Quiz Attempts on Dashboard

**Where**: `src/pages/Dashboard.tsx`

Add a new section for students (not teachers) below the `UpcomingSchedule` component. Fetch from `quiz_attempts` joined with `quizzes`:

```sql
SELECT qa.*, q.title, q.type, q.total_marks
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
WHERE qa.user_id = auth.uid()
ORDER BY qa.created_at DESC
LIMIT 10
```

UI: a card with a list of rows showing:
- Quiz title + type badge (DPP/Test)
- Score `X / Y marks`
- Percentage `Z%`
- Pass/Fail badge (green/red)
- Date

Also fix the stale `refreshLogo` import on line 15 → replace with `logo_icon_web.png`.

---

## Task 2: Teacher Role Management in Admin Users Tab

**Where**: `src/pages/Admin.tsx` — Users tab (lines ~989–1026)

The Users tab already shows a list of users with their roles. We need to add inline role management: a **role selector dropdown** on each user row with a "Save" button.

**New state needed**:
- `roleChanging: Record<string, boolean>` — tracks which userId is being saved

**New handler**:
```typescript
const handleChangeRole = async (userId: string, newRole: string) => {
  // Upsert into user_roles table
  await supabase.from('user_roles')
    .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' })
  // Refresh usersList
  fetchDashboardData();
}
```

**UI change**: In each user row (currently read-only role badge), replace with:
```tsx
<Select value={u.role || 'student'} onValueChange={(v) => handleChangeRole(u.id, v)}>
  <SelectTrigger className="w-28 h-7 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="student">Student</SelectItem>
    <SelectItem value="teacher">Teacher</SelectItem>
    <SelectItem value="admin">Admin</SelectItem>
  </SelectContent>
</Select>
```

This is much simpler than a separate page — inline in the existing Users tab is cleaner.

---

## Summary of file changes

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Fix logo import; add "My Quiz Attempts" section with Supabase fetch |
| `src/pages/Admin.tsx` | Add inline role selector to each user row in Users tab + `handleChangeRole` function |

No DB migrations needed — `quiz_attempts`, `quizzes`, and `user_roles` tables already exist with correct RLS.

---

## AllClasses & Sidebar — Already Fixed

- `AllClasses.tsx` lines 208–221: batch filter badge with "Show All" is already in place ✓
- `Sidebar.tsx` lines 48–51: `adminOrTeacher` filtering already applied ✓

No changes needed there.
