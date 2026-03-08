
## What the User Is Asking

The user has pasted a document about video player navigation/progress bar logic — this is a **description of issues they want fixed** in `MahimaGhostPlayer.tsx`. Combined with the ongoing thread, the actual requests are:

1. **Video player controls & progress bar bugs** - fix issues described in the pasted document
2. **Logo branding cleanup** - `refresh-logo.png` and `mahima-academy-logo.png` still used in many files; replace with `logo_icon_web.png`
3. **LectureListing sub-folder lessons** - already fixed in code, confirm it's working
4. **PDF viewer** - ongoing

## Current State Analysis

### Logo issue (confirmed from code search)
Files still using old logos:
- `MahimaGhostPlayer.tsx` line 11: `import refreshLogo from "@/assets/refresh-logo.png"` — used in 3 watermarks (lines 550, 558, 569)
- `EndScreenOverlay.tsx` line 3: `import mahimaLogo from "@/assets/mahima-academy-logo.png"`
- `WhiteLabelVideoPlayer.tsx` line 6: `import mahimaLogo from "@/assets/mahima-academy-logo.png"`
- `ShareModal.tsx` line 11: `import mahimaLogo from "@/assets/mahima-academy-logo.png"`
- `UnifiedVideoPlayer.tsx` line 4: `import refreshLogo from "@/assets/refresh-logo.png"` — used somewhere in the file
- `App.tsx` line 67: `import refreshLogo from "@/assets/refresh-logo.png"` — used in PageLoader
- `loading-spinner.tsx` line 1: `import refreshLogo from "@/assets/refresh-logo.png"`
- `Install.tsx` line 6: `import refreshLogo from "@/assets/refresh-logo.png"`
- `Sidebar.tsx` line 8: `import logo from "@/assets/mahima-logo.png"`
- `Index.tsx` line 20: `import logo from "@/assets/mahima-logo.png"`
- `Books.tsx` line 25: `import logo from '@/assets/mahima-logo.png'`

The correct logo: `src/assets/branding/logo_icon_web.png` (already used in `DriveEmbedViewer.tsx`)

### Video Player Issues (from user's pasted document + code review)

Looking at `MahimaGhostPlayer.tsx`:

**Issue 1: Controls visibility logic**
- `handleOverlayTap` (line 231): toggles controls correctly — single tap shows/hides ✓
- `handleMouseMove` (line 219): sets controls visible + starts auto-hide timer ✓
- BUT: When clicking control buttons (play, skip, volume), they call `e.stopPropagation()` but DON'T call `showControls()` to reset the auto-hide timer. This means the timer isn't reset when interacting with buttons inside the controls bar.

**Issue 2: Progress bar - controls bar buttons don't reset auto-hide timer**
The bottom controls bar buttons (Play, Volume, Settings, Rotate) all have `e.stopPropagation()` but none call `handleMouseMove()` to reset the timer. So if the user clicks on play, the controls still auto-hide after 3s from when they first appeared.

**Issue 3: `showControls` function naming collision**
The component has a STATE called `showControls` AND a function called... wait, no — the state is `showControls` (boolean) and there's no separate `showControls` function. The `handleMouseMove` acts as the "show and reset timer" function. The issue is that control button clicks don't call `handleMouseMove`.

**Simple fix**: Add `onMouseDown={handleMouseMove}` or `onClick={handleMouseMove}` to the bottom controls bar `<div>` so any interaction with controls resets the auto-hide timer.

**Issue 4: playerReady state - controls show before player is ready**
The `showControls` starts as `true` (line 64). When `playerReady=false`, clicking play/skip does nothing (early returns). This can confuse users. Currently the loading overlay (line 495) covers the player until ready — this is correct.

**The real issue from user context**: The user says "controls don't appear on tap" and "progress bar doesn't seek". Let me look at the actual behavior more carefully.

In `handleOverlayTap` (line 231-246): this is attached to `className="absolute inset-0 z-40"` (the ghost overlay). When the overlay is tapped:
- If `showControls=false` → sets `showControls=true`, starts timer
- If `showControls=true` → sets `showControls=false`, no timer

The PROBLEM: when `showControls=true`, the ghost overlay has `cursor: default`. The control buttons (play, skip, etc.) have `pointer-events-auto` and `e.stopPropagation()`. This means tapping on the control buttons won't trigger `handleOverlayTap` (which is correct). But clicking anywhere else on the video (not on a button) when controls are visible will HIDE them (set to false) — this is the "hide on second tap" behavior. This is correct UX.

**Most critical issue I see**: The progress bar area is inside the ghost overlay div (z-40), but the bottom controls bar is also inside. The `handleOverlayTap` is on the ghost overlay, but the controls bar has `pointer-events-auto` buttons. If the user taps the progress bar:
1. `handleProgressTouchStart` fires (has `e.stopPropagation()`) ✓
2. `handleOverlayTap` does NOT fire ✓

But if the user taps outside any button (on the video itself) while playing, `handleOverlayTap` fires. That's correct.

**The actual missing piece**: When a control button is clicked, the auto-hide timer should RESET. Currently when buttons call `e.stopPropagation()`, the click doesn't bubble to the ghost overlay, so `handleOverlayTap` doesn't fire, and `handleMouseMove` may not be triggered. The timer set when controls first appeared will fire after 3s regardless.

**Fix**: Add `onMouseMove={handleMouseMove}` or better, wrap the controls bar interactions to call `handleMouseMove` on any interaction with controls.

Simplest fix: The bottom controls `<div>` (line 638) already doesn't have mouse handling. Add `onMouseMove={handleMouseMove}` to it, or better, add `onClick={handleMouseMove}` so any click inside controls resets the timer.

## Plan

### Files to modify: 6 files

**1. `MahimaGhostPlayer.tsx`**
- Replace `refreshLogo` import with `sadguruLogo` from `@/assets/branding/logo_icon_web.png`
- Replace all 3 `refreshLogo` usages with `sadguruLogo`
- Add `onMouseMove={handleMouseMove}` to the bottom controls bar `<div>` (line 638) so any interaction resets the auto-hide timer
- Add `onTouchStart={handleMouseMove}` to the controls bar for mobile

**2. `EndScreenOverlay.tsx`**
- Replace `mahimaLogo` import with `sadguruLogo` from `@/assets/branding/logo_icon_web.png`

**3. `WhiteLabelVideoPlayer.tsx`**
- Replace `mahimaLogo` import with `sadguruLogo`

**4. `ShareModal.tsx`**
- Replace `mahimaLogo` import with `sadguruLogo`

**5. `App.tsx`**
- Replace `refreshLogo` import with `sadguruLogo`

**6. `UnifiedVideoPlayer.tsx`**
- Replace `refreshLogo` import with `sadguruLogo`

**7. `loading-spinner.tsx`**
- Replace `refreshLogo` import with `sadguruLogo`

**8. `Install.tsx`**
- Replace `refreshLogo` import with `sadguruLogo`

**9. `Sidebar.tsx`**
- Replace `mahima-logo.png` with `logo_icon_web.png`

**10. `Index.tsx`**
- Replace `mahima-logo.png` with `logo_icon_web.png`

**11. `Books.tsx`**
- Replace `mahima-logo.png` with `logo_icon_web.png`

## Technical approach for video player controls timer fix

The current auto-hide mechanism:
- `handleMouseMove` → sets `showControls=true`, clears timer, starts 3s timer to hide
- `handleOverlayTap` → toggles controls, starts timer if showing

The gap: clicking any control button (play, volume, speed, rotate) calls `e.stopPropagation()` which prevents `handleOverlayTap` from firing. Also, `handleMouseMove` is only on the outer container `onMouseMove` — so on mobile (no mouse), controls can disappear mid-interaction.

**Fix**: On the bottom controls bar `<div>` (line 638), add:
```tsx
onMouseMove={handleMouseMove}
onPointerDown={handleMouseMove}  // catches mobile taps too
```
This ensures any touch/click inside the controls bar resets the auto-hide timer.

## Summary of all changes

| File | Changes |
|------|---------|
| `MahimaGhostPlayer.tsx` | Swap logo import; add `onPointerDown={handleMouseMove}` to controls bar |
| `EndScreenOverlay.tsx` | Swap logo import |
| `WhiteLabelVideoPlayer.tsx` | Swap logo import |
| `ShareModal.tsx` | Swap logo import |
| `App.tsx` | Swap logo import |
| `UnifiedVideoPlayer.tsx` | Swap logo import |
| `loading-spinner.tsx` | Swap logo import |
| `Install.tsx` | Swap logo import |
| `Sidebar.tsx` | Swap logo import |
| `Index.tsx` | Swap logo import |
| `Books.tsx` | Swap logo import |
