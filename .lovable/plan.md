
## Problem
When the video is rotated to 90°, the center controls `[⏪10s] [▶] [⏩10s]` use `gap-10 md:gap-14` which is a fixed gap regardless of screen orientation. In landscape/rotated mode the available width is much larger, so the buttons look cramped together. The user wants them to be properly spread out so they're easy to tap after rotation.

## Solution: Use `justify-between` with padding instead of `gap`

The best approach is to switch from `justify-center gap-X` to `justify-between` with horizontal padding. This way:
- In portrait (normal): buttons spread across the full width with nice padding on edges
- In rotated/landscape: buttons still use the full available width, properly spaced

### File: `src/components/video/MahimaGhostPlayer.tsx` — line 651

**Before:**
```jsx
<div className="absolute inset-0 flex flex-row items-center justify-center gap-10 md:gap-14">
```

**After:**
```jsx
<div className="absolute inset-0 flex flex-row items-center justify-between px-8 md:px-16">
```

This means:
- `justify-between` — skip back on left, play in center (with spacer), skip forward on right → natural spread
- `px-8 md:px-16` — padding keeps buttons off screen edges

Wait — `justify-between` with 3 elements puts them at equal thirds, which won't center the play button perfectly. Better approach: use `justify-around` OR keep 3 items with spacers.

Actually the cleanest solution is `justify-evenly` with `px-4`:
```jsx
<div className="absolute inset-0 flex flex-row items-center justify-evenly px-4">
```
`justify-evenly` distributes equal space around all items, so:
- Portrait: buttons spread nicely across the video width
- Rotated landscape: buttons spread across the full landscape width — easy to tap

This is the cleanest 1-line fix. `justify-evenly` naturally scales to any screen width.

### Summary
| File | Line | Change |
|------|------|--------|
| `MahimaGhostPlayer.tsx` | 651 | `justify-center gap-10 md:gap-14` → `justify-evenly px-4` |
