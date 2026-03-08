
## Plan: Replace Sarthi Icon with Uploaded Guru Image

### What the user wants
Replace the current `logo_icon_web.png` (brand logo) used as the Sarthi avatar with the uploaded **guru/sage illustration** (the orange-robed monk in a circle) across all 4 places in the ChatWidget.

### Steps

**1. Copy the uploaded image to `src/assets/`**
- Copy `user-uploads://1000090345-removebg-preview.png` → `src/assets/sarthi-avatar.png`

**2. Update `src/components/chat/ChatWidget.tsx`**
- Change import from `logo_icon_web.png` → `sarthi-avatar.png`
- Keep variable name as `logoIcon` OR rename to `sarthiAvatar` (cleaner)
- All 4 usages (floating button, header, message bubbles × 2) will automatically use the new image

### Files to change: 1
```text
src/assets/sarthi-avatar.png   — copy uploaded image here
src/components/chat/ChatWidget.tsx  — update import path only
```

No logic changes. Pure asset swap, 1 line import change.
