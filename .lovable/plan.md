
## User's Two Requests

### 1. Play button works late (800ms hardcoded delay)
**Root cause**: `onLoad` fires when the iframe HTML loads, but there's a hardcoded `setTimeout(..., 800)` before `setPlayerReady(true)`. The player has no YouTube API "ready" signal so we rely on timing.

**Fix**: Reduce the delay from 800ms → 300ms. Also add a listener for YouTube's `onReady` event (`data.event === 'onReady'`) in the existing `handleMessage` useEffect — when that fires, immediately set `playerReady = true` and cancel the fallback timer. This means on fast connections it becomes ready in ~200ms instead of 800ms.

### 2. Player polish & clean view (applied to both players)

**Problems identified in current UI:**
- Loading spinner uses `z-30` but sits below the ghost overlay `z-40` — spinner may not block clicks properly
- No custom thumbnail/poster before first play — just a black screen with spinner
- Controls bar is somewhat cluttered — time display uses `font-mono` but inconsistent sizes
- Play button in center uses a large PNG icon (80×80) which can look heavy
- Bottom controls row gap spacing is inconsistent between mobile/desktop
- Buffered track bar color is very faint (`white/20`) — barely visible
- Speed menu only shows `1, 1.5, 2, 3` — no 0.75x or 1.25x
- Volume slider popup has no animation / feels abrupt
- `BrandingOverlay` in `UnifiedVideoPlayer` (Vimeo/Archive/Direct) has a generic gray background instead of matching the main player's style

**Polish changes planned:**

#### `MahimaGhostPlayer.tsx`
1. **Faster ready** — reduce 800ms → 300ms, add `onReady` event listener to set playerReady immediately
2. **Thumbnail poster** — show YouTube thumbnail `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` as a background image under the spinner until playerReady, giving a proper "pre-play" preview
3. **Spinner layer** — raise spinner to `z-40` (above controls but below ghost overlay at `z-50`) so it properly blocks
4. **Smoother controls fade** — extend controls auto-hide transition from `duration-300` → `duration-200` on show, `duration-500` on hide using separate classes
5. **Progress bar buffered** — change buffered track from `bg-white/20` → `bg-white/35` for better visibility
6. **Center play icon** — keep existing icons but add a subtle `backdrop-blur-sm` background circle behind play button for cleaner look
7. **Speed menu** — add `0.75` and `1.25` options: `[0.75, 1, 1.25, 1.5, 2, 3]`
8. **Bottom bar spacing** — unify `gap-1.5` consistently, remove the double `md:gap-2` inconsistencies
9. **Control bar gradient** — deepen from `from-black/90` → `from-black/95` for better text/icon readability
10. **Volume slider** — add a smooth CSS transition on the popup with `animate-in fade-in slide-in-from-bottom-2` (already available via Tailwind)

#### `UnifiedVideoPlayer.tsx` — `BrandingOverlay`
- Change the branding overlay bottom bar from gray `rgba(128,128,128,0.65)` → `rgba(30,30,30,0.85)` to match main player's dark style

## Files to Change
| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Faster ready (300ms + onReady event), thumbnail poster, spinner z-index, polish items above |
| `src/components/video/UnifiedVideoPlayer.tsx` | Match branding overlay color to main player style |

## What stays the same
- All gesture logic (double-tap, swipe, long-press) — untouched
- Rotation logic — untouched
- Progress logic — untouched
- LectureCard — not touched (separate Mark as Complete feature)
- No new dependencies needed
