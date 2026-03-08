
## Understanding the Full Picture

**Current state:**
- `capacitor.config.ts` already exists with appId `app.lovable.b37af6442649452885c0456243e70148`, appName `Sadguru Coaching Classes`, webDir `dist`, and a live server URL pointing to the Lovable preview
- All Capacitor packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) are already in `package.json`
- `docs/APK-BUILD-GUIDE.md` already has manual build instructions
- `src/pages/Install.tsx` already has a "Download APK from GitHub" button pointing to `https://github.com/sadguru-coaching/sadguru-app/releases/latest`
- `.github/` directory is empty — no workflows exist yet
- `.gitignore` does NOT exclude the `android/` folder, so Capacitor android project will be committed

**What needs to be done:**
1. Create `.github/workflows/build-apk.yml` — a GitHub Actions workflow that triggers on `v*` tags, builds the web app, syncs Capacitor, builds a debug APK, and uploads it to GitHub Releases
2. Update `capacitor.config.ts` — for the APK build, we should NOT use the `server.url` live reload (that's for development). The production APK should bundle the actual built files from `dist/`. So we need to conditionally remove the server block for production builds, OR create a separate config. Best approach: remove the server URL and use the bundled dist — this makes the APK work offline and independently of the Lovable server.
3. Update `src/pages/Install.tsx` — update the GitHub releases URL to the actual user's repo (we don't know it yet, so we'll update it to a placeholder that's clearly visible)
4. Add a `CHANGELOG.md` for release notes (simple starter)
5. Add `.github/workflows/build-apk.yml` with:
   - Trigger: `push` on tags matching `v*`
   - Steps: checkout → Node 18 → npm install → npm run build → Java 17 → npx cap sync android → chmod +x gradlew → ./gradlew assembleDebug → upload APK to Release

**Important technical decision for capacitor.config.ts:**
The current config has a `server.url` pointing to the live Lovable preview. This means the APK loads content from the internet (Lovable's servers) rather than bundling the built app. For a GitHub Release APK that works independently, we should bundle the dist. However, removing `server.url` means Lovable live-editing won't work in the Capacitor shell. 

Solution: Keep two configs — one for development (with server.url) and one for production builds. We can do this by checking an env variable `VITE_CAP_SERVER_URL` or more simply by modifying the workflow to patch the config before building.

Actually, the simplest and cleanest approach: update `capacitor.config.ts` to remove `server.url` (bundled mode). Students will get a self-contained APK. For development, developers can temporarily add back the server URL locally. This is the standard production approach.

BUT WAIT — the user said "I will fill secret and sensitive data later" in the previous message about Stripe. The APK build should work with the bundled URL pointing to the actual published Lovable app, not the preview URL. The current `server.url` is the preview URL. For the GitHub Actions build, we want to either:
- Bundle the dist (remove server block) — app works fully offline for browsing, but needs internet for Supabase
- Keep a server URL pointing to the published app

Best for students: Bundle the dist (remove `server: {}` block from config). The app will load from local files, and only network calls go to Supabase. This is the standard Capacitor production approach.

**Files to create/modify:**

1. **`.github/workflows/build-apk.yml`** (CREATE) — GitHub Actions workflow
2. **`capacitor.config.ts`** (MODIFY) — Remove `server` block so APK bundles `dist/` properly for production
3. **`CHANGELOG.md`** (CREATE) — Basic starter changelog
4. **`src/pages/Install.tsx`** (MODIFY) — Add a note about updating the GitHub URL, and improve the instructions

**GitHub Actions Workflow details:**
```yaml
name: Build Android APK
on:
  push:
    tags: ['v*']
  workflow_dispatch:  # also allow manual trigger

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - Node 18 setup
      - npm ci
      - npm run build  (creates dist/)
      - Java 17 (temurin)
      - npx cap sync android
      - chmod +x android/gradlew
      - cd android && ./gradlew assembleDebug
      - Upload artifact
      - Create GitHub Release with softprops/action-gh-release@v2
        files: android/app/build/outputs/apk/debug/app-debug.apk
```

Key considerations:
- `workflow_dispatch` allows manual trigger without a tag (useful for testing)
- Use `assembleDebug` (not `assembleRelease`) since release requires a keystore signing key — debug APK works fine for student distribution
- The APK path is fixed: `android/app/build/outputs/apk/debug/app-debug.apk`
- Need `contents: write` permission for the release creation
- `GITHUB_TOKEN` is automatically available, no secrets needed for debug APK

**One important issue:** The `android/` folder must exist in the GitHub repo. Since the user runs `npx cap add android` locally after exporting to GitHub, the android folder needs to be committed. The `.gitignore` doesn't exclude it, so that's fine.

BUT — the `android/` folder is generated locally by `npx cap add android`. It won't exist in the GitHub repo until the user runs that command and commits it. The GitHub Actions workflow CANNOT run `npx cap add android` because it modifies files that would need to be committed (it's a project scaffold, not a build step).

Solution: The workflow should check if `android/` exists and fail gracefully with a clear message, OR the workflow instructions should tell the user to commit the android folder first.

Actually best approach: Add a step in the workflow: `npx cap add android || true` to initialize if not present, then sync. But `cap add android` creates files that the workflow can't persist between runs. 

Correct approach for CI: The `android/` folder MUST be committed to the repo. The workflow just runs `npx cap sync android` (not `cap add`). So the instructions to the user are:
1. Export to GitHub
2. Clone locally
3. Run `npm install && npm run build && npx cap add android`  
4. Commit the `android/` folder
5. Push
6. Then the GitHub Actions workflow will work on every `v*` tag

Let me structure the plan clearly for the user.

**Summary of changes:**
| File | Action | Why |
|------|---------|-----|
| `.github/workflows/build-apk.yml` | CREATE | Auto-build APK on git tag push |
| `capacitor.config.ts` | MODIFY | Remove `server.url` so APK bundles `dist/` (production mode) |
| `CHANGELOG.md` | CREATE | Required for release notes in the workflow |

The user will also need to do these manual steps (documented in the plan):
1. Export project to GitHub
2. Clone repo locally
3. `npm install && npm run build && npx cap add android`
4. Commit the `android/` folder to GitHub
5. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
6. GitHub Actions builds APK automatically and creates a Release

This is clean, correct, and fully autonomous for future releases once set up.
