
## Two Changes

### 1. Professional Brand Theme Polish

**Problem**: Current palette is generic grey-blue (`--primary: 216 19% 26%`). Sadguru Coaching Classes needs a distinct, premium identity — saffron (education/spiritual), deep navy, and warm white.

**New Palette (Education Brand)**:
```text
Light Mode:
  --background:   45 100% 98%     → warm cream white
  --primary:      25 95% 53%      → vibrant saffron (#F97316)
  --secondary:    255 60% 35%     → deep indigo-purple
  --accent:       45 80% 93%      → soft golden tint
  --sidebar-bg:   255 60% 18%     → deep purple sidebar

Dark Mode:
  --background:   255 40% 8%      → deep purple-black
  --primary:      25 95% 60%      → bright saffron (slightly lighter)
  --secondary:    255 50% 45%     → medium purple
  --accent:       255 40% 15%     → dark purple card
  --sidebar-bg:   255 50% 5%      → darkest purple
```

This gives a **professional coaching app look** — like BYJU's/Unacademy but with Sadguru's saffron + indigo identity.

**Also add**:
- `--radius: 0.75rem` (rounded cards, currently 0rem = sharp corners)
- Google Font `Poppins` is already imported but `DM Sans` is used in Tailwind config — sync them so Poppins is the actual display font
- Stronger chart colors using the saffron/indigo spectrum

**Files**: `src/index.css`, `tailwind.config.ts`

---

### 2. Chatbot Login Gate Policy

**Problem**: `ChatWidget` is rendered unconditionally in `App.tsx` (line 196) — it shows the floating button and chat to everyone, including unauthenticated guests on the landing page.

**Required**: "Weaver-like users" (students) should only access Sadguru Sarthi after login.

**Current state in ChatWidget.tsx**:
- `const { user } = useAuth()` is already imported (line 74)
- The floating button and chat panel are always rendered regardless of `user`

**Fix**: In `ChatWidget.tsx`, gate the entire widget behind `user`:
- If `!user`: show a locked floating button that, when tapped, shows a small tooltip/popup: "**Login करें** Sadguru Sarthi से बात करने के लिए" with a "Login →" link to `/login`
- If `user`: show the full chatbot as-is

This is a **single conditional block** — no new components needed.

```tsx
// In the floating button section:
if (!user) {
  // Show locked button with login prompt tooltip
  return <LockedChatButton />;
}
// Otherwise render full chat
```

The locked state uses a lock icon + saffron styling matching the new brand theme.

---

## Files to Change

| File | Change |
|------|--------|
| `src/index.css` | Replace CSS variable values with saffron+indigo palette; set `--radius: 0.75rem`; fix `--font-sans` to use Poppins |
| `tailwind.config.ts` | Update `fontFamily.sans` to Poppins first; update border radius to use `var(--radius)` properly |
| `src/components/chat/ChatWidget.tsx` | Add login gate — when `!user`, render locked floating button with a "Login to chat" tooltip instead of the full widget |

---

## Precise Changes

### `src/index.css` — CSS Variables

**Light mode `:root`** (lines 11–74):
```css
--background: 45 100% 98%;          /* warm cream */
--foreground: 255 40% 12%;          /* deep purple-black text */
--card: 0 0% 100%;                  /* white cards */
--card-foreground: 255 40% 12%;
--popover: 0 0% 100%;
--popover-foreground: 255 40% 12%;
--primary: 25 95% 53%;              /* Saffron #F97316 */
--primary-foreground: 0 0% 100%;
--secondary: 255 55% 35%;           /* Deep Indigo */
--secondary-foreground: 0 0% 100%;
--muted: 45 30% 92%;                /* warm grey */
--muted-foreground: 255 20% 45%;
--accent: 45 80% 93%;               /* light gold */
--accent-foreground: 255 40% 20%;
--border: 45 30% 88%;
--input: 45 30% 88%;
--ring: 25 95% 53%;
--radius: 0.75rem;
--sidebar-background: 255 60% 16%;  /* deep purple */
--sidebar-foreground: 0 0% 95%;
--sidebar-primary: 25 95% 53%;      /* saffron */
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 255 50% 25%;
--sidebar-accent-foreground: 0 0% 95%;
--sidebar-border: 255 40% 25%;
--chart-1: 25 95% 53%;              /* saffron */
--chart-2: 255 55% 50%;             /* indigo */
--chart-3: 142 71% 45%;             /* green */
--chart-4: 38 95% 55%;              /* amber */
--chart-5: 200 80% 50%;             /* teal */
```

**Dark mode `.dark`** (lines 76–132):
```css
--background: 255 40% 8%;
--foreground: 45 60% 95%;
--card: 255 35% 13%;
--primary: 25 95% 60%;              /* brighter saffron on dark */
--secondary: 255 45% 45%;
--muted: 255 30% 20%;
--accent: 255 35% 17%;
--border: 255 30% 22%;
--sidebar-background: 255 50% 5%;
--sidebar-accent: 255 40% 18%;
```

### `tailwind.config.ts` — Font family
Change `fontFamily.sans` first entry from `'DM Sans'` to `'Poppins'` (Poppins is already imported in `index.css`).

### `src/components/chat/ChatWidget.tsx` — Login gate

After line 73 (`const ChatWidget = forwardRef...`), after extracting `user` from `useAuth()`, add the conditional render logic in the `return` statement:

When `!user`, render only:
```tsx
<>
  {/* Hidden by default tooltip state */}
  <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 flex flex-col items-end gap-2">
    {showLoginTip && (
      <div className="bg-card border border-border rounded-2xl shadow-xl px-4 py-3 text-sm max-w-[220px] text-right animate-in slide-in-from-bottom-2">
        <p className="font-semibold text-foreground mb-1">Sadguru Sarthi 🎓</p>
        <p className="text-muted-foreground text-xs mb-2">सीखने के लिए login करें और Sarthi से बात करें।</p>
        <Link to="/login" className="text-primary font-semibold text-xs hover:underline">Login करें →</Link>
      </div>
    )}
    <button
      onClick={() => setShowLoginTip(p => !p)}
      className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all relative"
      aria-label="Login to chat with Sadguru Sarthi"
    >
      <img src={logoIcon} className="w-8 h-8 object-contain" alt="Sadguru Sarthi" />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-background rounded-full border-2 border-border flex items-center justify-center">
        <Lock className="h-2.5 w-2.5 text-muted-foreground" />
      </span>
    </button>
  </div>
</>
```

Need to add: `import { Lock } from "lucide-react"`, `import { Link } from "react-router-dom"`, and a `showLoginTip` state.

The full chatbot render only happens when `user` exists.
