
## Problem Analysis

APK (Capacitor Android WebView) mein `document.requestFullscreen()` API ya to kaam nahi karta ya silently fail ho jaata hai. Browser mein fullscreen CSS (`:fullscreen`) trigger hota hai, APK mein nahi.

3 issues hain:
1. `rotateCW()` — `requestFullscreen()` call karta hai → silent fail in WebView
2. `toggleFullscreen()` — same issue
3. `:fullscreen` CSS selectors — APK mein kabhi trigger nahi hote, isliye video full screen layout nahi milta

## Solution: Capacitor-aware Fake Fullscreen

Rotation button press hone par `requestFullscreen()` ke bajaye **CSS-based fake fullscreen** use karenge — player ko `position: fixed; inset: 0; z-index: 9999` pe set kar denge. Yeh WebView mein 100% kaam karta hai.

### Changes needed: 2 files

#### 1. `src/components/video/MahimaGhostPlayer.tsx`

- `isFullscreen` state → `isFakeFullscreen` state (CSS-based)
- `toggleFullscreen()` — `requestFullscreen()` ki jagah `isFakeFullscreen` toggle karein
- `rotateCW()` — rotation ke saath fake fullscreen bhi toggle karein
- Player container: jab `isFakeFullscreen` ho to `position: fixed; inset: 0; z-index: 9999; background: black` apply karein
- Back button / popstate handler — rotation reset ke saath fake fullscreen bhi exit karein
- `document.fullscreenElement` checks remove karein

#### 2. `src/index.css`

- `:fullscreen` CSS rules ke saath `.mahima-fake-fullscreen` class-based rules bhi add karein taaki APK mein bhi same layout mile:
```css
.mahima-ghost-player.mahima-fake-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  background: #000 !important;
}
```

## Files to change
1. `src/components/video/MahimaGhostPlayer.tsx` — fullscreen logic replace with CSS fake fullscreen
2. `src/index.css` — `.mahima-fake-fullscreen` class add karein

## Expected Result
- Rotation button dabaate hi video poora screen cover kar lega (APK mein bhi)  
- Browser mein bhi same behavior (both approaches work together)
- Back button press karne par fullscreen exit ho jaayega
