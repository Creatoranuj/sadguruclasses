
## Current Implementation Status

After a thorough read of `MahimaGhostPlayer.tsx` (1138 lines) and `src/index.css`, here is exactly what was implemented and what still needs fixing.

### What Works Correctly
The rotation fix is architecturally sound:
- `playerContainerStyle` (lines 526–545) correctly applies to the outer div
- `position: fixed`, swapped `100vh`/`100vw` dimensions, centered with `marginLeft: -50vh` / `marginTop: -50vw`
- `transform: rotate(${rotation}deg)` on the outer container — ALL children rotate together
- CSS `:not([style*="rotate"])` fallback handles non-rotated fake fullscreen
- Swipe gesture code already has rotation-aware axis detection (lines 688–766)

### 3 Remaining Bugs to Fix

**Bug 1 — Stale misleading comments (cosmetic but confusing)**
- Line 614: `{/* ─── VIDEO CONTAINER CLOSED — overlays below are NOT rotated ─── */}` — this is now **wrong**. All overlays ARE inside the outer rotating div and DO rotate correctly.
- Line 625: comment says "always axis-aligned in screen space" — also wrong now.
- Line 672: comment says "NOT inside the rotated video container" — also stale.
These mislead future developers into thinking the fix didn't work.

**Bug 2 — `toggleFullscreen` sets `isFakeFullscreen=true` without setting rotation (line 215–217)**
```typescript
const toggleFullscreen = useCallback(() => {
  setIsFakeFullscreen(prev => !prev); // ← does NOT set rotation=90
}, []);
```
When this fires (e.g., from a future fullscreen button that's not the rotate button), `isFakeFullscreen` becomes `true` but `rotation` stays `0`. The `playerContainerStyle` for `rotation=0` only has `{ transition: 'transform 0.3s ease' }` — **no `position: fixed`**. So the player won't go fullscreen. The CSS rule `:not([style*="rotate"])` should catch this, but the inline style always exists (`{ transition: ... }`) so the attribute `style` is always present on the div — the `:not([style*="rotate"])` selector will match (since there's no "rotate" in `transition: ...`), so CSS applies `position: fixed; inset: 0`. This actually works! But it's fragile.

**Bug 3 — `overflow: hidden` + `rounded-xl` className conflict in landscape**
Line 556: `"mahima-ghost-player relative rounded-xl overflow-hidden bg-black select-none group"` — `rounded-xl` is applied as a Tailwind class. When rotated, inline style sets `borderRadius: 0`. Inline styles override Tailwind, so visually fine. But `overflow: hidden` on the outer container while it's rotated will clip the corners. In practice `overflow: hidden` with a zero border-radius is fine.

**Bug 4 — The real issue: Android body/page scroll during rotation**
When the entire player `div` is `position: fixed` and rotated, the `<body>` behind it is still scrollable. On Android WebView, touch events on the fixed rotated div can "leak" to the document body causing unwanted scroll. Need to add `overflow: hidden` to `document.body` when in landscape rotation, and restore on exit.

**Bug 5 — Speed menu popup direction is wrong in landscape**
The speed menu opens `bottom-full right-0` (above the button, aligned right). In landscape rotation, "above" in the rotated frame is actually towards the right side of the physical screen. This is visually correct — because the whole container rotated, all children's relative layout also rotated. So `bottom-full` in the rotated frame = physically upward on screen. This is actually **correct** — no fix needed.

---

## Plan: 3 Targeted Fixes

### Fix 1 — Prevent body scroll during landscape rotation
In the `rotateCW` / `rotateCCW` / back-button handler — add/remove `document.body.style.overflow = 'hidden'` when entering/exiting rotation. This prevents the Android scroll bleed-through.

```typescript
const rotateCW = useCallback(() => {
  const next = rotation === 0 ? 90 : 0;
  setRotation(next);
  setIsFakeFullscreen(next === 90);
  document.body.style.overflow = next === 90 ? 'hidden' : ''; // NEW
}, [rotation]);
```
Also restore on component unmount via `useEffect` cleanup.

### Fix 2 — Fix `toggleFullscreen` to sync rotation state
```typescript
const toggleFullscreen = useCallback(() => {
  setIsFakeFullscreen(prev => {
    const next = !prev;
    if (!next) setRotation(0); // exit: also reset rotation
    return next;
  });
}, []);
```

### Fix 3 — Fix stale misleading comments
Update lines 614, 625, 672 to reflect the new architecture (entire outer container rotates, all children are correctly rotated).

### Fix 4 — Ensure `overflow: hidden` is also removed from `rounded-xl` in landscape
When in landscape, the outer div className still has `rounded-xl`. Add conditional: remove `rounded-xl` when `isLandscapeRotation` is true, since `borderRadius: 0` is already in inline style.

```tsx
className={cn(
  "mahima-ghost-player relative overflow-hidden bg-black select-none group",
  !isLandscapeRotation && "rounded-xl",  // no rounded corners in landscape
  isFakeFullscreen && "mahima-fake-fullscreen"
)}
```

---

## Files to Change

| File | Lines | Change |
|------|-------|--------|
| `MahimaGhostPlayer.tsx` | 98–108 | Add `document.body.style.overflow` in `rotateCW`/`rotateCCW` |
| `MahimaGhostPlayer.tsx` | 215–217 | Fix `toggleFullscreen` to reset rotation on exit |
| `MahimaGhostPlayer.tsx` | 294–310 | Add body overflow restore in back-button handler |
| `MahimaGhostPlayer.tsx` | ~290 | Add `useEffect` cleanup to restore `body.overflow` on unmount |
| `MahimaGhostPlayer.tsx` | 555–558 | Remove `rounded-xl` conditionally when `isLandscapeRotation` |
| `MahimaGhostPlayer.tsx` | 614, 625, 672 | Fix stale comments |

These are small, precise changes that make the already-correct rotation architecture bulletproof on Android.
