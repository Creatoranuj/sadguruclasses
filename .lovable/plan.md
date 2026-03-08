
## Problem Analysis

When video is rotated 90° clockwise, two things break:

### Bug 1 — Side Detection is INVERTED (lines 669–671)
Current code:
```js
if (rotation === 90) {
  side = touch.clientY - rect.top > rect.height / 2 ? 'left' : 'right';
}
```

This is backwards. When rotated 90° CW:
- Visual LEFT = DOM TOP = **low clientY** → should be `'left'`
- Visual RIGHT = DOM BOTTOM = **high clientY** → should be `'right'`

The condition `> rect.height / 2` assigns `'left'` to high clientY (visual right). It needs to be flipped:
```js
side = touch.clientY - rect.top < rect.height / 2 ? 'left' : 'right';
```

This single `<` vs `>` fix corrects both double-tap (forward/backward swap) AND swipe zone (brightness/volume swap).

### Bug 2 — Swipe direction uses wrong axis when rotated (lines 709–710)
Current code always uses `deltaY = touch.clientY - ref.startY`.

When rotated 90°, physically swiping "up" (to increase volume/brightness) moves your finger along the **X-axis** in DOM space, not the Y-axis. So `deltaY` will be near zero and the swipe won't register properly.

Fix: compute effective delta based on rotation:
- `rotation === 0` or `180`: use `deltaY` (normal)
- `rotation === 90`: physical "up" = DOM right → use `-deltaX` 
- `rotation === 270`: physical "up" = DOM left → use `deltaX`

## Files to Change
Only `src/components/video/MahimaGhostPlayer.tsx`

### Change 1 — Fix side detection (line 671)
Change `>` to `<` for rotation 90°:
```js
// rotation === 90: visual left = top of DOM = low clientY
side = touch.clientY - rect.top < rect.height / 2 ? 'left' : 'right';
```

### Change 2 — Fix swipe delta axis (lines 709–710 area)
Pass `rotation` into the swipe calculation:
```js
// In onTouchMove:
const deltaY = touch.clientY - ref.startY;
const deltaX = touch.clientX - ref.startX;

// Rotation-aware effective delta (physical "up" gesture)
let effectiveDelta: number;
if (rotation === 90) {
  effectiveDelta = -deltaX;  // physical up = swipe right in DOM
} else if (rotation === 270) {
  effectiveDelta = deltaX;   // physical up = swipe left in DOM
} else {
  effectiveDelta = -deltaY;  // normal: swipe up = negative deltaY
}
```

Then replace `ref.startVal - deltaY * sensitivity` with `ref.startVal + effectiveDelta * sensitivity`.

Also fix the horizontal-swipe guard — when rotated, check `|deltaY| > |deltaX|` (axes swap):
```js
if (rotation === 90 || rotation === 270) {
  if (!ref.locked && Math.abs(deltaY) > Math.abs(deltaX)) return; // horizontal in physical space = Y in DOM
} else {
  if (!ref.locked && Math.abs(deltaX) > Math.abs(deltaY)) return;
}
```

## Summary of Changes
| Line | Fix |
|------|-----|
| 671 | `>` → `<` to correct side detection for 90° rotation |
| 709–720 | Add rotation-aware `effectiveDelta` for swipe axis, fix axis guard |
