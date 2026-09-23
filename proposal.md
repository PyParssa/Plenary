# Plenary — Product Update Proposal

> **Date:** September 2026  
> **Author:** Parssa  
> **Status:** Draft — Open for Review

---

## Executive Summary

Plenary has a strong foundation: a beautiful card-based inquiry deck, a unique 3-second vouch mechanic, a multi-provider Socratic AI reflection engine, and a clean decoupled architecture (React on Vercel + FastAPI on Render + Supabase). However, several areas need attention before scaling to real users — fake metrics, missing admin tooling, no onboarding guidance, and limited content management. This proposal outlines **prioritized updates and new features** across five themes.

---

## Table of Contents

- [Phase 1: Fix What's Broken](#phase-1-fix-whats-broken)
- [Phase 2: First-Time User Experience](#phase-2-first-time-user-experience)
- [Phase 3: Admin & Content Management](#phase-3-admin--content-management)
- [Phase 4: Feature Enhancements](#phase-4-feature-enhancements)
- [Phase 5: Future Vision](#phase-5-future-vision)

---

## Phase 1: Fix What's Broken

> [!CAUTION]
> These issues will erode user trust if not addressed before any public launch.

### 1.1 — Make Vouch Counts Real

**Current Problem:**  
Vouch counts are completely fabricated. The 8 seed cards ship with hardcoded numbers (2,470–6,810) that have no basis in reality. When a user vouches, only their local state increments by +1. There is no server-side aggregation — if 100 users vouch for the same card, each one sees a different number.

**How it works today:**
- `initialData.ts` → hardcoded `vouchCount: 4280`, `vouchCount: 6810`, etc.
- `database.ts:loadUserData()` → fetches cards but sets `vouchCount: 0` for all of them.
- `App.tsx:handleVouchCard()` → local `vouchCount + 1`, never synced to a shared counter.

**Proposed Fix:**
1. Add a `vouch_count` column to the `cards` table in Supabase (integer, default 0).
2. Create a Supabase database function (or Postgres trigger) that automatically increments/decrements `vouch_count` when rows are inserted/deleted in `card_vouches`.
3. Update `loadUserData()` in `database.ts` to read the real `vouch_count` from the `cards` table.
4. Remove all hardcoded `vouchCount` values from `initialData.ts`.
5. Seed the initial cards into Supabase with `vouch_count: 0` and let the numbers grow organically.

**Priority:** 🔴 Critical  
**Effort:** Small (backend trigger + frontend cleanup)

---

### 1.2 — Audit & Remove Unrelated / Placeholder Text

**Current Problem:**  
Several places contain hardcoded placeholder strings, demo-only stats, and text that won't make sense to real users.

**Items to address:**

| Location | Issue | Action |
|---|---|---|
| `TopNav.tsx:189-199` | Hardcoded stats: `"5-Turn Mode"` and `"Daily Ember"` next to "Socratic Reflections" and "Inquiry Habit" | Either wire these to real data (e.g., actual reflection count, streak) or remove them entirely until they're functional. |
| `initialData.ts` | Author `totalVouches` are fabricated (18,420, 24,890, etc.) | Remove `totalVouches` from the `AuthorProfile` type, or compute it as the sum of real vouch counts across the author's cards. |
| `App.tsx:180, 261` | Hardcoded email `'parssamohammadi@gmail.com'` for manager role elevation | Move this to a server-side check or an environment variable. Hardcoding emails in client-side code is a security concern — anyone can see it in the bundle. |
| `DiscoveryView.tsx:53, 92` | Hardcoded Unsplash fallback avatar URL | Host a local default avatar in `public/assets/` instead of depending on an external URL that could break. |
| `DiscoveryView.tsx:441-451` | Card preview shows `"Author • Source Book"` and `"Your headline question will appear here..."` | These are fine as empty-state placeholders, but ensure they're styled as clearly "preview" text (lighter color, italic). |

**Priority:** 🟠 High  
**Effort:** Small (text cleanup + minor logic changes)

---

### 1.3 — Fix the Pre-Vouched Seed Cards

**Current Problem:**  
Cards `q-1` (Viktor Frankl) and `q-4` (Mary Oliver) ship with `vouched: true` and fake timestamps. This means every brand-new user immediately has 2 cards in their Vault that they never actually vouched for — a confusing and dishonest experience.

**Proposed Fix:**  
Set all seed cards to `vouched: false` and `vouchCount: 0`. Let users discover and vouch for cards themselves. The Journey Picker already personalizes the deck order, which is sufficient for a curated first impression.

**Priority:** 🟠 High  
**Effort:** Trivial (change 4 values in `initialData.ts`)

---

## Phase 2: First-Time User Experience

### 2.1 — Interactive Guided Tour

**Current Problem:**  
New users land on the app with no explanation of what the card deck is, what "vouching" means, how the 3-second hold works, or what the Vault is for. The Journey Picker is a nice atmospheric intro, but it doesn't teach the user how to use the product.

**Proposed Solution:**  
Implement a lightweight step-by-step guided tour using a library like [`driver.js`](https://driverjs.com/) (tiny, no dependencies, great for highlighting UI elements with popover explanations).

**Tour Steps:**

| Step | Target Element | Message |
|---|---|---|
| 1 | The first card in the deck | *"Welcome to Plenary. Each card holds a question from a great thinker. Swipe through the deck to explore."* |
| 2 | The vouch button | *"Found a question that resonates? Hold for 3 seconds to vouch. It saves the card to your personal Vault."* |
| 3 | The Vault tab | *"Your Vault holds every question you've vouched for. Return here to reflect on them."* |
| 4 | The reflection icon (on a card) | *"Tap here to open a Socratic AI conversation. It will challenge your thinking through the lens of this card."* |
| 5 | The Discovery tab | *"Discover authors and categories. Creators can contribute new inquiry cards here."* |
| 6 | The Account tab | *"Set up your account to sync your vouches across devices and unlock AI reflections."* |

**Trigger Logic:**
- Show tour automatically on first visit (check `localStorage` for `plenary_tour_completed`).
- Add a "Replay Tour" button in the Account settings for returning users.
- Tour should fire *after* the Journey Picker completes (so the deck is already personalized).

**Priority:** 🟠 High  
**Effort:** Medium (integrate library + design 6 popovers)

---

### 2.2 — Empty State Illustrations

**Current Problem:**  
When the Vault is empty or no cards match a filter, the user sees a blank screen with minimal text.

**Proposed Solution:**  
Add thoughtful empty-state illustrations and calls-to-action:
- **Empty Vault:** *"Your vault is waiting. Explore the deck and hold on a question that moves you."* + button to jump to the Deck.
- **No search results in Vault:** *"No cards match your search. Try a different phrase."*
- **Empty Reflection history:** *"Start your first reflection to see it here."*

**Priority:** 🟡 Medium  
**Effort:** Small

---

## Phase 3: Admin & Content Management

### 3.1 — Admin Dashboard Panel

**Current Problem:**  
There is no way to manage the app's content without directly editing the Supabase database. The only role with elevated permissions is `'manager'`, and it can only create cards — not edit, delete, moderate, or view analytics.

**Proposed Solution:**  
Build an Admin Panel accessible only to users with the `'manager'` role (later consider adding a dedicated `'admin'` role to `UserRole`).

**Admin Panel Features:**

#### Card Management
- **View all cards** in a sortable, filterable table (by category, author, vouch count, date created).
- **Edit existing cards** inline — fix typos in questions, update backstories, change categories.
- **Delete cards** with confirmation dialog (cascade-deletes associated vouches and reflections).
- **Toggle card visibility** (publish/unpublish) to temporarily hide cards without deleting them.
- **Bulk actions** — select multiple cards to delete, unpublish, or re-categorize.

#### User Management
- **View registered users** (email, display name, signup date, role, vouch count).
- **Change user roles** (promote `user` → `creator`, or `creator` → `manager`).
- **View user activity** — number of vouches, reflections started, cards created.

#### Analytics Overview
- Total registered users.
- Total cards (published vs. unpublished).
- Total vouches (today, this week, all time).
- Most vouched cards (top 10).
- Most active reflectors.

**Implementation Approach:**
- Add a new `/admin` route (or tab) in the frontend, guarded by role check.
- Create corresponding FastAPI endpoints (`GET /api/admin/cards`, `PATCH /api/admin/cards/:id`, `DELETE /api/admin/cards/:id`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`).
- All admin endpoints validate the caller's Supabase JWT and check `role === 'manager'` server-side.

**Priority:** 🟠 High  
**Effort:** Large (new UI views + new backend endpoints + auth guards)

---

### 3.2 — Bulk Card Import via Template

**Current Problem:**  
Cards can only be added one at a time through the manual form in `DiscoveryView.tsx`. If a curator wants to add 50 cards, they need to fill the form 50 times.

**Proposed Solution:**  
Allow admins/managers to import cards in bulk via a structured template.

**Supported Formats:**
1. **CSV Template** (easiest for non-technical users):
   ```csv
   category,author,author_avatar,author_bio,book,question,backstory,related_inquiry_1,related_inquiry_2
   "Existential Inquiry","Viktor Frankl","https://...","Austrian psychiatrist...","Man's Search for Meaning","What would you attempt...","Observations on...","What task is...","Are you suffering..."
   ```
2. **JSON Template** (for developers or automated pipelines):
   ```json
   [
     {
       "category": "Existential Inquiry",
       "author": "Viktor Frankl",
       "book": "Man's Search for Meaning",
       "question": "What would you attempt if you knew failure was not fatal?",
       "backstory": "Observations on internal purpose...",
       "relatedInquiries": ["What task is currently waiting...", "Are you suffering for an aim..."]
     }
   ]
   ```

**Implementation:**
- Add an "Import Cards" button in the Admin Panel.
- Frontend parses the file client-side, shows a preview table with validation errors highlighted.
- On confirm, sends the batch to a new FastAPI endpoint `POST /api/admin/cards/import`.
- Backend validates each card, inserts into Supabase, and returns a summary (e.g., "47 imported, 3 failed").
- Provide downloadable template files (empty CSV and JSON) from the Admin Panel.

**Priority:** 🟡 Medium  
**Effort:** Medium (file parsing + validation + batch insert endpoint)

---

### 3.3 — Card Export for Backup & Sharing

**Proposed Solution:**  
Allow admins to export the full card library (or filtered subsets) as CSV or JSON for:
- Database backups.
- Sharing card sets between Plenary instances.
- Content review in spreadsheets.

**Priority:** 🟡 Medium  
**Effort:** Small (query all cards → format → download)

---

## Phase 4: Feature Enhancements

### 4.1 — Real-Time Community Vouch Feed

Show a subtle live ticker or notification when other users vouch for cards, creating a sense of community activity.

**Example:** A soft toast: *"Someone just vouched for 'What would you attempt...' — 43 voyagers and counting."*

**Priority:** 🟢 Low  
**Effort:** Medium (Supabase Realtime subscription)

---

### 4.2 — Card Categories & Tags Expansion

**Current categories** (hardcoded in `initialData.ts`):
- Existential Inquiry, Solitude & Identity, Career Reinvention, Mortality & Meaning, Creativity & Craft, Deep Relationships, Midlife Reckoning.

**Proposed improvements:**
- Make categories configurable by admins (stored in a `categories` table, not hardcoded).
- Allow cards to have multiple categories/tags.
- Add user-suggested tags that admins can approve.

**Priority:** 🟡 Medium  
**Effort:** Medium

---

### 4.3 — Reflection Sharing & Public Journals

Allow users to optionally share their Socratic reflections publicly (anonymized or attributed), creating a community reflection feed.

**Priority:** 🟢 Low  
**Effort:** Large

---

### 4.4 — Push Notifications & Daily Card

Send users a daily inquiry card via email or push notification — a "Daily Ember" feature (the placeholder text in `TopNav.tsx` already hints at this).

**Priority:** 🟡 Medium  
**Effort:** Medium (cron job on Render + email via Resend or web push)

---

### 4.5 — Enhanced Socratic AI Options

- **Streaming responses** — show AI replies word-by-word instead of waiting for the full response.
- **Reflection summaries** — after 5 turns, generate a concise insight summary.
- **Multi-card reflections** — reflect on multiple vouched cards simultaneously, finding thematic connections.

**Priority:** 🟡 Medium  
**Effort:** Medium–Large

---

### 4.6 — Mobile App (PWA)

Convert the Vite SPA into a Progressive Web App with:
- Offline card viewing (cache the deck).
- Add-to-homescreen prompt.
- Push notification support.

**Priority:** 🟢 Low  
**Effort:** Small (service worker + manifest)

---

### 4.7 — Internationalization (i18n)

Support multiple languages for the UI chrome (buttons, labels, empty states). Card content would remain in English initially, but the framework would allow community translations later.

**Priority:** 🟢 Low  
**Effort:** Medium

---

## Phase 5: Future Vision

These are larger, transformative ideas for Plenary's long-term roadmap:

| Idea | Description |
|---|---|
| **Curated Decks / Playlists** | Allow creators to assemble themed collections of cards (e.g., "Stoic Morning Routine", "Questions for New Parents") that users can subscribe to. |
| **Collaborative Reflections** | Two users reflect on the same card together in a shared Socratic session. |
| **Inquiry Streaks & Gamification** | Track consecutive days of vouching or reflecting, reward with badges or unlocked card packs. |
| **API for Third-Party Integrations** | Public REST API allowing other apps to embed Plenary cards (e.g., in Notion, Obsidian, or journaling apps). |
| **AI-Generated Cards** | Let the AI suggest new inquiry cards based on a user's reflection history and vouch patterns. |
| **Author Verification & Profiles** | Allow living authors (or their estates) to claim and verify their author profiles, adding personal context to their questions. |
| **Monetization: Pro Tier** | Offer a paid tier for unlimited AI reflections, advanced analytics, private deck creation, and priority card submissions. |

---

## Recommended Priority Order

| # | Item | Priority | Effort | Phase |
|---|---|---|---|---|
| 1 | Make vouch counts real | 🔴 Critical | Small | 1 |
| 2 | Remove fake/placeholder text | 🟠 High | Small | 1 |
| 3 | Fix pre-vouched seed cards | 🟠 High | Trivial | 1 |
| 4 | Interactive guided tour | 🟠 High | Medium | 2 |
| 5 | Admin dashboard panel | 🟠 High | Large | 3 |
| 6 | Bulk card import | 🟡 Medium | Medium | 3 |
| 7 | Card export/backup | 🟡 Medium | Small | 3 |
| 8 | Empty state illustrations | 🟡 Medium | Small | 2 |
| 9 | Configurable categories | 🟡 Medium | Medium | 4 |
| 10 | Daily card notifications | 🟡 Medium | Medium | 4 |
| 11 | Streaming AI responses | 🟡 Medium | Medium | 4 |
| 12 | Community vouch feed | 🟢 Low | Medium | 4 |
| 13 | PWA support | 🟢 Low | Small | 4 |
| 14 | Reflection sharing | 🟢 Low | Large | 4 |
| 15 | i18n | 🟢 Low | Medium | 4 |

---

> *"The unexamined app is not worth shipping."* — Plenary Engineering

