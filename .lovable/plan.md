
## Plan: Replace Lucide Rotation Buttons with Custom Rotation Image Icon

### What the user wants
Remove the two separate `RotateCcw` / `RotateCw` Lucide icons (currently placed at the far left and far right of the center controls row) and replace them with a **single custom rotation image** (the uploaded `Rotation_icon.png`) — similar to how `skipBack10Icon` and `skipForward10Icon` use image files instead of Lucide icons.

The single rotation icon will cycle through 0° → 90° → 180° → 270° → 0° on each tap (CW direction), keeping the back-button intercept logic intact.

### Files to change

**1. Copy image asset**
- Copy `user-uploads://Rotation_icon.png` → `src/assets/icons/rotation-icon-custom.png`

**2. `src/components/video/MahimaGhostPlayer.tsx`**

- **Remove** `RotateCcw, RotateCw` from the Lucide import (line 4)
- **Add** import for the new image: `import rotationCustomIcon from "@/assets/icons/rotation-icon-custom.png"`
- **Remove** the separate CCW button (lines 643–655) and CW button (lines 703–715) from the center controls row
- **Add** a single rotation button using the custom image, placed **after** the skip-forward button (i.e., at the far right of the center row), same styling as the skip icons — transparent background, no rounded-full bubble, just the image with drop-shadow
- Keep `rotateCW` / `rotateCCW` functions — just wire the single button to call `rotateCW()` (cycles CW through 0/90/180/270)
- Keep the back-button intercept `useEffect` fully intact

### Result layout (center controls)

```
[⏪10s]   [▶ PLAY]   [⏩10s]   [⟳ rotate]
```

The rotate icon is the uploaded phone-rotation graphic — same visual weight as the skip icons, transparent background, no pill/bubble shape.
