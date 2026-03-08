
## Plan: Make ChatWidget Full-Page & Update Logo to Question Mark

### What the user wants (from screenshot reference)
The screenshot shows the chatbot already in a full-page-like view on mobile. The user wants:
1. **Full page format** — instead of a floating popup (520px height, max-w-sm), the chat window should take the full screen (100vw × 100vh) when open, like a proper page/drawer
2. **Change logo** — replace the `sadguruLogo` image in the chat header and floating button with a **question mark** icon (using Lucide's `HelpCircle` or `MessageCircleQuestion`)

### Changes needed — only `src/components/chat/ChatWidget.tsx`

**1. Floating button:**
- Replace `<img src={sadguruLogo}>` with `<HelpCircle className="w-7 h-7" />` (or `MessageCircleQuestion`)

**2. Chat window — full page:**
- Change positioning from `fixed bottom-36 right-4` to `fixed inset-0 z-50`
- Remove `max-w-sm`, `h-[520px]`, rounded corners, shadow popup feel
- Replace with `w-full h-full` (full screen), `rounded-none` or keep slight rounding on desktop
- On mobile: full screen overlay. On md+: keep it as a side panel or full screen

**3. Header logo:**
- Replace `<img src={sadguruLogo}>` in the header with `<HelpCircle>` or `<MessageCircleQuestion>` icon styled with `bg-primary/10 text-primary`
- Add a close `X` button in the header (top right) to dismiss

**4. Animation:**
- Change from `slide-in-from-bottom-4` to `slide-in-from-right` or `fade-in` for full-page feel

### Implementation details

```text
BEFORE (floating popup):
  fixed bottom-36 right-4
  w-[calc(100vw-2rem)] max-w-sm
  h-[520px]
  rounded-2xl shadow-2xl

AFTER (full page):
  fixed inset-0
  w-full h-full (or w-screen h-screen)
  rounded-none
  flex flex-col
  On md+: keep as centered modal or right-side drawer (max-w-lg mx-auto)
```

The floating trigger button stays fixed bottom-right, but when clicked opens the full-page chat. The X button moves to the chat header for closing.

No database, edge function, or other file changes needed — this is purely a ChatWidget.tsx UI update.
