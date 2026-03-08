
## Plan: Replace Sparkles/Bot Icons with Sadguru Logo in ChatWidget

### What the user wants
The user is pointing at the sparkle icon (✨) in the floating chat button and the chat header avatar — they want it replaced with the **Sadguru Coaching Classes logo** (`logo_icon_web.png`) instead of the generic sparkle/bot icon.

### 3 Places to update in `src/components/chat/ChatWidget.tsx`:

1. **Floating trigger button** (line 182): `<Sparkles className="w-6 h-6" />` → `<img src={logo} className="w-8 h-8 object-contain" />`

2. **Chat header avatar** (line 196): `<Sparkles className="w-4 h-4 text-primary" />` → `<img src={logo} className="w-6 h-6 object-contain" />`

3. **Message bubble avatars** (lines 217–219 and 273–275): The `<Bot className="h-3.5 w-3.5 text-primary" />` icon inside the `w-7 h-7 rounded-full bg-primary/10` div — replace with the logo image

### Import
Add at the top of the file:
```typescript
import logoIcon from "@/assets/branding/logo_icon_web.png";
```

Remove `Sparkles`, `Bot`, `HelpCircle` from lucide-react import if no longer used (keep others like `X`, `Send`, `RotateCcw`, `ThumbsUp`, `ThumbsDown`).

Also remove the `Loader2` import since it's not used (bouncing dots replaced it).

### Files to change: 1
- `src/components/chat/ChatWidget.tsx` — import logo, replace all 4 icon instances
