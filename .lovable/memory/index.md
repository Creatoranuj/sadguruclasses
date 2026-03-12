# Sadguru Coaching Classes - Project Memory

## Design System
- Saffron (#F97316) + Deep Indigo palette, Poppins font
- HSL tokens in index.css, semantic classes only
- Dark mode uses deeper indigo tones

## Architecture
- React + Vite + Capacitor + Supabase
- AuthContext handles login/roles (NO session management)
- `@capacitor/app` used for hardware back button
- Service worker at public/sw.js with cache size limits (MAX 100 items)
- Storage cleanup utility at src/lib/storageCleanup.ts (50MB threshold)
- Error logger at src/lib/errorLogger.ts — batches client errors to error_logs table

## Key Decisions
- Login navigates immediately on success (no probe timer, no setTimeout)
- 2-device session limit REMOVED (2026-03-11) — was causing login hangs
- Capacitor back button minimizes app at root routes (/, /dashboard, /login, /signup)
- Safe-area insets applied via `.capacitor-native` CSS class on body
- Landing nav has inline `paddingTop: env(safe-area-inset-top)` for APK
- Cache name bumped to v2 after adding trim logic
- Courses query uses explicit column selection (not select('*'))
- fetchUserData timeout = 20s, cached with 5s cooldown between fetches
- PageLoader "Taking longer" message shows after 15s (not 8s)

## Latency Optimization (2026-03-11)
- Supabase client uses fetchWithRetry with 3 attempts + exponential backoff (1s, 2s, 4s)
- fetchUserData has 20s timeout wrapper via Promise.race + result caching
- vercel.json: region set to bom1 (Mumbai), static assets cached 1yr immutable

## Certificate Integration (2026-03-12)
- CertificateButton component at src/components/ui/CertificateButton.tsx
- Registration portal: https://satoshi-registration-portal.vercel.app/
- Verification: https://satoshi-registration-portal.vercel.app/verify.html
- Buttons on: Dashboard (Certificates section), Footer (Verify Certificate)

## Admin Monitor (2026-03-12)
- Tables: error_logs, agent_actions, agent_config
- Edge function: log-error (verify_jwt=false)
- Client error logger: src/lib/errorLogger.ts (batched, deduped)
- Admin page: /admin/monitor (src/pages/AdminMonitor.tsx)

## Removals (2026-03-11)
- Session management completely removed
- Admin "Sessions" tab removed
- Settings "Active Sessions" card removed
- Login probe timer removed
