
## Understanding the User's Question

The user is asking:
1. **"Jab mai Vercel pe deploy karunga tab Chatbot ko kisse Connect kare?"** — When deploying to Vercel, what does the chatbot connect to?
2. Implied follow-up from previous summary: **Add chatbot link in Admin sidebar**

---

## Answer to Vercel Deployment Question

The chatbot architecture has TWO separate parts:

```text
Frontend (React/Vite)          Backend (Supabase Edge Function)
─────────────────────          ──────────────────────────────────
Vercel pe deploy hoga    →     Supabase pe ALREADY deployed hai
(ChatWidget.tsx)               (supabase/functions/chatbot/index.ts)
                               ↓
                         Lovable AI Gateway
                         (google/gemini-2.5-flash)
                         LOVABLE_API_KEY = already set
```

**Vercel pe deploy karne ke baad:**
- Frontend = Vercel pe hoga ✅
- Chatbot edge function = Supabase pe ALREADY hai, kuch change nahi hoga ✅
- `VITE_SUPABASE_URL` aur `VITE_SUPABASE_PUBLISHABLE_KEY` — ye dono Vercel ke **Environment Variables** mein add karne honge

The `ChatWidget.tsx` already uses:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

So the chatbot will work on Vercel automatically as long as those 2 env vars are set.

**One issue**: `LOVABLE_API_KEY` is a Lovable-specific secret auto-provided in the Supabase project linked to Lovable. After transferring to your own Supabase, this key may NOT be available. The user will need their own Gemini API key.

---

## Plan: Add Chatbot Link to Admin Sidebar + Vercel Deployment Info

### Changes needed:

**1. `src/components/Layout/Sidebar.tsx`**
- Add a "Chatbot Settings" link in the admin-only section, right below the "Admin Panel" link
- Use `Bot` icon from lucide-react (already imported or can add)
- Only visible to `isAdmin`

**2. No other files need changing** — `/admin/chatbot` route already exists in App.tsx (line 176), `AdminChatbotSettings` page already exists.

### Sidebar change detail:
```text
BEFORE (admin section):
  Admin Panel  →  /admin

AFTER:
  Admin Panel      →  /admin
  Chatbot Settings →  /admin/chatbot  (Bot icon, admin only)
```

Import `Bot` icon alongside existing `ShieldCheck` import in Sidebar.tsx.

### Files to modify: 1
- `src/components/Layout/Sidebar.tsx` — add Bot import, add Chatbot Settings link after Admin Panel link

---

## Vercel Deployment Steps (to explain to user in chat, not code):

1. Vercel pe deploy karo (same as normal React app)
2. Vercel Dashboard → Project Settings → Environment Variables mein add karo:
   - `VITE_SUPABASE_URL` = `https://wegamscqtvqhxowlskfm.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (your anon key)
3. Chatbot edge function Supabase pe already deployed hai — kuch alag se deploy nahi karna
4. **IMPORTANT**: `LOVABLE_API_KEY` Lovable's own secret hai. Vercel deploy ke baad jab app Supabase se connect karega, tab ye key Supabase secrets mein available rahegi (kyunki edge function Supabase pe hi run hogi, Vercel pe nahi). So chatbot will work fine on Vercel.

The architecture is: Vercel (frontend) → Supabase Edge Function (backend/chatbot) → Lovable AI Gateway. This chain works regardless of where the frontend is hosted.
