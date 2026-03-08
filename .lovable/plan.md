
## Assessment

### What already exists
1. **`Admin.tsx` Users tab** (lines 955–1067) — already has inline role selector (Student/Teacher/Admin) via `handleChangeRole` with `upsert` on `user_roles`. Works but is buried in a generic "Users" tab alongside search, export, and join date.
2. **`Sidebar.tsx`** — already correctly hides Students & Attendance behind `adminOrTeacher` flag using `isAdmin || isTeacher`.
3. **`AuthContext.tsx`** — already exposes `isTeacher: role === "teacher"`.
4. The `user_roles` table has the `app_role` enum: `admin | teacher | student`.
5. The Admin panel has 8 tabs: Payments, Users, Courses, Content, Upload, Schedule, Library, Social.

### What the user is asking for
A dedicated, clearly labelled **"Teachers" tab** (or page section) in the Admin Panel for role management — separate from the general Users list — so it's obvious and purpose-built for assigning/revoking teacher roles.

### Plan

**One file to edit: `src/pages/Admin.tsx`**

Add a 9th tab: **"Teachers"** between Users and Courses.

The Teachers tab will have two cards side-by-side:
1. **Active Teachers** — shows all users currently with `role = 'teacher'`, with a "Revoke" button per row to demote back to student.
2. **Promote to Teacher** — shows all users with `role = 'student'`, searchable, with a "Make Teacher" button per row.

Both cards reuse the existing `usersList` state (already fetched in `fetchDashboardData`). No new DB queries needed.

#### Tab list change (line 801–808)
Add `<TabsTrigger value="teachers">` with a `GraduationCap` icon between Users and Courses. The tab list currently uses `grid-cols-8` — change to `grid-cols-9`.

#### New state
```typescript
const [teacherSearch, setTeacherSearch] = useState("");
```

#### New computed lists (using existing `usersList`)
```typescript
const activeTeachers = usersList.filter(u => u.role === 'teacher');
const promotableStudents = useMemo(() =>
  usersList.filter(u => (u.role === 'student' || !u.role) &&
    (u.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(teacherSearch.toLowerCase()))
  ), [usersList, teacherSearch]);
```

#### Teacher tab JSX
```text
<TabsContent value="teachers">
  <div className="grid md:grid-cols-2 gap-6">
    
    Card 1: Active Teachers
    - Header: "Active Teachers (N)" in green, GraduationCap icon
    - List: avatar initial, name, email
    - Each row: "Revoke" button (red) → calls handleChangeRole(id, 'student')
    
    Card 2: Promote to Teacher
    - Header: "Assign Teacher Role", search input
    - Filtered list of students
    - Each row: "Make Teacher" button (green) → calls handleChangeRole(id, 'teacher')
    
  </div>
</TabsContent>
```

#### After role change
`handleChangeRole` already calls `setUsersList` to update local state immediately, so both cards will re-render with the correct user instantly (student moves to teachers card, teacher moves back to students list) — no extra logic needed.

### Import to add
`GraduationCap` is already imported on line 2 of Sidebar.tsx but NOT in Admin.tsx. Need to add it to the lucide-react import on line 20 of Admin.tsx.

### No DB migrations needed — `user_roles` table already has proper RLS (admins can manage all roles).

### Summary of changes

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Admin.tsx` | Line 20 | Add `GraduationCap` to lucide-react import |
| `src/pages/Admin.tsx` | Line 60 | Add `teacherSearch` state |
| `src/pages/Admin.tsx` | ~lines 280–300 | Add `activeTeachers` + `promotableStudents` computed values |
| `src/pages/Admin.tsx` | Line 799 | Change `grid-cols-8` → `grid-cols-9` |
| `src/pages/Admin.tsx` | Line 801–808 | Add new Teachers TabsTrigger |
| `src/pages/Admin.tsx` | ~line 1068 | Add new Teachers TabsContent |
