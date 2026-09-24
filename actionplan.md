# Action Plan: Discovery — Author Persona Cards & Category Cards → Custom Deck

## Overview

Replace the current "Creator & Publisher Board" author profile grid in the Discovery tab with two engaging card-based sections:

1. **Author Persona Cards** — e.g. "What would Steve Jobs ask you?", "What would Naval ask you?" — each card carries a signature voice/question teaser for that thinker.
2. **Category Cards** — thematic life-context cards like "Career Change", "Life Decision", "Relationships", "Mortality & Meaning", etc.

When a user clicks any card (author or category), they are taken to a **custom filtered deck** view — NOT the main shuffled deck. The filtered deck shows only cards belonging to that author or category, with a back button to return to Discovery.

---

## Current State Analysis

### Key Files
| File | Role |
|------|------|
| `frontend/src/components/DiscoveryView.tsx` | The Discovery tab UI — currently shows author bios + "View Cards" / "Contribute Card" buttons |
| `frontend/src/App.tsx` | Root state — manages `activeTab`, `cards`, `selectedLifeStage`; handlers `handleSelectDiscoveryAuthor` / `handleSelectDiscoveryCategory` switch to `deck` tab but don't carry filter state into the deck |
| `frontend/src/components/DeckView.tsx` | Card-swipe deck — receives a `cards[]` array and renders them; has no built-in filtering UI |
| `frontend/src/types.ts` | Defines `LifeStage`, `QuestionCard`, `AuthorProfile`, `ActiveTab` |
| `frontend/src/data/initialData.ts` | `INITIAL_AUTHORS` (6 classical authors) + `INITIAL_QUESTIONS` (8 seed cards) |

### Current Problems
- Clicking "View Cards" in Discovery calls `handleSelectDiscoveryAuthor(name)` → resets `selectedLifeStage` to `'All Inquiries'` and navigates to main deck — **no filter is actually applied**
- Same for category buttons — `handleSelectDiscoveryCategory` resets to `'All Inquiries'`
- The author cards show bios & books published — feels like a directory, not an engaging "what would X ask you?" hook
- No modern author/thinker personas (Steve Jobs, Naval, etc.)

---

## Plan

### Step 1 — Add New Author Personas & Category Definitions

**File:** `frontend/src/data/discoveryData.ts` (new file)

Create a dedicated data file with two typed arrays:

#### 1a. `DiscoveryAuthorCard` interface + `DISCOVERY_AUTHORS` array

Each persona has:
- `id`, `name`, `avatarUrl`
- `tagline` — "What would Naval ask you?"
- `signatureQuestion` — teaser question shown on card face
- `description` — one-liner about this thinker's lens
- `filterKey` — the author name string to match against `QuestionCard.author`
- `accentColor` — subtle background hex for the card

Authors to include:
| Name | Lens | filterKey |
|------|------|-----------|
| Steve Jobs | Design, craft, mortality | `"Steve Jobs"` |
| Naval Ravikant | Wealth, happiness, leverage | `"Naval Ravikant"` |
| Viktor Frankl | Meaning, suffering | `"Viktor Frankl"` |
| Marcus Aurelius | Stoic duty, impermanence | `"Marcus Aurelius"` |
| Paul Graham | Startups, taste, honesty | `"Paul Graham"` |
| Seneca | Time scarcity, tranquility | `"Seneca"` |
| Mary Oliver | Attention, wildness, presence | `"Mary Oliver"` |

#### 1b. `DiscoveryCategoryCard` interface + `DISCOVERY_CATEGORIES` array

Each category has:
- `id`, `label`, `emoji`, `tagline`, `description`
- `filterKey: LifeStage` — maps directly to existing `QuestionCard.category` values
- `accentColor`

Categories to include:
| Label | Emoji | filterKey (LifeStage) |
|-------|-------|-----------------------|
| Career Change | 🧭 | `'Career Reinvention'` |
| Life Decision | ⚖️ | `'Existential Inquiry'` |
| Relationships | 🤝 | `'Deep Relationships'` |
| Who Am I? | 🪞 | `'Solitude & Identity'` |
| Creative Life | 🎨 | `'Creativity & Craft'` |
| Midlife Reckoning | 🌅 | `'Midlife Reckoning'` |
| Mortality & Meaning | 🕯️ | `'Mortality & Meaning'` |

---

### Step 2 — Add Seed Cards for New Author Personas

**File:** `frontend/src/data/initialData.ts` (edit)

Add 2–3 `QuestionCard` entries per new author so clicking their Discovery card shows a populated deck immediately.

**Steve Jobs cards:**
- Category: `'Career Reinvention'` and `'Creativity & Craft'`
- Sources: Stanford Commencement 2005, Isaacson biography
- Example question: *"If today were the last day of your life, would you want to do what you're about to do today?"*

**Naval Ravikant cards:**
- Category: `'Existential Inquiry'` and `'Solitude & Identity'`
- Source: *The Almanack of Naval Ravikant*
- Example question: *"Are you working on something that compounds, or just keeping busy?"*

**Paul Graham cards:**
- Category: `'Career Reinvention'` and `'Creativity & Craft'`
- Source: Essays (paulgraham.com)
- Example question: *"What problem are you working on that most people think is too small or too weird to matter?"*

> [!CAUTION]
> After adding these cards, bump `plenary_data_version` in `App.tsx` from `'4'` to `'5'` **only if** you want returning users to receive the refreshed seed data (this clears their local card cache). If you want to preserve existing user data, skip the version bump — new cards will only appear for first-time users.

---

### Step 3 — Add `discoveryFilter` State to App.tsx

**File:** `frontend/src/App.tsx` (edit)

#### 3a. Add state
```ts
const [discoveryFilter, setDiscoveryFilter] = useState<
  | { type: 'author'; key: string; label: string }
  | { type: 'category'; key: LifeStage; label: string }
  | null
>(null);
```

#### 3b. Replace both handler functions
```ts
// Replace handleSelectDiscoveryAuthor
const handleSelectDiscoveryAuthor = (authorKey: string, label: string) => {
  setDiscoveryFilter({ type: 'author', key: authorKey, label });
  setActiveTab('deck');
};

// Replace handleSelectDiscoveryCategory
const handleSelectDiscoveryCategory = (categoryKey: LifeStage, label: string) => {
  setDiscoveryFilter({ type: 'category', key: categoryKey, label });
  setActiveTab('deck');
};

// Add clear handler
const handleClearDiscoveryFilter = () => {
  setDiscoveryFilter(null);
};
```

#### 3c. Clear filter on tab change
In `handleTabChange`, call `setDiscoveryFilter(null)` when switching away from `'deck'`.

#### 3d. Pass props to DeckView and DiscoveryView
- DeckView: add `discoveryFilter={discoveryFilter}` and `onClearDiscoveryFilter={handleClearDiscoveryFilter}`
- DiscoveryView: remove `authors={authors}` prop; update `onSelectAuthorFilter` and `onSelectCategory` to new 2-arg signatures

---

### Step 4 — Update DeckView.tsx for Filtered Mode

**File:** `frontend/src/components/DeckView.tsx` (edit)

#### 4a. Update props interface
```ts
interface DeckViewProps {
  // existing props...
  discoveryFilter?: { type: 'author' | 'category'; key: string; label: string } | null;
  onClearDiscoveryFilter?: () => void;
}
```

#### 4b. Compute filtered cards at component top
```ts
const visibleCards = (() => {
  const published = cards.filter((c) => c.published !== false);
  if (!discoveryFilter) return published;
  if (discoveryFilter.type === 'author') {
    const key = discoveryFilter.key.toLowerCase();
    return published.filter((c) => c.author.toLowerCase().includes(key));
  }
  if (discoveryFilter.type === 'category') {
    return published.filter((c) => c.category === discoveryFilter.key);
  }
  return published;
})();
```

#### 4c. Add filter banner UI (rendered when `discoveryFilter` is set)
- Shows: `Showing N cards for "Steve Jobs"` + `[× Clear Filter]` button
- Positioned above the card stack
- Clicking Clear calls `onClearDiscoveryFilter()`

#### 4d. Update empty state
When filtered deck is empty, show: *"No cards found for '[label]'. Explore Discovery to find more voices."* with a "Back to Discovery" button that calls `onClearDiscoveryFilter()` then navigates to discovery tab.

---

### Step 5 — Rewrite DiscoveryView.tsx

**File:** `frontend/src/components/DiscoveryView.tsx` (rewrite)

#### 5a. Update props interface
```ts
interface DiscoveryViewProps {
  cards: QuestionCard[];
  canCreateCards: boolean;
  onAddCustomCard: (newCard: Omit<QuestionCard, 'id' | 'vouched' | 'vouchCount'>) => void;
  onSelectAuthorFilter: (authorKey: string, label: string) => void;
  onSelectCategory: (categoryKey: LifeStage, label: string) => void;
}
```
Drop `authors: AuthorProfile[]` — author data comes from `DISCOVERY_AUTHORS` in `discoveryData.ts`.

#### 5b. Page layout structure
```
Discovery Page
├── Header ("Discovery" title + "Craft Card" button for creators)
│
├── Section A: "Voices" — Author Persona Cards
│   ├── Eyebrow: "What would they ask you?"
│   └── Horizontal scroll on mobile / 3-col grid on desktop
│       └── AuthorPersonaCard × N
│
└── Section B: "Explore by Theme" — Category Cards
    ├── Eyebrow: "Choose your terrain"
    └── 2–3 column grid
        └── CategoryCard × N
```

#### 5c. AuthorPersonaCard UI (per card)
- Background: `author.accentColor`
- Avatar: `64px` circle with `onError` fallback to `/assets/default-avatar.svg`
- Eyebrow text: `author.tagline` in `text-[11px] uppercase tracking-widest`
- Signature question: `font-serif-clean italic text-base line-clamp-2`
- Description: `text-[11px] text-[#14213d]/60`
- Footer: card count badge (left) + "Enter Deck →" button (right)
- Full card is clickable → `onSelectAuthorFilter(author.filterKey, author.name)`

**Card count:** computed as `cards.filter(c => c.author.toLowerCase().includes(author.filterKey.toLowerCase())).length`

#### 5d. CategoryCard UI (per card)
- Background: `cat.accentColor`
- Large emoji (`text-3xl`)
- Label: `text-sm font-bold`
- Tagline: `text-[11px] font-semibold text-[#14213d]/60`
- Description: `text-[10px] text-[#14213d]/50 line-clamp-2`
- Full card clickable → `onSelectCategory(cat.filterKey, cat.label)`
- Hover: subtle shadow + border darkening

#### 5e. Keep "Craft an Illuminating Card" modal
Preserve the entire existing modal form code unchanged. Only the trigger button moves to the page header area.

---

## Files Changed Summary

| Action | File | Description |
|--------|------|-------------|
| **Create** | `frontend/src/data/discoveryData.ts` | `DISCOVERY_AUTHORS` + `DISCOVERY_CATEGORIES` typed arrays |
| **Edit** | `frontend/src/data/initialData.ts` | Add Steve Jobs, Naval, Paul Graham seed cards; optionally bump data version |
| **Edit** | `frontend/src/App.tsx` | Add `discoveryFilter` state; update handler signatures; pass new props to DeckView/DiscoveryView; clear filter on tab switch |
| **Edit** | `frontend/src/components/DeckView.tsx` | Add filter props; compute filtered cards; add filter banner; update empty state |
| **Rewrite** | `frontend/src/components/DiscoveryView.tsx` | Author persona cards section + category cards grid; updated props; keep Craft modal |

---

## Implementation Order

```
1. discoveryData.ts          — pure data, no deps
2. initialData.ts            — add seed cards
3. App.tsx state + handlers  — wire up filter state
4. DeckView.tsx              — add filter support
5. DiscoveryView.tsx         — full UI rewrite
6. App.tsx props             — connect everything
```

---

## Key Design Decisions

> [!IMPORTANT]
> The filtered deck is NOT a new tab or route — it reuses the existing `deck` tab with a `discoveryFilter` prop overlay. No routing changes required; architecture stays flat.

> [!NOTE]
> Author card filtering uses `c.author.toLowerCase().includes(key.toLowerCase())` — the same fuzzy match logic from `isAuthorMatch()` in the current DiscoveryView can be extracted to `frontend/src/lib/utils.ts` and shared between DeckView and DiscoveryView.

> [!TIP]
> Author persona cards on mobile: use `flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2` so the row is horizontally swipeable. On desktop (`md:`): switch to `grid grid-cols-3 gap-5`.

> [!TIP]
> Avatar images for Steve Jobs, Naval, Paul Graham — use Wikipedia Commons / reliable CDN URLs, or Unsplash placeholder silhouettes until sourced. Always add `onError` fallback to `/assets/default-avatar.svg`.
