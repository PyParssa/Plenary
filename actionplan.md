# Action Plan — Phase 2: First-Time User Experience

> **Based on:** [proposal.md](./proposal.md)  
> **Date:** September 2026  
> **Status:** Complete

---

## Overview

Phase 2 focuses on making the first visit to Plenary intuitive and welcoming. New users currently land with no orientation — they don't know what vouching is, how the 3-second hold works, or what the Vault does. This phase closes that gap with a guided tour and polished empty states.

---

## Feature 2.1 — Interactive Guided Tour

**Priority:** 🟠 High | **Effort:** Medium

### Goal
Walk first-time users through the core mechanics (deck, vouch, vault, reflection, discovery, account) immediately after the Journey Picker completes.

### Tasks

- [x] **Install `driver.js`**
  ```bash
  npm install driver.js
  ```
  Confirm bundle size impact is acceptable (driver.js is ~5 KB gzipped).

- [x] **Create `TourManager.ts`** — a thin wrapper around driver.js that defines all tour steps and exposes `startTour()` / `replayTour()` methods.

  | Step | Target Selector | Popover Message |
  |------|----------------|-----------------|
  | 1 | First card in the deck | *"Welcome to Plenary. Each card holds a question from a great thinker. Swipe through the deck to explore."* |
  | 2 | Vouch button | *"Found a question that resonates? Hold for 3 seconds to vouch. It saves the card to your personal Vault."* |
  | 3 | Vault tab | *"Your Vault holds every question you've vouched for. Return here to reflect on them."* |
  | 4 | Reflection icon (on a card) | *"Tap here to open a Socratic AI conversation. It will challenge your thinking through the lens of this card."* |
  | 5 | Discovery tab | *"Discover authors and categories. Creators can contribute new inquiry cards here."* |
  | 6 | Account tab | *"Set up your account to sync your vouches across devices and unlock AI reflections."* |

- [x] **Wire trigger logic in `App.tsx`**
  - After Journey Picker `onComplete` callback fires, check `localStorage.getItem('plenary_tour_completed')`.
  - If absent → call `startTour()`.
  - On tour completion/skip → set `localStorage.setItem('plenary_tour_completed', 'true')`.

- [x] **Add "Replay Tour" button in Account settings**
  - Calls `replayTour()` and clears the `plenary_tour_completed` flag.

- [x] **Style popovers** to match Plenary's design tokens (dark background, amber accent, rounded corners).

- [x] **Test edge cases**
  - User closes the browser mid-tour → tour restarts from step 1 on next visit (flag not set yet).
  - User is already signed in on first load (no Journey Picker) → trigger tour directly.
  - Tour on mobile viewport — verify popovers don't clip off-screen.

### Files to Create / Modify

| File | Action |
|------|--------|
| `frontend/src/tour/TourManager.ts` | **NEW** — tour step definitions + driver.js wrapper |
| `frontend/src/App.tsx` | **MODIFY** — add tour trigger after Journey Picker completion |
| `frontend/src/components/AccountView.tsx` | **MODIFY** — add "Replay Tour" button |
| `frontend/src/tour/tour.css` (optional) | **NEW** — custom popover styles |

---

## Feature 2.2 — Empty State Illustrations

**Priority:** 🟡 Medium | **Effort:** Small

### Goal
Replace blank screens with friendly, on-brand illustrations and clear calls-to-action when there is no content to display.

### Tasks

- [x] **Design / source 3 illustrations** (SVG preferred for scalability)
  - `empty-vault.svg` — evocative of an open, waiting space.
  - `no-results.svg` — search icon with a subtle "not found" treatment.
  - `empty-reflections.svg` — a quiet, contemplative visual.

- [x] **Place assets** in `frontend/public/assets/empty-states/`.

- [x] **Implement `EmptyState` component** (`frontend/src/components/EmptyState.tsx`)
  - Props: `illustration`, `headline`, `subtext`, `ctaLabel?`, `onCta?`.

- [x] **Wire empty states in views**

  | View / Condition | Headline | Subtext | CTA |
  |------------------|----------|---------|-----|
  | Vault — no vouched cards | *"Your vault is waiting."* | *"Explore the deck and hold on a question that moves you."* | **Go to Deck** |
  | Vault — search returns no results | *"Nothing matches your search."* | *"Try a different phrase or browse all vouched cards."* | — |
  | Reflection history — no reflections yet | *"Your first reflection is one question away."* | *"Start a Socratic conversation from any card in your deck."* | **Open Deck** |

- [x] **Remove existing bare `<p>` placeholder text** in Vault and Reflection views.

### Files to Create / Modify

| File | Action |
|------|--------|
| `frontend/src/components/EmptyState.tsx` | **NEW** — reusable empty-state component |
| `frontend/public/assets/empty-states/` | **NEW** — illustration assets |
| `frontend/src/components/VaultView.tsx` | **MODIFY** — render `<EmptyState>` when vault is empty or search returns nothing |
| `frontend/src/components/ReflectionView.tsx` | **MODIFY** — render `<EmptyState>` when reflection history is empty |

---

## Acceptance Criteria

### 2.1 Guided Tour
- [x] Tour launches automatically on the very first visit to the app, after the Journey Picker.
- [x] Tour does **not** launch on subsequent visits (localStorage flag persists).
- [x] "Replay Tour" is accessible from the Account settings and works correctly.
- [x] All 6 popovers render without clipping on both desktop and mobile.
- [x] Tour can be dismissed at any step (skip button) without breaking the app state.

### 2.2 Empty States
- [x] Empty Vault shows illustration + "Go to Deck" CTA that navigates correctly.
- [x] Vault search with no results shows the appropriate empty state (no CTA needed).
- [x] Empty Reflection history shows illustration + "Open Deck" CTA.
- [x] No raw placeholder `<p>` text remains in the shipped UI.

---

## Testing Checklist

- [ ] Clear `localStorage` and reload — tour fires automatically.
- [ ] Complete tour → reload → tour does **not** fire.
- [ ] Vouch all cards, remove all vouches, open Vault — empty state appears.
- [ ] Search for a nonsense string in Vault — "no results" empty state appears.
- [ ] Open Reflections tab with no prior reflections — empty state appears.
- [ ] Replay Tour from Account settings — tour restarts from step 1.
- [ ] Verify on Chrome, Firefox, and Safari.
- [ ] Verify on viewport widths: 375 px (mobile), 768 px (tablet), 1280 px (desktop).

---

## Estimated Timeline

| Task | Estimate |
|------|----------|
| Install driver.js + `TourManager.ts` | 2 h |
| Tour trigger wiring in `App.tsx` | 1 h |
| Tour popover styling | 1.5 h |
| "Replay Tour" in Account settings | 0.5 h |
| `EmptyState` component + illustrations | 2 h |
| Wire empty states in all 3 views | 1 h |
| Testing & fixes | 2 h |
| **Total** | **~10 h** |

---

> *"A first impression is a product decision."*

