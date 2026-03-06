
## Security Issues Found — What to Do

The security scan has **1 Error** and **4 Warnings**. Here's what each one is and how to fix it:

---

### Issue 1 (Error): User emails/phone numbers exposed via `profiles_public`
**What's wrong:** The `profiles_public` view pulls from the `profiles` table (which has `email` and `mobile`) but the view itself has **zero RLS policies**. Any authenticated user can query it freely. While the view only exposes `id`, `full_name`, `avatar_url` — the lack of policies makes access undefined/risky.

**Fix:** Add an explicit RLS policy to `profiles_public` allowing only authenticated users to read it (since it only has non-sensitive fields). The view is used by `Messages.tsx` for contact search.

---

### Issue 2 (Warning): Notice `author_id` publicly exposed
**What's wrong:** The `notices` table has `USING (true)` for SELECT — so any visitor can read all notices including the `author_id` column, which maps a user ID to their actions.

**Fix:** This is intentional (notices are meant to be public), but we should ensure the `author_id` isn't a leak concern. Since this is a coaching platform and notices are public, we can keep the SELECT policy but it's acceptable. We'll note this as acknowledged.

---

### Issue 3 (Warning): `profiles_public` no RLS policies
**Fix:** Same as Issue 1 — adding an authenticated-read RLS policy resolves both issues 1 and 3.

---

### Issue 4 (Warning): RLS Policy Always True
**What's wrong:** The `leads` table has `WITH CHECK (true)` on the INSERT policy — any anonymous visitor can insert a lead (which is actually intentional — it's a public lead capture form).

**Fix:** This is acceptable behavior for a lead form. We'll acknowledge/mark it as intentional since the landing page lead form needs public INSERT access.

---

### Issue 5 (Warning): Leaked Password Protection Disabled
**What's wrong:** Supabase's HaveIBeenPwned integration is disabled — so users can sign up with known-compromised passwords.

**Fix:** Enable it via Supabase dashboard Auth settings (1-click toggle).

---

## Files to Change

| File | Change |
|------|--------|
| SQL Migration | Add RLS policies to `profiles_public` view (authenticated read only) |
| SQL Migration | Add `security_invoker=on` to the `profiles_public` view definition |
| No code changes | `Messages.tsx` already queries `profiles_public` — this stays the same |

---

## SQL Migration Plan

```sql
-- 1. Recreate the view with security_invoker so it respects the caller's RLS context
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, full_name, avatar_url
  FROM public.profiles;

-- 2. Enable RLS on the view (for Postgres 15+, views inherit base table RLS with security_invoker)
-- Add explicit policy: only authenticated users can read public profiles
ALTER VIEW public.profiles_public OWNER TO authenticated;

-- Grant read access to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
```

This ensures:
- `profiles_public` uses `security_invoker=on` — it runs with the querying user's permissions, not the definer's
- The base `profiles` table already has `USING (false)` block policy + individual user + admin policies, so `security_invoker=on` means non-admins only see their own row (which is fine for the Messages contact list — they still see all public profiles because the profiles SELECT policy allows it for admins)

Wait — actually, since `profiles` has `USING (false)` as a "Block public access" policy AND `USING (auth.uid() = id)` for users — a user via `security_invoker=on` view would only see their own profile. That would break `Messages.tsx`.

**Revised approach**: Keep the view without security_invoker, but add an explicit RLS policy on the view itself allowing authenticated users to read it. The view only exposes non-sensitive fields (`id`, `full_name`, `avatar_url`) so this is safe.

```sql
-- Enable RLS on profiles_public view
ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (true);
```

This resolves Issues 1 and 3 with a single clean policy. The view only exposes safe non-PII fields.

For Issue 5 (Leaked Password Protection) — a direct link to the Supabase Auth settings will be provided for the user to toggle it on.

## Summary of Changes

1. **SQL migration**: Add RLS + SELECT policy to `profiles_public` view → fixes Error + Warning 3
2. **Acknowledge**: `leads` INSERT (Warning 4) is intentional public lead capture
3. **Acknowledge**: `notices` author_id (Warning 2) is acceptable for public notice board  
4. **User action needed**: Enable Leaked Password Protection in Supabase Auth dashboard (Warning 5)
