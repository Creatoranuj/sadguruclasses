

## Plan: Final Website Polish — Rebranding Cleanup, Dead Code Removal & UI Consistency

### Summary
Complete final polish across the entire website: (1) Replace all remaining "Mahima"/"Naveen Bharat" references with "Sadguru" branding, (2) Clean up dead/unused code, (3) Fix CSS class naming consistency, (4) Fix chatbot edge function system prompt branding.

---

### 1. CSS Branding Cleanup — `src/index.css`

Rename all `mahima-*` CSS class names and comments to `sadguru-*`:

| Current | New |
|---|---|
| `/* Naveen Bharat - Main Stylesheet */` | `/* Sadguru Classes - Main Stylesheet */` |
| `/* Naveen Bharat Brand: Blue + White */` | `/* Sadguru Brand: Blue + White */` |
| `@keyframes mahima-pulse` | `@keyframes sadguru-pulse` |
| `@keyframes mahima-ring` | `@keyframes sadguru-ring` |
| `.mahima-loader-logo` | `.sadguru-loader-logo` |
| `.mahima-loader-ring` | `.sadguru-loader-ring` |
| `.mahima-player` | `.sadguru-player` |
| `.mahima-ghost-player` (all ~40 selectors) | `.sadguru-ghost-player` |
| `.mahima-fake-fullscreen` | `.sadguru-fake-fullscreen` |
| `.mahima-video-container` | `.sadguru-video-container` |
| Remove duplicate `.sadhguru-loader-*` alias classes (lines 207-212) | Consolidated into single `.sadguru-*` names |

### 2. Component Class References Update

Update all TSX files that reference old CSS class names:

| File | Change |
|---|---|
| `src/components/video/MahimaGhostPlayer.tsx` | `mahima-ghost-player` → `sadguru-ghost-player`, `mahima-fake-fullscreen` → `sadguru-fake-fullscreen`, `mahima-video-container` → `sadguru-video-container` |
| `src/components/ui/loading-spinner.tsx` | `mahima-loader-logo` → `sadguru-loader-logo`, `mahima-loader-ring` → `sadguru-loader-ring` |
| `src/components/ui/page-skeleton.tsx` | `mahima-loader-logo` → `sadguru-loader-logo`, `mahima-loader-ring` → `sadguru-loader-ring` |
| `src/pages/Dashboard.tsx` | `.sadhguru-loader-logo` → `.sadguru-loader-logo`, `.sadhguru-loader-ring` → `.sadguru-loader-ring` |

### 3. Chatbot Edge Function — Rebrand System Prompt

`supabase/functions/chatbot/index.ts`: Replace all "Mahima Academy" → "Sadguru Classes", "Sarathi" → "SadGuru Sarthi" in the system prompt, RAG context labels, and identity rules.

### 4. File Renaming (Optional but Clean)

The component file `MahimaGhostPlayer.tsx` and its interface `MahimaGhostPlayerProps` keep the old name internally. Rename:
- Interface: `MahimaGhostPlayerProps` → `GhostPlayerProps`
- Display name: keep `MahimaGhostPlayer` as the export name to avoid breaking all imports (or update all 3 import sites)
- Update `src/components/video/index.ts` export name if changed

### 5. Dead Comments Cleanup

| File | Issue |
|---|---|
| `src/index.css` line 1 | `/* Naveen Bharat - Main Stylesheet */` → `/* Sadguru Classes */` |
| `src/index.css` line 12 | `/* Naveen Bharat Brand */` → `/* Sadguru Brand */` |

---

### Files to Modify

| File | Changes |
|---|---|
| `src/index.css` | Rename all `mahima-*` keyframes/classes to `sadguru-*`; fix comments; remove alias duplicates |
| `src/components/video/MahimaGhostPlayer.tsx` | Update CSS class references |
| `src/components/ui/loading-spinner.tsx` | Update CSS class references |
| `src/components/ui/page-skeleton.tsx` | Update CSS class references |
| `src/pages/Dashboard.tsx` | Update loader class references |
| `supabase/functions/chatbot/index.ts` | Rebrand system prompt to Sadguru Classes / SadGuru Sarthi |

### Technical Notes

- No database migrations needed
- No new dependencies
- All changes are find-and-replace safe — no logic changes
- The chatbot edge function will auto-deploy after changes

