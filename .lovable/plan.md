
## What needs to change

### 1. `src/pages/Dashboard.tsx` — Install App Banner

Add a dismissible banner at the top of the student's main content area (inside the `!isTeacher` block, before `BatchSelector`). The banner:
- Is hidden if `window.matchMedia('(display-mode: standalone)').matches` — already running as installed app
- Is hidden if `localStorage.getItem('install-banner-dismissed') === 'true'`
- Has an orange/saffron gradient matching the brand, text "Install the Sadguru app for a better experience", a "Install Now →" button linking to `/install`, and an X dismiss button
- On dismiss: sets `localStorage.setItem('install-banner-dismissed', 'true')` and hides the banner

Changes in Dashboard.tsx:
- Add `Download` and `X` to the lucide imports
- Add `showInstallBanner` state (initialized from standalone check + localStorage)
- Add `handleDismissBanner` function
- Insert the banner JSX right before `<BatchSelector />` inside the student section

### 2. `src/pages/Install.tsx` — APK URL

The user's message says `[paste your GitHub releases URL here]` — they have NOT provided an actual URL. The placeholder `[paste your GitHub releases URL here]` is the literal text they typed, meaning they want me to add the URL but didn't fill it in yet.

Looking at the `.github/workflows/build-apk.yml` might reveal the repo name. Let me check that file to see if I can infer the actual GitHub repo URL.

Actually, the user literally wrote "[paste your GitHub releases URL here]" — they forgot to fill in their actual URL. I should note this in the plan and keep the `APK_DOWNLOAD_URL = ""` as-is, but update the comment to give a clearer example/hint. I can mention in the plan that the URL wasn't provided and they need to update it.

Wait — let me re-read: "My GitHub repo releases URL is: [paste your GitHub releases URL here]". This is the user's template message they forgot to fill in. I'll check the build workflow to see if the repo URL is mentioned anywhere.

Plan:
1. **Dashboard.tsx**: Add install banner with standalone + localStorage dismiss logic
2. **Install.tsx**: Keep `APK_DOWNLOAD_URL = ""` since user didn't provide the actual URL, but note in plan that they need to update it

## Exact file changes

### `src/pages/Dashboard.tsx`

**Imports** (line 11-14): Add `Download, X` to the lucide imports.

**State** (after line 72 where other states are declared): Add:
```tsx
const [showInstallBanner, setShowInstallBanner] = useState<boolean>(() => {
  if (typeof window !== 'undefined') {
    const dismissed = localStorage.getItem('install-banner-dismissed') === 'true';
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    return !dismissed && !standalone;
  }
  return false;
});
```

**Handler**: Add `handleDismissBanner`:
```tsx
const handleDismissBanner = () => {
  localStorage.setItem('install-banner-dismissed', 'true');
  setShowInstallBanner(false);
};
```

**JSX** (line 216, inside the student `!isTeacher` section, before `<BatchSelector />`):
```tsx
{showInstallBanner && (
  <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl px-4 py-3 shadow-md">
    <div className="flex items-center gap-3 min-w-0">
      <Download className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium truncate">
        Install the Sadguru app for a better experience
      </span>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <Button size="sm" variant="secondary" className="text-xs h-8 bg-white text-orange-600 hover:bg-orange-50" onClick={() => navigate('/install')}>
        Install Now →
      </Button>
      <button onClick={handleDismissBanner} className="p-1 rounded-full hover:bg-white/20 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
)}
```

### `src/pages/Install.tsx`

Since the user didn't provide their actual GitHub URL (they left the template placeholder), I'll leave `APK_DOWNLOAD_URL = ""` unchanged. I will mention this clearly in the plan so they know to update it manually.

Actually — I can still make both changes. The Dashboard banner is the main deliverable. For Install.tsx, since user forgot to provide URL, I'll update the comment to be clearer and keep the empty string.

## Summary of files

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add standalone-aware dismissible install banner before BatchSelector in student view |
| `src/pages/Install.tsx` | Update comment only (user didn't provide actual URL) |

**Note for user**: The APK URL was not filled in — the message still had `[paste your GitHub releases URL here]` as a placeholder. Once you have your GitHub releases URL (format: `https://github.com/YOUR_USER/YOUR_REPO/releases/latest/download/SadguruCoachingClasses.apk`), update the `APK_DOWNLOAD_URL` constant at line 28 of `src/pages/Install.tsx`.
