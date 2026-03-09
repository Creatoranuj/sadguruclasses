
## Goal
Redesign the `/install` page to be a beautiful, highly intuitive, student-friendly installation guide that makes it dead easy for students to install the Sadguru Coaching Classes app — with direct APK download link, step-by-step visual guides per platform, and a one-tap PWA install button.

## What's Wrong With The Current Page
1. **APK link is broken** — `https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest` is a placeholder. Students clicking it go nowhere.
2. **No one-tap install button** — The browser's `beforeinstallprompt` event is never captured. There's no "Install Now" button that triggers the native browser prompt.
3. **Looks basic** — Plain cards with numbered lists. No visual icons showing the steps, no progress indicators, no screenshots/illustrations.
4. **No QR code** — Students on desktop need to share the link to their phone. A QR code makes this effortless.
5. **No "already installed" detection** — If the app is running in standalone mode, it should say "You're already using the app!" instead of showing install steps.
6. **No APK version badge** — No way to know what version they're downloading.
7. **Missing mascot/branding** — The page feels disconnected from the app's identity. The Sadguru mascot (`sadguru-mascot.png`) can be used.

## New Page Design

```text
┌──────────────────────────────────────────────────────┐
│  ← Back    [Logo] Sadguru Coaching Classes           │
├──────────────────────────────────────────────────────┤
│                                                      │
│        [🎓 Sadguru Mascot Image]                     │
│     "Install Sadguru Coaching Classes"               │
│   "Get the full app experience on your device"       │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  ✅ Already Installed! (shown if standalone)   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [Android]  [iPhone/iPad]  [Desktop]                 │
│  (auto-selected based on device)                     │
│                                                      │
│  ── ANDROID ──────────────────────────────────────   │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ 📦 Option A      │  │ 🌐 Option B              │  │
│  │ Download APK     │  │ Install from Browser     │  │
│  │ (Recommended)    │  │ (Chrome)                 │  │
│  │ [⬇ Download APK] │  │                          │  │
│  │ v1.0 · Android 7+│  │ Step 1 ► Step 2 ► Step 3 │  │
│  └──────────────────┘  └──────────────────────────┘  │
│                                                      │
│  ── iOS ──────────────────────────────────────────   │
│  Visual step cards with icons:                       │
│  [Safari icon] → [Share icon] → [+Home icon]        │
│                                                      │
│  ── DESKTOP ──────────────────────────────────────   │
│  [Install Now button if prompt available]            │
│  Or: look for ⊕ in address bar                      │
│                                                      │
│  ─────────────────────────────────────────────────   │
│  📱 Share with Classmates                            │
│  [QR Code] ← scan to open on phone                  │
│  [Copy Link] [WhatsApp Share]                        │
└──────────────────────────────────────────────────────┘
```

## Key New Features

### 1. Live "Install Now" Button (PWA prompt capture)
- On Android Chrome / Desktop Chrome: capture `beforeinstallprompt` event in a `useEffect`.
- Show a prominent "⬇ Install App Now" button that calls `event.prompt()`.
- This is the ONE-TAP install experience.

### 2. APK Download Link Fixed
- Link to: `https://github.com/naveen-bharatprism/sadguru-coaching-classes/releases/latest`  
  (I'll use the generic GitHub releases URL pattern pointing to the real repo based on the workflow file which has `GITHUB_TOKEN` and the app named `SadguruCoachingClasses-*.apk`).
- Actually — I cannot know the exact GitHub repo URL since it's not in the code. I'll make the APK link configurable via an `APK_DOWNLOAD_URL` constant at the top of the file, clearly documented, and default to `#` with a clear "Ask your teacher for the download link" fallback message shown to the student if the URL is not set.

### 3. Already-Installed Detection
- Check `window.matchMedia('(display-mode: standalone)').matches`
- If true: show a green success card "You're already using the Sadguru app! 🎉"

### 4. Visual Step Cards
- Each step has a big numbered circle + icon + short description
- Android PWA: Chrome icon → 3-dot menu → "Add to Home Screen"  
- iOS: Safari icon → Share sheet icon → "Add to Home Screen"
- Desktop: Chrome/Edge address bar → install icon

### 5. QR Code Section
- Use the current page URL to generate a QR code link via Google Charts API: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=<URL>`
- Display it so desktop users can scan with their phone
- WhatsApp share button: `https://wa.me/?text=Download Sadguru Coaching Classes app: <URL>`

### 6. Visual Design Improvements
- Full-bleed gradient header with the mascot image
- Color-coded platform tabs (green = Android, black = iOS, blue = Desktop)
- Step cards with large icons and numbered badges
- Gradient "Download APK" button with download icon and version label

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Install.tsx` | Complete redesign — all features above |

No other files need to change. The APK constant at the top of the file is clearly marked so the admin can update it once the GitHub repo is connected.

## APK URL Handling
Since the GitHub repo URL is not hardcoded anywhere in the codebase (the build-apk.yml uses `GITHUB_TOKEN` but doesn't store the repo URL), I will:
- Add a `const APK_DOWNLOAD_URL = ""` constant at the top
- If empty → show a card saying "APK not yet available — please ask your teacher for the download link or install via browser below"
- When the admin connects GitHub and has the URL, they can update this constant
- Default PWA install (Option B) always works regardless
