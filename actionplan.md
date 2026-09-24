# Action Plan: Fix Card Publish/Unpublish Visibility Bug

## Problem Summary

When a manager unchecks "Published" on a card in the admin panel, the card should become invisible in the public deck view. Instead:

1. **The card remains visible** — the frontend fetches cards and filters by `published !== false`, but the filter is never truly needed because...
2. **400 Bad Request errors** on both `profiles` and `cards` queries from the frontend Supabase client (anon key).

## Root Cause Analysis

### The 400 errors come from **Supabase Row Level Security (RLS)** policies

Looking at [`schema.sql`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/supabase/schema.sql#L99-L103) and [`003_admin_features.sql`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/supabase/migrations/003_admin_features.sql#L18-L23):

```sql
CREATE POLICY "Anyone can read published cards"
  ON public.cards FOR SELECT
  USING (published = true);
```

This RLS policy **only allows reading cards where `published = true`**. That's correct for filtering — but the problem is the **frontend query itself**:

In [`database.ts`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/lib/database.ts#L5-L7):

```ts
.select('id, category, author, author_avatar, author_bio, book, question,
         backstory, related_inquiries, vouch_count, published')
```

The query **explicitly selects the `published` column**. Supabase's PostgREST returns a **400 Bad Request** when a query selects columns that are either:
- Not in the table, OR
- The table's RLS policy prevents the row from being visible, combined with certain column-selection edge cases

**But more critically**, the `profiles` table RLS is:

```sql
CREATE POLICY "Users can read their profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
```

The frontend's `loadUserData` calls `supabase.from('profiles').select('email, display_name, created_at, selected_atmospheres, role')` — the `role` column exists in the schema, so the 400 on profiles is most likely because **the `role` column was added after the initial schema** and the RLS policy or PostgREST schema cache hasn't been refreshed. However, the fallback in the code already handles this.

### Why unpublished cards still appear

The frontend `fetchCards()` and `loadUserData()` both have a client-side filter:
```ts
.filter((card: any) => card.published !== false)
```

This filter **does work correctly** when data is returned. But the RLS policy `published = true` already prevents unpublished cards from being returned by Supabase at the PostgREST level. So the real flow is:

1. Admin unchecks "published" → backend PATCH via service_role key succeeds → card's `published` = `false` in DB ✓
2. User visits deck → frontend queries cards via **anon key** → RLS policy filters out `published = false` cards ✓
3. **But the 400 error causes the entire query to fail**, so the frontend falls back to the secondary query (without `published` column), and that fallback query **also gets a 400** because the RLS policy is still blocking.

The 400 is happening because **the query includes `published` in the SELECT list, but RLS is configured in a way that PostgREST returns an error** rather than just filtering rows. This can happen when the PostgREST schema cache is stale or when certain column combinations trigger issues.

### The actual root issues are:

1. **No RLS policy for managers to read ALL cards** (including unpublished) — managers querying via the frontend anon key can only see published cards
2. **The `published` column in the SELECT list may cause 400s** if the column was added via migration but PostgREST schema cache wasn't refreshed
3. **No RLS policy allows authenticated users to read cards at all** — only `published = true` cards are visible, and this is the ONLY select policy

---

## Fix Plan

### Step 1: Add missing RLS policies for `cards` table

> **File:** New migration SQL — `supabase/migrations/004_fix_card_rls.sql`

```sql
-- Allow ALL authenticated users to read published cards
-- (current policy only uses published = true, which should work for anon too)

-- Allow managers to read ALL cards (including unpublished) via RLS
DROP POLICY IF EXISTS "Anyone can read published cards" ON public.cards;

-- Regular users & anonymous can only see published cards
CREATE POLICY "Anyone can read published cards"
  ON public.cards FOR SELECT
  USING (
    published = true
    OR
    -- Managers can see all cards (including unpublished)
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
    )
  );
```

### Step 2: Ensure `profiles` RLS allows reading own profile including `role` column

The existing policy should work, but if the `role` column was added after initial deployment, the PostgREST schema cache needs a refresh.

> **Action:** Reload PostgREST schema cache in Supabase Dashboard → SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 3: Fix frontend `database.ts` fallback handling

> **File:** [`frontend/src/lib/database.ts`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/lib/database.ts)

The current fallback queries drop the `published` and `vouch_count` columns. When the fallback fires, ALL cards are returned (no `published` column to filter on), and the client-side filter `card.published !== false` passes because `undefined !== false` is `true`. This means **unpublished cards leak through on fallback**.

**Fix:** Make the fallback query also filter server-side:

```ts
// In fetchCards() fallback — add .eq('published', true)
const fallback = await supabase
  .from('cards')
  .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries')
  .eq('published', true);
```

Same fix needed in `loadUserData()` fallback.

### Step 4: Fix frontend `database.ts` — filter for published in primary query too

Even though RLS should handle it, add an explicit `.eq('published', true)` to the primary frontend queries as defense-in-depth:

```ts
// In fetchCards()
let { data, error } = await supabase
  .from('cards')
  .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, vouch_count, published')
  .eq('published', true);  // <-- ADD THIS
```

```ts
// In loadUserData() — the cards sub-query
supabase.from('cards')
  .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, vouch_count, published')
  .eq('published', true),  // <-- ADD THIS
```

### Step 5: Refresh PostgREST schema cache

> **Action:** Run in Supabase SQL Editor after applying the migration:

```sql
NOTIFY pgrst, 'reload schema';
```

This forces PostgREST to re-read the table schemas, resolving 400 errors caused by newly-added columns (`published`, `role`, `vouch_count`) not being recognized.

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `supabase/migrations/004_fix_card_rls.sql` | **CREATE** — New migration with manager-aware RLS policy |
| 2 | `supabase/schema.sql` | **UPDATE** — Update the card SELECT policy to include manager bypass |
| 3 | `frontend/src/lib/database.ts` | **UPDATE** — Add `.eq('published', true)` to both primary and fallback card queries |

## Supabase Dashboard Actions (Manual)

| # | Action |
|---|--------|
| 1 | Run migration `004_fix_card_rls.sql` in SQL Editor |
| 2 | Run `NOTIFY pgrst, 'reload schema';` to refresh PostgREST cache |
| 3 | Verify in Table Editor that `cards` table has `published` column visible |
| 4 | Verify RLS policies on `cards` table show the updated policy |

---

## Verification Steps

1. Log in as manager → Admin panel → Uncheck "Published" on a card → Save
2. Open app in incognito (or as regular user) → Card should NOT appear in deck
3. Log back in as manager → Card should still appear in admin panel card list
4. Check browser console → No 400 errors on `/rest/v1/cards` or `/rest/v1/profiles`
