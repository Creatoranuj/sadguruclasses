
## Root Cause Analysis

Looking at the screenshot and code carefully:

**The Problem**: When user taps the rotate button, `rotation = 90` is set. The **video iframe container** (`div.mahima-video-container`) gets `transform: rotate(90deg)` via `rotationStyle`. BUT all the overlaid controls (top bar, ghost overlay with play/skip/pause buttons, bottom controls bar, watermarks, end screen) are **siblings/children of the outer container** that are rendered with `position: absolute` OUTSIDE the rotated div — they stay in portrait screen coordinates.

**Screenshot confirms**: The video is rotated 90°, but play/pause, skip arrows, progress bar, settings gear, speed indicator — all are still portrait-oriented, making them physically perpendicular to what the user is looking at. The app becomes unusable.

### Current Architecture (broken):
```text
.mahima-ghost-player (fixed fullscreen, NOT rotated)
├── .mahima-video-container  ← ONLY THIS gets rotated 90°
│   └── <iframe>
├── brightness overlay       ← NOT rotated (portrait coords)
├── TOP bar (title, exit)    ← NOT rotated (portrait coords)  
├── GHOST overlay (skip/play)← NOT rotated (portrait coords)
├── BOTTOM controls bar      ← NOT rotated (portrait coords)
├── Watermarks               ← NOT rotated (portrait coords)
└── Discussion sheet         ← NOT rotated (portrait coords)
```

### The Fix

Instead of rotating only the video iframe container inside a portrait wrapper, **rotate the ENTIRE player container** when in landscape mode. This means all controls rotate together with the video.

The approach:
- When `rotation === 90`: Apply `transform: rotate(90deg)` on the **outermost `.mahima-ghost-player` div** — the whole player rotates as one unit
- Set `width: 100vh; height: 100vw` on the outer container + reposition it centered via negative margins so it fills the landscape screen
- Remove `rotationStyle` from the inner video container (it goes back to normal aspect-video)
- The `mahima-fake-fullscreen` CSS stays but the rotation moves up one level

### New Architecture (fixed):
```text
.mahima-ghost-player  ← THIS gets rotated 90° (entire player)
  width: 100vh, height: 100vw, transform: rotate(90deg)
  centered via: top:50%, left:50%, margin: -50vw -50vh
├── .mahima-video-container  ← normal, NO rotation
│   └── <iframe>
├── TOP bar (title, exit)    ← rotates WITH player ✓
├── GHOST overlay (skip/play)← rotates WITH player ✓
├── BOTTOM controls bar      ← rotates WITH player ✓
├── Watermarks               ← rotate WITH player ✓
└── Discussion sheet         ← rotates WITH player ✓
```

## Files to Change

### 1. `src/components/video/MahimaGhostPlayer.tsx`

**Change 1** — Rotation styles: Move the `transform: rotate(90deg)` from `rotationStyle` (applied on the inner video div) to the outer container div's inline style.

Current `rotationStyle` (lines 528–541) rotates the inner div. We need to:
- Remove `rotationStyle` from the inner div (line 565)
- Apply rotation + dimension swap directly on the outer `containerRef` div (line 549) via inline `style` prop

**New outer container style** when `rotation === 90`:
```css
position: fixed;
top: 50%;
left: 50%;
width: 100vh;
height: 100vw;
margin-left: -50vh;
margin-top: -50vw;
transform: rotate(90deg);
transform-origin: center center;
transition: transform 0.3s ease;
z-index: 9999;
```

When `rotation === 0`:
```css
/* normal, no transform */
```

**Change 2** — Inner video div (line 563–565): Remove `rotationStyle` from `style` prop. Keep `isFakeFullscreen` class. The inner div should always be `w-full h-full` inside the now-correctly-sized outer container.

**Change 3** — The `rotateCW` function currently sets `isFakeFullscreen` based on rotation. Keep this logic. When rotation is 90, `isFakeFullscreen = true`. The CSS class `.mahima-fake-fullscreen` should now NOT apply fixed positioning (the inline style handles it), OR we update the CSS too.

**Change 4** — Update `mahima-fake-fullscreen` CSS to NOT conflict with the new rotation approach:
- The `position: fixed; inset: 0` CSS is now applied via inline style for rotation
- Keep `.mahima-fake-fullscreen` CSS as fallback for non-rotated fullscreen if needed

### 2. `src/index.css`

**Update `.mahima-ghost-player.mahima-fake-fullscreen`** CSS:
- When rotation = 90, the inline style handles positioning & transform
- The CSS class now only needs to set: `background: #000; border-radius: 0; overflow: hidden; z-index: 9999`
- Remove `position: fixed; inset: 0; width: 100vw; height: 100vh` from CSS since inline style will handle these differently for rotated vs non-rotated states

## Exact Line Changes

### `MahimaGhostPlayer.tsx`

**Lines 526–541** (rotationStyle computation) — REPLACE with new logic that builds the outer container style:

```typescript
// Rotation styles — applied to the ENTIRE player container so all controls rotate together
const isLandscapeRotation = rotation === 90 || rotation === 270;
const playerContainerStyle: React.CSSProperties = isLandscapeRotation ? {
  position: 'fixed',
  top: '50%',
  left: '50%',
  width: '100vh',
  height: '100vw',
  marginLeft: '-50vh',
  marginTop: '-50vw',
  transform: `rotate(${rotation}deg)`,
  transformOrigin: 'center center',
  transition: 'transform 0.3s ease',
  zIndex: 9999,
  borderRadius: 0,
  background: '#000',
  overflow: 'hidden',
} : {
  transition: 'transform 0.3s ease',
};
```

**Lines 549–560** (outer container div) — ADD `style={playerContainerStyle}` to the outer div.

**Lines 563–566** (inner video div) — REMOVE `...rotationStyle` from its style. Just use `isFakeFullscreen` class, no inline rotation.

### `src/index.css`

**Lines 542–564** — Update the fake-fullscreen CSS to be simpler (since inline style handles the heavy lifting for the rotated case):

```css
.mahima-ghost-player.mahima-fake-fullscreen {
  border-radius: 0 !important;
  background: #000 !important;
  overflow: hidden !important;
}
/* Only apply fixed positioning when NOT rotated (rotation=0 but isFakeFullscreen=true) */
.mahima-ghost-player.mahima-fake-fullscreen:not([style*="rotate"]) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  width: 100vw !important;
  height: 100vh !important;
}
```

Wait — actually simpler: since we always set inline style when `isFakeFullscreen` (which matches rotation===90), just remove the conflicting `position/width/height` from CSS and let inline style govern it. The CSS class only ensures background and no border-radius.

## Summary of Precise Changes

| File | Lines | Change |
|------|-------|--------|
| `MahimaGhostPlayer.tsx` | 526–541 | Replace `rotationStyle` with `playerContainerStyle` that targets outer div |
| `MahimaGhostPlayer.tsx` | ~549–560 | Add `style={playerContainerStyle}` to outer container div |
| `MahimaGhostPlayer.tsx` | ~563–566 | Remove `...rotationStyle` from inner video div style |
| `src/index.css` | 542–574 | Simplify `.mahima-fake-fullscreen` CSS — remove conflicting position/size rules |

This is a **surgical 4-change fix** that makes the entire player rotate as one unit, ensuring all controls (play, skip, progress bar, settings, watermark, title bar) rotate correctly with the video — exactly as seen in professional video players like MX Player.
