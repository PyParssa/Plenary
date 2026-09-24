# Fix: Logout on Page Refresh — Diagnosis & Action Plan

> **Symptom:** User is logged out every time they refresh the page  
> **Root Cause:** Race condition in `App.tsx` auth initialization + `onAuthStateChange` listener nuking state prematurely  
> **Date:** September 2026

---

## Diagnosis

After a thorough audit of the auth flow, here are the **4 bugs** that combine to cause the logout-on-refresh:

### Bug 1 — `onAuthStateChange` fires `INITIAL_SESSION` before `getSession()` resolves, then both race

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L327-L338)

```tsx
// Current code — TWO competing auth initializations:
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') authenticatedUserId = null;
  void hydrateSession(session);  // ← fires immediately with INITIAL_SESSION
});

supabase.auth.getSession().then(({ data: { session } }) => void hydrateSession(session)); // ← also fires
```

**Problem:** `onAuthStateChange` fires an `INITIAL_SESSION` event synchronously/immediately after subscribing. Then `getSession()` also resolves independently. Both call `hydrateSession()` — the second call sees `isAuthReady = false` (being set by the first) and may clear state or re-process the session, causing flicker.

Worse: Supabase v2's `onAuthStateChange` can sometimes emit `SIGNED_OUT` as the first event when the stored session token is expired and auto-refresh hasn't completed yet, which hits this branch:

```tsx
if (event === 'SIGNED_OUT') authenticatedUserId = null;
void hydrateSession(session);  // session is null → clears everything
```

### Bug 2 — `hydrateSession` eagerly clears all user state on null session

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L266-L272)

```tsx
if (!session?.user?.id) {
  setUserId(null);
  setSessionToken('');
  setGuestProfile(null);  // ← wipes the entire UI state
  setIsAuthReady(true);
  return;
}
```

**Problem:** If the first `onAuthStateChange` event has no session (e.g., token is being refreshed), this immediately nukes all user state. Even if the token refreshes successfully a moment later, the UI has already been reset to logged-out state and re-renders.

### Bug 3 — No guard against re-entrant `hydrateSession` calls

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L249-L325)

```tsx
const hydrateSession = async (session, allowSessionRecheck = true) => {
  if (!isMounted) return;
  setIsAuthReady(false);  // ← resets loading state every time
  // ... long async work follows
};
```

**Problem:** `hydrateSession` is async and takes time (fetches profile, cards, reflections from Supabase). When called twice in quick succession (from both the listener and `getSession`), both invocations run concurrently, causing race conditions with state updates. There's no lock, no debounce, no sequence counter.

### Bug 4 — `TOKEN_REFRESHED` event is not handled

The `onAuthStateChange` callback doesn't check the event type. When Supabase auto-refreshes the token (which happens on page load if the token is near expiration), it fires `TOKEN_REFRESHED` with a new session. This triggers a full `hydrateSession()` re-run (re-fetching profile, cards, etc.) which is wasteful and can cause state glitches.

---

## The Fix — Step by Step

### Step 1 — Remove the redundant `getSession()` call

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L327-L338)

`onAuthStateChange` in Supabase v2 **already** fires an `INITIAL_SESSION` event with the current session. The separate `getSession().then(...)` is redundant and is the primary source of the race.

**Change:**

```tsx
// BEFORE (two competing sources):
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') authenticatedUserId = null;
  void hydrateSession(session);
});

supabase.auth.getSession().then(({ data: { session } }) => void hydrateSession(session));

// AFTER (single source of truth):
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    authenticatedUserId = null;
    setUserId(null);
    setSessionToken('');
    setGuestProfile(null);
    setIsAuthReady(true);
    return;
  }

  // Only hydrate on meaningful events
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    void hydrateSession(session);
  }

  // For TOKEN_REFRESHED, just update the token — no full re-hydration needed
  if (event === 'TOKEN_REFRESHED' && session?.access_token) {
    setSessionToken(session.access_token);
  }
});
```

> [!IMPORTANT]
> Removing the `getSession()` call is safe because `onAuthStateChange` in `@supabase/supabase-js` v2 fires `INITIAL_SESSION` synchronously upon subscription with the current session from localStorage.

### Step 2 — Add a re-entrancy guard to `hydrateSession`

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L249-L325)

Add a sequence counter so that if a newer invocation starts, the older one stops updating state:

```tsx
useEffect(() => {
  let isMounted = true;
  let authenticatedUserId: string | null = null;
  let hydrationSeq = 0;  // ← ADD THIS

  const hydrateSession = async (
    session: /* ... */,
  ) => {
    if (!isMounted) return;

    const thisSeq = ++hydrationSeq;  // ← ADD THIS

    if (!session?.user?.id) {
      // Don't wipe state here — only SIGNED_OUT should do that
      // (handled in the event listener above)
      setIsAuthReady(true);
      return;
    }

    setIsAuthReady(false);

    authenticatedUserId = session.user.id;
    setUserId(session.user.id);
    setSessionToken(session.access_token ?? '');

    // ... (existing profile fetch logic) ...

    // Before every state update after an async gap, check:
    if (!isMounted || thisSeq !== hydrationSeq) return;  // ← ADD THIS

    // ... (rest of state updates) ...

    setIsAuthReady(true);
  };

  // ... rest of effect
}, []);
```

### Step 3 — Don't nuke `guestProfile` on transient null sessions

**File:** [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L255-L272)

Remove the `allowSessionRecheck` logic and the defensive `getSession()` re-check inside `hydrateSession`. This was a workaround for the race condition — fix the root cause instead of adding workaround layers.

**Before:**
```tsx
if (!session?.user?.id && allowSessionRecheck) {
  const { data: currentSession } = await supabase.auth.getSession();
  if (currentSession.session?.user?.id) {
    await hydrateSession(currentSession.session, false);
    return;
  }
  if (authenticatedUserId) return;
}

if (!session?.user?.id) {
  setUserId(null);
  setSessionToken('');
  setGuestProfile(null);
  setIsAuthReady(true);
  return;
}
```

**After:**
```tsx
if (!session?.user?.id) {
  // Only mark as ready, don't clear state — SIGNED_OUT handler does that
  setIsAuthReady(true);
  return;
}
```

### Step 4 — Verify Supabase client config (already correct ✅)

**File:** [`supabase.ts`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/lib/supabase.ts)

The Supabase client configuration is actually correct:

```tsx
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // ✅ stores session in localStorage
    autoRefreshToken: true,     // ✅ refreshes expired tokens automatically
    detectSessionInUrl: true,   // ✅ handles OAuth/magic-link redirects
  },
});
```

This means the session IS being stored in `localStorage` by Supabase (not cookies — Supabase JS v2 uses localStorage by default). The problem isn't storage, it's the App.tsx initialization code discarding the stored session on load.

---

## Summary of Changes

| File | Change | Why |
|---|---|---|
| [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx) L327-332 | Remove redundant `supabase.auth.getSession()` call | Eliminates the race condition (dual initialization) |
| [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx) L327-330 | Filter `onAuthStateChange` events by type | Prevents `TOKEN_REFRESHED` from triggering full re-hydration; prevents premature `SIGNED_OUT` from clearing state |
| [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx) L249-325 | Add `hydrationSeq` counter to `hydrateSession` | Prevents stale async hydrations from clobbering newer state |
| [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx) L255-272 | Remove `allowSessionRecheck` + defensive `getSession()` inside hydration | Removes unnecessary complexity; root cause is fixed instead |
| [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx) L266-272 | Stop clearing `guestProfile`/`userId` on null session in `hydrateSession` | Only `SIGNED_OUT` event should clear user state, not a transient null session |

---

## Full Corrected `useEffect` Block

Here is the complete corrected auth initialization effect for [`App.tsx`](file:///run/media/parssa/Extra/backend/Plenary/Plenary/frontend/src/App.tsx#L245-L338):

```tsx
useEffect(() => {
  let isMounted = true;
  let authenticatedUserId: string | null = null;
  let hydrationSeq = 0;

  const hydrateSession = async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
  ) => {
    if (!isMounted) return;

    const thisSeq = ++hydrationSeq;

    if (!session?.user?.id) {
      setIsAuthReady(true);
      return;
    }

    setIsAuthReady(false);

    authenticatedUserId = session.user.id;
    setUserId(session.user.id);
    setSessionToken(session.access_token ?? '');
    const sessionEmail = session.user.email ?? '';
    const sessionDisplayName = typeof session.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : typeof session.user.user_metadata?.full_name === 'string'
        ? session.user.user_metadata.full_name
        : undefined;
    if (sessionEmail) {
      const bootstrapResponse = session.access_token
        ? await fetch(getApiUrl('/api/account/bootstrap'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        : null;
      if (bootstrapResponse && !bootstrapResponse.ok) {
        console.error('Could not bootstrap authenticated user profile:', await bootstrapResponse.text());
      }
      await saveProfile(session.user.id, sessionEmail, sessionDisplayName).catch((error) => {
        console.error('Could not create authenticated user profile:', error);
      });
    }

    if (!isMounted || thisSeq !== hydrationSeq) return;

    try {
      const saved = await loadUserData(session.user.id);
      if (!isMounted || thisSeq !== hydrationSeq) return;
      const selectedAtmospheres = saved.profile?.selectedAtmospheres ?? JSON.parse(localStorage.getItem('plenary_journey') ?? '[]');
      const resolvedRole = resolveUserRole(saved.profile?.email ?? session.user.email, saved.profile?.role);
      setGuestProfile({
        email: saved.profile?.email ?? session.user.email ?? '',
        displayName: saved.profile?.displayName ?? session.user.user_metadata?.display_name,
        createdAt: saved.profile?.createdAt ?? Date.now(),
        selectedAtmospheres,
        role: resolvedRole,
      });
      setCards((current) => saved.cards.length > 0
        ? applyVouches(saved.cards, saved.vouchedCardIds)
        : applyVouches(current, saved.vouchedCardIds));
      setReflectionSessions(saved.reflections);
      setIsJourneyOpen(selectedAtmospheres.length === 0);
    } catch (error) {
      if (!isMounted || thisSeq !== hydrationSeq) return;
      console.error('Could not load account data:', error);
      setGuestProfile({
        email: session.user.email,
        createdAt: Date.now(),
        selectedAtmospheres: JSON.parse(localStorage.getItem('plenary_journey') ?? '[]'),
        role: resolveUserRole(sessionEmail),
      });
      setIsJourneyOpen(!localStorage.getItem('plenary_journey'));
    }
    setIsAuthReady(true);
  };

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      authenticatedUserId = null;
      setUserId(null);
      setSessionToken('');
      setGuestProfile(null);
      setIsAuthReady(true);
      return;
    }

    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      void hydrateSession(session);
      return;
    }

    if (event === 'TOKEN_REFRESHED' && session?.access_token) {
      setSessionToken(session.access_token);
    }
  });

  return () => {
    isMounted = false;
    authListener.subscription.unsubscribe();
  };
}, []);
```

---

## Verification

After applying the fix, verify:

- [ ] Sign in → refresh page → user stays logged in ✅
- [ ] Sign in → close tab → reopen → user stays logged in ✅
- [ ] Sign in → wait for token to expire (~1 hour) → refresh → auto-refresh works, stays logged in ✅
- [ ] Sign out → refresh → stays signed out ✅
- [ ] Open DevTools → Application → Local Storage → confirm `sb-*-auth-token` key exists after sign-in ✅
- [ ] No double-flash of logged-out state during page load ✅

---

## Why This Wasn't a Cookie Problem

The initial suspicion was cookies, but Supabase JS v2 uses **localStorage** for session persistence by default (not cookies). The session was being stored correctly — the problem was that the React initialization code in `App.tsx` was **discarding the stored session** due to a race condition between two competing auth initialization paths (`onAuthStateChange` and `getSession()`), where a transient `null` session fired first and wiped all user state before the real session could be loaded.
