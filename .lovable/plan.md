

## Diagnosis of All Issues from Screenshots

### Issue 1: `undefined.supabase.co/manage-session` Error (Critical)
**Screenshot 1** shows: `Failed to load resource: net::ERR_NAME_NOT_RESOLVED → undefined.supabase.c…v1/manage-session:1`

**Root cause:** In `AuthContext.tsx` line 62:
```typescript
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const url = `https://${projectId}.supabase.co/functions/v1/manage-session`;
```
`VITE_SUPABASE_PROJECT_ID` is defined in `.env` (which is gone — file not found) but the GitHub Actions workflow at step 6 only injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, **not** `VITE_SUPABASE_PROJECT_ID`. So in the APK/deployed app, `projectId = undefined` → URL = `https://undefined.supabase.co/...` → DNS failure.

**Fix:** In `callManageSession` in `AuthContext.tsx`, replace the `VITE_SUPABASE_PROJECT_ID` construction with `VITE_SUPABASE_URL` which IS always set. Use:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const url = `${supabaseUrl}/functions/v1/manage-session`;
```
Also add `VITE_SUPABASE_PROJECT_ID` to the GitHub Actions build step as a hardcoded env var.

### Issue 2: Login stuck "Still connecting… checking session…" (Screenshots 3 & 5)
**Root cause:** The `callManageSession` call during login (AuthContext line 274) fires after `signInWithPassword` succeeds. If `projectId = undefined`, the fetch to `https://undefined.supabase.co/...` hangs for a long time before failing. The login function awaits this network call → the login button shows "Still connecting…" for ~30 seconds before the timeout fires.

**Fix:** Same as Issue 1. Once the URL is correct, `callManageSession` returns quickly. Additionally add a 5-second timeout to `callManageSession` using `AbortController` so a slow edge function never blocks login.

### Issue 3: App loading slow / "Taking longer than expected" (Screenshot 2)
**Root cause:** The `PageLoader` shows "Taking longer than expected" after 8 seconds (App.tsx line 84). On the deployed app, the `AuthProvider` is slow because:
1. `validateStoredSession` calls `callManageSession` with an undefined URL (hangs 30+ sec)
2. The `setIsLoading(false)` in `onAuthStateChange` only runs AFTER `validateStoredSession` resolves (line 227-230)

**Fix:** Move `setIsLoading(false)` to BEFORE the session validation calls. The auth state is known as soon as `loadUser` completes — session validation is a background security check and shouldn't block the UI.

### Issue 4: Status bar overlap (Screenshot 4, red circle at top)
**Root cause:** The body has `padding-top: max(env(safe-area-inset-top), 0px)` which is `0` in standard Android WebView (no viewport extension). The Header has `paddingTop: 'max(12px, calc(12px + env(safe-area-inset-top)))'` which also resolves to 12px — but since the Header is `position: sticky; top: 0`, it's positioned below `body.paddingTop` (which is 0). So the status bar still overlaps.

The correct fix for Capacitor Android is `padding-top: max(env(safe-area-inset-top), 28px)` on body. 28px is the typical Android status bar height. On web browsers this resolves to 0 since `env(safe-area-inset-top)` = 0 there (no viewport-fit=cover extension needed).

Actually, for Capacitor apps the `viewport-fit=cover` IS set in index.html and the status bar IS reported. The issue is the safe-area-inset is `0` because Capacitor by default doesn't use `StatusBar` plugin with `overlaysWebView: true`. Without that plugin, the WebView starts BELOW the status bar natively, but the body's sticky Header still needs a top offset.

**Better fix:** In `index.css`, change body `padding-top` to `max(env(safe-area-inset-top), 24px)` with a 24px minimum so it works on both web (0 + max = 24px is too much for web)... 

Actually the real issue: looking at the screenshot again — the logo is being cut off at the TOP by the system status bar. The Header is sticky and the logo (circle) is half-hidden behind "5:53" time indicator. This means the body padding OR the header position is starting behind the status bar.

For Capacitor: The solution is `padding-top: env(safe-area-inset-top, 28px)` at body level with a proper fallback. But the cleaner approach is using the `StatusBar` Capacitor plugin in `main.tsx` to set `StatusBar.setBackgroundColor` or use a CSS `env(safe-area-inset-top)` that correctly accounts for it.

**Simplest reliable fix:** Add `padding-top: 28px` as fallback in the body CSS (only applies when `safe-area-inset-top` = 0, which is the current broken state). Use `max(env(safe-area-inset-top), 28px)` on the body but only in a Capacitor-detection class. Or alternatively use a CSS `@supports` approach.

**Actually simplest:** The body currently has `padding-top: max(env(safe-area-inset-top), 0px)`. Change it to `padding-top: max(env(safe-area-inset-top), 28px)` — this ensures at least 28px gap on Android, and on modern browsers with actual safe areas it uses the real value.

**But wait** — on desktop web this would add 28px unnecessary top padding. Use a CSS custom property:
```css
body {
  padding-top: env(safe-area-inset-top);
}
/* Add android-specific padding via a meta/class */
```

**Best approach:** In `index.html`, add `<meta name="status-bar-height" content="28">` and handle in CSS. OR just change the body to `padding-top: max(env(safe-area-inset-top), 0px)` but give the `<body>` a class `capacitor-android` from `main.tsx` when running in Capacitor, then:
```css
body.capacitor-android { padding-top: 28px; }
```

In `main.tsx`, detect Capacitor: `import { Capacitor } from '@capacitor/core'; if (Capacitor.isNativePlatform()) document.body.classList.add('capacitor-android');`

### Issue 5: Sidebar content overflowing (Screenshot 6, red box on right)
Looking at screenshot 6: The Notes tab content is visible with a red rectangle on the right side — this appears to be the sidebar/panel overflowing the screen. Likely the `LectureView` or lesson page has a panel/sidebar that overflows on mobile.

### Issue 6: GitHub Actions — env vars missing
The build workflow correctly sets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` but NOT `VITE_SUPABASE_PROJECT_ID`. Add it to the build step.

---

## Plan

### Files to Change

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Fix `callManageSession` URL to use `VITE_SUPABASE_URL` instead of `VITE_SUPABASE_PROJECT_ID`; add `AbortController` timeout; move `setIsLoading(false)` before session validation |
| `src/index.css` | Change body `padding-top` to `max(env(safe-area-inset-top), 0px)` but add Capacitor detection class |
| `src/main.tsx` | Add Capacitor platform detection to add `capacitor-native` class to body |
| `src/index.css` | Add `body.capacitor-native { padding-top: 28px; }` rule |
| `.github/workflows/build-apk.yml` | Add `VITE_SUPABASE_PROJECT_ID` to build step env vars |

### Change 1: `AuthContext.tsx` — Fix the `undefined` URL (lines 56-76)

Replace:
```typescript
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const url = `https://${projectId}.supabase.co/functions/v1/manage-session`;
```
With:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const url = `${supabaseUrl}/functions/v1/manage-session`;
```
Also add 5-second `AbortController` timeout to the fetch.

### Change 2: Move `setIsLoading(false)` before session validation (lines 222-255)

Currently:
```typescript
await loadUser(session.user, isSignup);
if (isMounted.current) setIsLoading(false);  // ← AFTER loadUser
await validateStoredSession(...)  // ← blocks if URL is undefined
```

Move `setIsLoading(false)` to after `loadUser` but DON'T await `validateStoredSession` — fire it as background:
```typescript
await loadUser(session.user, isSignup);
if (isMounted.current) setIsLoading(false);  // unblock UI immediately
// Non-blocking background tasks:
validateStoredSession(session.access_token, session.user.id);  // no await
setupRealtimeListener(session.user.id);
startHeartbeat(session.access_token);
```

### Change 3: `src/main.tsx` — Capacitor platform detection

Add:
```typescript
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor-native');
}
```

### Change 4: `src/index.css` — Status bar fix for Capacitor

Change body padding-top line 145 from `max(env(safe-area-inset-top), 0px)` to just `env(safe-area-inset-top)`.

Add after the body rule:
```css
body.capacitor-native {
  padding-top: max(env(safe-area-inset-top), 28px);
}
```

### Change 5: `.github/workflows/build-apk.yml` — Add missing env var

In the `Build web app` step, add:
```yaml
VITE_SUPABASE_PROJECT_ID: wegamscqtvqhxowlskfm
```
(This is a project ID, not a secret — safe to hardcode.)

