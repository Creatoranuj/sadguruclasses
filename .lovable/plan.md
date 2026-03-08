
## Goal
Add MX Player-style swipe gestures to the video player:
- **Left half swipe up/down** → Brightness control (CSS filter on container)
- **Right half swipe down/up** → Volume control (calls `setPlayerVolume`)

## Implementation Plan

### New State Variables (add near line 73)
```ts
const [brightness, setBrightness] = useState(100); // 0–150 range
const [swipeIndicator, setSwipeIndicator] = useState<{
  type: 'brightness' | 'volume';
  value: number;
  visible: boolean;
} | null>(null);
const swipeTouchRef = useRef<{ startY: number; startX: number; startVal: number; side: 'left' | 'right' } | null>(null);
const swipeIndicatorTimer = useRef<ReturnType<typeof setTimeout>>();
```

### Brightness Effect
Apply the brightness CSS filter on the video container div (line 568):
```tsx
style={{ ...rotationStyle, filter: `brightness(${brightness}%)` }}
```

### Swipe Gesture Handlers on the Ghost Overlay (lines 640–697)
Add `onTouchStart`, `onTouchMove`, `onTouchEnd` to the ghost overlay div. Key logic:

**onTouchStart:**
- Record `startY`, `startX`, determine `side` = left/right half of container width
- Record `startVal` = current brightness or volume

**onTouchMove:**
- If `|deltaY| < 10` and `|deltaX| > |deltaY|` → horizontal swipe, ignore (likely seeking intent)
- If `|deltaY| >= 10`: lock to vertical swipe mode
  - Left side: adjust brightness by `deltaY * -0.5` (swipe up = brighter)
  - Right side: adjust volume by `deltaY * -0.5` (swipe up = louder)
  - Show swipe indicator overlay

**onTouchEnd:**
- Commit the value
- Hide indicator after 1.5s timeout

### Visual Indicator Overlay (inside ghost overlay)
Small centered pill that appears during swipe:
```tsx
{swipeIndicator?.visible && (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/70 backdrop-blur-sm rounded-2xl px-5 py-3 flex flex-col items-center gap-1 pointer-events-none">
    {swipeIndicator.type === 'brightness' ? <Sun className="h-6 w-6 text-yellow-400" /> : <Volume2 className="h-6 w-6 text-blue-400" />}
    <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, swipeIndicator.type === 'brightness' ? (swipeIndicator.value / 150) * 100 : swipeIndicator.value))}%` }} />
    </div>
    <span className="text-white text-xs font-semibold">{Math.round(swipeIndicator.value)}%</span>
  </div>
)}
```

### Import Addition
Add `Sun` to the lucide-react import at line 2.

### Files Changed
| File | Lines | Change |
|------|-------|--------|
| `MahimaGhostPlayer.tsx` | 2–5 | Add `Sun` to lucide imports |
| `MahimaGhostPlayer.tsx` | ~73 | Add `brightness`, `swipeIndicator` state + `swipeTouchRef`, `swipeIndicatorTimer` refs |
| `MahimaGhostPlayer.tsx` | 568 | Apply `filter: brightness(${brightness}%)` to video container |
| `MahimaGhostPlayer.tsx` | 640–647 | Add swipe touch handlers to ghost overlay div |
| `MahimaGhostPlayer.tsx` | ~648 | Add swipe indicator JSX inside ghost overlay |

### Behavior Summary
```text
Swipe UP on LEFT half   → Brightness ↑ (max 150%)
Swipe DOWN on LEFT half → Brightness ↓ (min 20%)
Swipe UP on RIGHT half  → Volume ↑ (max 100%)
Swipe DOWN on RIGHT half→ Volume ↓ (min 0%)
```
- Short horizontal swipes are ignored (won't conflict with seek)
- Indicator pill shows icon + bar + percentage in center of screen
- Fades out 1.5s after swipe ends
- Works in both portrait and rotated (landscape) mode
