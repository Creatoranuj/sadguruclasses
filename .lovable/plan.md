
## What's Already Working vs. What Needs to Be Built

**Already working (keep as-is):**
- Manual UPI payment flow in `BuyCourse.tsx` (QR → UTR + screenshot → admin approval)
- Free course auto-enrollment in `BuyCourse.tsx`
- Admin payment approval in `Admin.tsx` (approve → enrollment created)
- `payment_requests` table with full RLS

**What needs to be built (Razorpay as a second option):**
- 3 Supabase Edge Functions: `create-razorpay-order`, `verify-razorpay-payment`
- Add Razorpay Checkout button on `BuyCourse.tsx` alongside the existing UPI option
- New `razorpay_payments` table to track Razorpay transactions separately (so existing `payment_requests` manual flow is untouched)
- Auto-enrollment on Razorpay payment success (no admin approval needed — Razorpay verifies instantly)

---

## Database Changes

One new table (keeps `payment_requests` for manual UPI unchanged):

```sql
CREATE TABLE razorpay_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id bigint NOT NULL,
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'INR',
  status text DEFAULT 'pending',  -- pending | completed | failed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: users see own records; admins see all
```

---

## Edge Functions (2 new)

### `create-razorpay-order`
- Input: `{ course_id }` + JWT auth header
- Fetches course price from `courses` table
- Calls Razorpay API: `POST https://api.razorpay.com/v1/orders`
- Inserts row into `razorpay_payments` with status `pending`
- Returns: `{ order_id, amount, currency, key_id }`

### `verify-razorpay-payment`
- Input: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, course_id }`
- Verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`
- On success: updates `razorpay_payments` status → `completed`, creates enrollment in `enrollments`
- Returns: `{ success: true, enrollment_id }`

---

## Frontend Changes

### `BuyCourse.tsx` — add Razorpay as a "fast pay" option
On the `details` step for paid courses, show two payment options side-by-side:

```
┌─────────────────────┬─────────────────────┐
│  💳 Pay with         │  📱 Pay via UPI      │
│  Razorpay           │  (Manual)           │
│  Instant enrollment  │  Admin approval     │
│  [Pay ₹{price}]     │  [Proceed]          │
└─────────────────────┴─────────────────────┘
```

Clicking "Pay with Razorpay":
1. Calls `create-razorpay-order` edge function
2. Dynamically loads Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`)
3. Opens Razorpay modal with pre-filled amount, name, description
4. On payment success callback: calls `verify-razorpay-payment` edge function
5. On verification success: shows success toast + navigates to course

### New utility: `src/utils/razorpay.ts`
Helper to dynamically load the Razorpay script and open checkout.

---

## Secrets Needed
Two secrets must be added to Supabase:
- `RAZORPAY_KEY_ID` — public key (e.g., `rzp_test_xxxxxxxx`)
- `RAZORPAY_KEY_SECRET` — secret key (only used server-side in edge functions)

---

## Files to Create/Edit

| File | Action |
|---|---|
| `supabase/migrations/..._razorpay.sql` | New table `razorpay_payments` |
| `supabase/functions/create-razorpay-order/index.ts` | New edge function |
| `supabase/functions/verify-razorpay-payment/index.ts` | New edge function |
| `src/utils/razorpay.ts` | New — script loader + checkout helper |
| `src/pages/BuyCourse.tsx` | Edit — add Razorpay payment option alongside existing UPI |

**No changes to:** `Admin.tsx`, `payment_requests` table, manual UPI flow — these are kept fully intact.

---

## Security Notes
- `RAZORPAY_KEY_SECRET` never leaves the edge function — frontend only receives the `key_id`
- Signature verification is fully server-side in `verify-razorpay-payment`
- Enrollment only created after server-side signature verification passes
- Duplicate enrollment check (`maybeSingle()`) prevents double-enrollment

---

## How to Get Razorpay Keys
1. Sign up at razorpay.com → Dashboard → Settings → API Keys
2. For testing use "Test Mode" keys (prefix `rzp_test_`)
3. Add both keys to Supabase Edge Function secrets (I'll prompt you for them after you confirm)
