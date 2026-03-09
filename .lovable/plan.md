
## What I found

Reading the full `Install.tsx` and `build-apk.yml`:

**Current state of the install page:**
- APK_DOWNLOAD_URL is set to `https://github.com/naveen-bharatprism/sadguru-coaching-classes/releases/latest/download/SadguruCoachingClasses.apk` — this is a static filename but the build workflow actually names the file `SadguruCoachingClasses-v1.0-YYYYMMDD-HHMM.apk` (versioned). So the APK direct download URL is wrong — it won't find the file.
- The QR code on the page uses `appUrl` (the web app origin) — it generates a QR for the PWA install page, NOT for the APK download. The user wants a separate QR that directly downloads the APK.
- The current QR section title says "Share with Classmates" and only has one QR (for the web app).

**Build workflow APK naming:**
```
SadguruCoachingClasses-${{ env.VERSION }}.apk
```
Where VERSION is either the git tag (`v1.0.0`) or for manual runs `v1.0-YYYYMMDD-HHMM`.

The GitHub Releases "latest" download URL format is:
`https://github.com/USER/REPO/releases/latest/download/FILENAME.apk`

But since the filename is versioned, the `latest` redirect won't work for a static filename. The correct approach for "always download latest APK" from GitHub Releases is to use a redirect service OR rename the APK to a consistent name.

**Fix for APK URL**: Update the workflow to ALSO copy the APK with a fixed name `SadguruCoachingClasses.apk` so the static URL works. The workflow already renames it to versioned but doesn't produce a fixed-name copy. I need to add a step that copies to `SadguruCoachingClasses.apk` AND uploads BOTH files to the release.

**What needs to change:**

### 1. Fix the build-apk.yml to produce a fixed-name APK
Add a step after "Rename APK" to also create `SadguruCoachingClasses.apk` (fixed name) alongside the versioned one. Then attach BOTH to the release. This makes the static `/releases/latest/download/SadguruCoachingClasses.apk` URL always work.

### 2. Add a dedicated APK QR code section to Install.tsx
Currently there's only one QR code pointing to the web app. The user wants a QR code that directly downloads the APK so students can just scan it with any QR scanner and the APK downloads instantly.

Changes:
- Add a new dedicated section: **"📦 Scan to Download APK"** with a QR code pointing to `APK_DOWNLOAD_URL` directly.
- Keep the existing web app QR/share section below it.
- Make this APK QR section visible and prominent on the Android tab (and also available on all tabs since someone on desktop might want to share to phone).

### 3. Fix the WhatsApp share message
Currently it shares `${appUrl}/install` — better to include both the APK link AND the install page link.

### Files changed:
| File | Change |
|------|--------|
| `.github/workflows/build-apk.yml` | Add step to produce fixed-name `SadguruCoachingClasses.apk` + attach it to release |
| `src/pages/Install.tsx` | Add dedicated APK QR code section; fix QR code rendering at 200×200 not 180×180 for better scannability; update WhatsApp message |

### The APK QR section design:
```
┌────────────────────────────────────────────────┐
│  📦  Scan QR to Download APK                   │
│  ─────────────────────────────────────────────  │
│  ┌──────────┐   Scan this QR code with your    │
│  │ QR CODE  │   phone camera to directly        │
│  │ (200×200)│   download the Sadguru APK.        │
│  └──────────┘                                   │
│  ↓ Also shows: Direct APK link with copy btn   │
│  [Copy APK Link]  [Share APK on WhatsApp]       │
└────────────────────────────────────────────────┘
```

The QR for APK uses: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(APK_DOWNLOAD_URL)}`

This is placed:
- On Android tab: between Option A and Option B sections (so it's immediately visible)
- Also in the share section at the bottom (always visible regardless of tab)

Actually better: Add it as a NEW prominent card right after the platform tabs section (always visible, not tab-specific), labeled "📦 Direct APK Download QR" — students can always scan it regardless of which tab they're on. Then keep the existing share section for the web PWA.

The APK QR section should only render if `APK_DOWNLOAD_URL` is set (which it is).

### Standalone mode verification note:
The `isStandalone()` function checks both `window.matchMedia('(display-mode: standalone)')` and `(window.navigator as any).standalone === true` (iOS). This is correct and will show the "Already Installed" card when accessed from the installed PWA. This is working code — no changes needed.

### Summary of all changes:

**`.github/workflows/build-apk.yml`** — Add step 13b:
```yaml
- name: 🏷️ Create fixed-name APK copy (for static download URL)
  run: |
    cp "${{ env.APK_FILE }}" "SadguruCoachingClasses.apk"
    echo "APK_FIXED=SadguruCoachingClasses.apk" >> $GITHUB_ENV
```
And update the `files:` in the release step to include both:
```yaml
files: |
  ${{ env.APK_FILE }}
  ${{ env.APK_FIXED }}
```

**`src/pages/Install.tsx`** — Add APK QR code section:
- Add a new card between the platform tabs and the platform-specific content
- QR points to `APK_DOWNLOAD_URL`
- "Copy APK Link" and "Share APK on WhatsApp" buttons
- QR size 200×200 for better phone camera scanning
- Only shown if `APK_DOWNLOAD_URL` is truthy

This gives students a dead-simple experience: they see a QR code, scan it with their phone camera, and the APK downloads directly — no GitHub, no redirects.
