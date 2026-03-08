
## What to Change

**Screenshot analysis**: The red arrow points to the rotation icon sitting **between** the skip-forward button and the settings gear. User wants it **beside settings** (after the gear), and wants **only 90° rotation** (toggle: 0° ↔ 90°, not a 4-step cycle).

### File: `src/components/video/MahimaGhostPlayer.tsx`

**Change 1** — Move rotate button to after the settings `</div>` (line 837), so it sits to the right of the settings gear.

**Change 2** — Change `rotateCW()` behavior to toggle: if rotation is 0 → set 90, if rotation is 90 → set 0. (Simple toggle instead of 4-step cycle.)

The `rotateCW` function currently does `(rotation + 90) % 360`. Change it to: `setRotation(rotation === 0 ? 90 : 0)`.

**Result layout** (bottom-right controls):
```
[💬] [⏭ next] [⚙ settings] [⟳ rotate]
```
Rotate is now the last button, beside/after the settings gear.
