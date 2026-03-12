# Deployment Guide — Sadguru Coaching Classes

## Prerequisites
- Node.js 18+ and npm installed
- Supabase project (auto-connected via Lovable)

## Local Development
```bash
npm install --legacy-peer-deps
npm run dev
```

## Build for Production
```bash
npm run build
```
Creates an optimized `dist/` folder.

---

## Deployment Options

### 1. Lovable Cloud (Recommended)
Click **Publish** in the Lovable editor. Instantly live with HTTPS.

### 2. Vercel
```bash
npm i -g vercel && vercel --prod
```
The `vercel.json` handles SPA routing.

### 3. Netlify
1. Connect GitHub repo on [netlify.com](https://netlify.com)
2. Build command: `npm run build` | Publish directory: `dist`
3. Add `_redirects` in `public/`: `/* /index.html 200`

---

## 📱 Android APK (Capacitor)

### One-Time Setup (Local Machine)
```bash
git clone <your-repo-url>
cd sadguru-coaching-classes
npm install --legacy-peer-deps
npm run build
npx cap add android          # creates android/ folder
npx cap sync android         # copies dist/ into android project
git add android/ && git commit -m "Add Capacitor android project"
git push
```

### Building APK Locally
```bash
npm run build                # rebuild web assets
npx cap sync android         # sync to android
cd android && ./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### When to Run `npx cap sync android`
- After `git pull` (new code from Lovable/GitHub)
- After `npm run build`
- After adding/updating Capacitor plugins

### Automated APK via GitHub Actions

The repo includes `.github/workflows/build-apk.yml`:

**Trigger Option A — Tag push:**
```bash
git tag v1.2.0 && git push origin v1.2.0
```

**Trigger Option B — Manual:**
GitHub → Actions → "Build Android APK & Release" → Run workflow

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret                   | Value                                       |
| ------------------------ | ------------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://wegamscqtvqhxowlskfm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/publishable key          |

**Download:** GitHub → Releases → Latest → `SadguruCoachingClasses-vX.X.X.apk`

### Installing APK on Android
1. Transfer `.apk` to phone (WhatsApp, Drive, direct download)
2. Tap file → Allow "Install from unknown sources" if prompted
3. Tap **Install** → **Open**
4. Requires Android 7.0+ (API 24)

### Signing a Release APK
```bash
cd android
keytool -genkey -v -keystore sadguru-release.keystore \
  -alias sadguru -keyalg RSA -keysize 2048 -validity 10000

./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=../sadguru-release.keystore \
  -Pandroid.injected.signing.store.password=YOUR_PASSWORD \
  -Pandroid.injected.signing.key.alias=sadguru \
  -Pandroid.injected.signing.key.password=YOUR_PASSWORD
```

> ⚠️ **Keep your keystore safe!** If lost, you cannot update on Play Store.

---

## PWA Installation
- **Android**: Browser → "Install app" or "Add to Home Screen"
- **iOS**: Safari → Share → "Add to Home Screen"
- **Desktop**: Click install icon in browser address bar
- Visit `/install` for guided walkthrough

## Environment Variables
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (publishable) |
| `VITE_SUPABASE_PROJECT_ID` | `wegamscqtvqhxowlskfm` |

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `android/` missing | Run `npx cap add android` locally, commit & push |
| Blank white screen in APK | Run `npm run build` before `npx cap sync` |
| Back button exits app | Fixed — `capacitorBackButton.ts` handles hardware back |
| Status bar overlap | Fixed — CSS `env(safe-area-inset-top)` padding |
| Login slow | Fixed — session creation is non-blocking |
| Old code in APK | Run `npm run build && npx cap sync android` |

## Post-Deployment Checklist
- [ ] Verify login → dashboard redirect works
- [ ] Test hardware back button navigation
- [ ] Check status bar doesn't overlap content
- [ ] Verify APK installation on Android device
- [ ] Test PWA installs on mobile
- [ ] Confirm protected routes redirect to login when logged out

---

*Last updated: March 2026*
