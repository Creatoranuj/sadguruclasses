
## What Needs to Change

From the screenshot, the center overlay currently shows:
`[⏪10s] [▶ PLAY] [⏩10s] [⟳ rotate]`

The user wants the skip-10 buttons AND rotate button to be **away from the play button**, not clustered right next to it. The rotate icon is currently at position 4 in the center row, sitting right next to the forward-10 button.

The intended layout:
- **Center overlay**: Only `[▶ PLAY]` — large play/pause button alone in the center
- **Left side of center**: `[⏪10s]` — skip back, positioned further left
- **Right side of center**: `[⏩10s]` — skip forward, positioned further right  
- **Far right of center or bottom bar**: `[⟳ rotate]` — custom rotation icon, clearly separated

### Implementation

**File: `src/components/video/MahimaGhostPlayer.tsx`** (lines 641–702)

Change the center controls layout from a single `flex-row gap-6` row to a 3-column or spaced absolute layout:

**Option A — Absolute positioning (cleanest)**:
- Skip back: `absolute left-[15%] top-50%`
- Play: `absolute center`
- Skip forward: `absolute right-[15%] top-50%`  
- Rotate: Move to bottom controls bar right group (between the next-video button and settings)

**Option B — Use wider gap with justify-between**:
- Outer div: `flex justify-between items-center w-full px-8`
- Left: skip-back
- Center: play button
- Right: skip-forward
- Rotate: moved to bottom bar right side

**Best approach**: Use `justify-between` with wide padding so the skip buttons are at the edges, play in the middle. Move rotate icon to bottom controls right group (before settings gear).

### Exact Changes

1. **Center row** (lines 641–702): Change from `gap-6 md:gap-10 justify-center` to `justify-between px-8 md:px-16` — skip-back goes left, play center, skip-forward goes right. **Remove rotate button from here.**

2. **Bottom controls right group** (lines 797–831): Add the rotate button icon between the next-video button and the settings gear button.

This way:
- Center: `[         ⏪10s         ▶         ⏩10s         ]` — well spaced
- Bottom right: `[💬] [⏭] [⟳] [⚙]`

All existing logic (back-button intercept, rotateCW function) stays intact.
