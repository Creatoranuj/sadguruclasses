
## Current State

All sidebar items already have working routes and page components:
- `/books` → `Books.tsx` ✓
- `/notices` → `Notices.tsx` ✓  
- `/students` → `Students.tsx` ✓
- `/attendance` → `Attendance.tsx` ✓
- `/reports` → `Reports.tsx` ✓
- `/messages` → `Messages.tsx` ✓
- `/profile` → `Profile.tsx` ✓
- `/settings` → `Settings.tsx` ✓
- `/admin` → `Admin.tsx` (admin-only, already guarded) ✓

## Issues to Fix

**1. Role-based visibility gaps**
- `Students` and `Attendance` are admin/teacher-only features but visible to all users in the sidebar
- `Reports` is currently open to all — reasonable to keep for students (it shows their own progress)
- The `isAdmin` flag is already available from `useAuth()`; need to also check `isTeacher`

**2. Active state doesn't handle nested paths**
- Current logic: `location.pathname === item.path` (exact match only)
- Problem: navigating to `/books/some-detail` won't highlight "Books" in sidebar
- Fix: use `location.pathname.startsWith(item.path)` with a guard for `/` (root)

**3. Visual polish for active item**
- Screenshot shows a salmon/coral pill for active "Attendance" item
- Current code uses `bg-sidebar-accent` which may already look correct, but let's ensure the active item uses the same style shown in screenshot: a rounded pill with primary-adjacent color (`hsl(var(--primary)/20)` tinted background with solid primary text)

## Plan

### Single file change: `src/components/Layout/Sidebar.tsx`

**Changes:**

1. Add `adminOrTeacherOnly` flag to certain menu items:
```typescript
const menuItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: GraduationCap, label: "My Courses", path: "/my-courses" },
  { icon: BookOpen, label: "Courses", path: "/courses" },
  { icon: Library, label: "Books", path: "/books" },
  { icon: Bell, label: "Notices", path: "/notices" },
  { icon: Users, label: "Students", path: "/students", adminOrTeacher: true },
  { icon: Calendar, label: "Attendance", path: "/attendance", adminOrTeacher: true },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];
```

2. Filter items in render based on role:
```typescript
const visibleItems = menuItems.filter(item => {
  if (item.adminOrTeacher) return isAdmin || isTeacher;
  return true;
});
```

3. Fix active state to use `startsWith`:
```typescript
const isActive = item.path === '/dashboard' 
  ? location.pathname === item.path
  : location.pathname.startsWith(item.path);
```

4. Match the visual style in the screenshot — the active item uses a coral/salmon pill (`bg-primary/20 text-primary` or the sidebar's own accent variable)

That's the only file that needs changing. All routes, pages, and auth guards already exist and work correctly.

## Summary

| File | Change |
|------|--------|
| `src/components/Layout/Sidebar.tsx` | Add `adminOrTeacher` flags to Students + Attendance items; filter by role; fix `startsWith` active detection |

No new pages, no new routes, no DB changes needed — everything already exists.
