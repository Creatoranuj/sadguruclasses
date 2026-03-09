
## Analysis of All 3 Issues from Screenshots

### Issue 1: Video Completely Black When Rotated (Critical)
**Root cause**: In `MahimaGhostPlayer.tsx` line 569:
```jsx
<div className={isFakeFullscreen ? 'mahima-video-container' : 'aspect-video'} style={...rotationStyle...}>
```
When `isFakeFullscreen` is true, the class `mahima-video-container` is applied — but this class has **NO CSS defined** anywhere in the codebase. So the video container collapses to 0px height → black screen.

The `.mahima-fake-fullscreen` CSS class IS correctly defined in `src/index.css` (fixes the outer container to `position:fixed; inset:0; width:100vw; height:100vh`) — but the **inner video div** still needs to fill that space properly.

### Issue 2: No Exit Button in Fullscreen Mode
When the player goes into fake fullscreen (rotation), there is no "← Back" or "✕ Exit" button visible. In APK on Android, the back button is the only way out, and it may not be intuitive for students. A clear exit button in the top-left corner is needed.

### Issue 3: Rotation Behaviour
`rotateCW()` only toggles between 0° and 90°. The visual rotation + fake fullscreen combo needs to work together so:
- When `rotation=90°` + `isFakeFullscreen=true`: video fills the entire screen AND is rotated 90° clockwise (landscape orientation)
- The `rotationStyle` uses `width: 100vh` and `height: 100vw` with absolute positioning — but this depends on the container already being fixed to the viewport via `.mahima-fake-fullscreen`

## Fix Plan: 2 Files

### File 1: `src/index.css`
Add a `.mahima-video-container` CSS class that makes the inner video div fill 100% of the fake-fullscreen container:

```css
/* Video wrapper inside fake fullscreen — must fill the fixed container */
.mahima-ghost-player.mahima-fake-fullscreen .mahima-video-container {
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
}
```

Also ensure `iframe` inside fills container when in fullscreen:
```css
.mahima-ghost-player.mahima-fake-fullscreen iframe {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
```

### File 2: `src/components/video/MahimaGhostPlayer.tsx`

**Fix A — Inner video container** (line 569): Change:
```jsx
<div className={isFakeFullscreen ? 'mahima-video-container' : 'aspect-video'} style={...}>
```
To use proper combined classes so the inner div always has a defined height:
```jsx
<div 
  className={isFakeFullscreen ? 'mahima-video-container w-full h-full' : 'aspect-video relative'} 
  style={...rotationStyle, filter: ...}>
```

**Fix B — Add Exit button** in the TOP OVERLAY section (line ~614) when `isFakeFullscreen` is true, add an `ArrowLeft` / X button at top-left that calls:
```tsx
() => { setRotation(0); setIsFakeFullscreen(false); }
```
Button styles: `absolute top-3 left-3 z-[60] bg-black/60 rounded-full p-2 text-white`

**Fix C — Ensure rotation + fullscreen work together**: The current `rotateCW` correctly sets both `rotation=90` and `isFakeFullscreen=true`. The issue is purely that the inner container has no height. Fixing the CSS resolves this.

**Fix D — Android back button**: The `popstate` handler already handles `setRotation(0); setIsFakeFullscreen(false)` — this is correct.

## Summary of Changes

| File | Change |
|------|--------|
| `src/index.css` | Add `.mahima-video-container` height fix + iframe fill rules |
| `src/components/video/MahimaGhostPlayer.tsx` | Fix inner container class, add exit button in top overlay |

## Expected Result After Fix
- Rotation button → video fills entire screen rotated 90° (landscape) ✅
- Exit button (top-left ← arrow) visible in fullscreen mode → tap to exit ✅  
- Android back button → exits fullscreen before navigating ✅
- Normal (non-rotated) mode → unchanged, works as before ✅
