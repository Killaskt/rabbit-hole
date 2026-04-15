# THEME_UTILS.md — Rabbit Hole

Design tokens, color palette, typography, and utility constants.

---

## Color Palette

All screens use a dark, minimal, terminal-inspired aesthetic.

### Core Colors
```css
--bg:             #000000   /* pure black background */
--bg-card:        rgba(18, 18, 18, 0.90)   /* glassmorphism card fill */
--bg-card-subtle: rgba(18, 18, 18, 0.85)
--bg-sunken:      rgba(10, 10, 10, 0.80)   /* locked/dimmed card */
--border:         rgba(255, 255, 255, 0.10) /* default card border */
--border-subtle:  rgba(255, 255, 255, 0.05)
--border-strong:  rgba(255, 255, 255, 0.35) /* active toggle, current level */

--text-primary:   #ffffff
--text-secondary: #cccccc
--text-muted:     #888888
--text-subtle:    #555555
--text-dim:       #444444
--text-ghost:     #333333
--text-locked:    #2a2a2a
--text-invisible: #1e1e1e   /* locked achievement text */

--accent:         #efff00   /* neon yellow — CTA, active states, XP, pins */
--accent-pressed: #d4e600   /* pressed dive button */
--accent-bg:      rgba(239, 255, 0, 0.06)   /* correct answer bg */
--accent-border:  rgba(239, 255, 0, 0.25)   /* top tag border */

--error:          #f87171   /* wrong answer, error text */
--error-bg:       rgba(248, 113, 113, 0.06)
--correct-flash:  rgba(74, 222, 128, 0.08)  /* green flash on correct */
--error-flash:    rgba(248, 113, 113, 0.08) /* red flash on wrong */

--tab-bar-bg:     #080808   /* tab bar background */
--tab-bar-border: rgba(255, 255, 255, 0.07)
```

### Usage Rules
- Background is always `#000`
- All cards use `--bg-card` with `--border` — never use solid colors
- Accent yellow is used sparingly: primary CTA buttons, XP values, active/pinned states
- Text hierarchy: primary → secondary → muted → subtle → dim → ghost → locked
- Never use white as a background

---

## Typography

### Font Family
```css
font-family: 'Courier New', Courier, monospace;
```

In RN this was `Platform.select({ ios: 'Courier New', android: 'monospace' })`. In web, the CSS declaration above covers all platforms.

### Type Scale (reference sizes, before accessibility multiplier)

| Use | Size | Weight | Spacing | Color |
|-----|------|--------|---------|-------|
| Screen title | 24px | 700 | 2px | primary |
| Level name / XP total | 22px | 700 | 2px | primary |
| Card title | 16px | 700 | 0.5px | primary |
| Dive button text | 16px | 700 | 2px | black (on yellow) |
| Card body | 14px | 400 | 0.3px | secondary |
| Session title (recent) | 13px | 400 | — | secondary |
| Session title (old) | 13px | 400 | — | subtle |
| Header label (// RABBIT HOLE) | 13px | 400 | 2px | subtle |
| Toggle text | 13px | 700 | 1.5px | dim (inactive) / primary (active) |
| Subtitle / description | 12px | 400 | 1px | dim |
| Section label (// RECENT TRACES) | 11px | 400 | 2px | dim |
| Tab label | 11px | 400 | 2px | dim (inactive) / primary (active) |
| Meta text (mode/score/date) | 10px | 400 | 1px | dim |
| Stat label | 9px | 400 | 1.5px | dim |
| Level number / progress | 9–10px | 400 | 2px | dim |

### Accessibility Multiplier
All text sizes that display content (not fixed UI labels) get multiplied by `useTextSettings().scale`:
- `SCALE_STEPS = [1, 1.15, 1.3]`
- Applied by multiplying base font size: `fontSize: 13 * scale`
- Bold mode applies `fontWeight: '700'` to select elements

---

## Spacing

No formal spacing scale — values are ad-hoc but consistent:
- Screen padding: `20px` horizontal, `40px` bottom
- Card padding: `20px` (level card), `28px` (swipe card), `14–16px` (small cards)
- Card border-radius: `12–16px` (cards), `10–14px` (buttons), `4px` (tags/pills)
- Section gap: `28px` between major sections
- Row gap: `10–12px` between items in a list
- Card gap: `10px` between stat boxes, achievement cards

---

## Elevation / Shadows (RN → CSS)

RN shadows:
```ts
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.6,
shadowRadius: 20,
elevation: 10,
```

CSS equivalent:
```css
box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
```

Only the SwipeCard and a few modals use shadows. Most cards rely on border + bg for depth.

---

## Level System Constants

```ts
const LEVEL_NAMES = [
  'GHOST', 'PHANTOM', 'SPECTER', 'ORACLE', 'ARCHITECT',
  'SHADOW', 'CIPHER', 'NEXUS', 'VOID', 'RABBIT KING',
];

const LEVEL_ICONS = ['○', '◌', '◎', '◐', '◑', '◍', '◈', '◉', '◆', '★'];

// XP cost per level (not cumulative — each level costs this much)
const LEVEL_XP = [0, 150, 300, 500, 750, 1100, 1500, 2100, 3000, 4200];
```

---

## Achievement Definitions

```ts
const ALL_ACHIEVEMENTS = [
  { id: 'first_trace',     name: 'FIRST TRACE',     desc: 'Complete your first rabbit hole',  icon: '◎' },
  { id: 'first_recall',    name: 'FIRST RECALL',     desc: 'Complete your first recall drill', icon: '◌' },
  { id: 'mind_breach',     name: 'MIND BREACH',      desc: 'Complete 5 rabbit holes',          icon: '◈' },
  { id: 'quiz_ace',        name: 'QUIZ ACE',         desc: 'Get a perfect quiz score',         icon: '◆' },
  { id: 'perfect_recall',  name: 'PERFECT RECALL',   desc: 'Score 100% on a recall drill',     icon: '◍' },
  { id: 'deep_diver',      name: 'DEEP DIVER',       desc: 'Complete 3 deep dive sessions',    icon: '▼' },
  { id: 'phantom_streak',  name: 'PHANTOM STREAK',   desc: 'Maintain a 3-day streak',          icon: '▲' },
  { id: 'void_walker',     name: 'VOID WALKER',      desc: 'Complete 25 rabbit holes',         icon: '◉' },
  { id: 'recall_veteran',  name: 'RECALL VETERAN',   desc: 'Complete 10 recall drills',        icon: '◎' },
  { id: 'knowledge_vault', name: 'KNOWLEDGE VAULT',  desc: 'Complete 10 sessions in one day',  icon: '▣' },
  { id: 'shadow_agent',    name: 'SHADOW AGENT',     desc: 'Reach level 5',                    icon: '◐' },
  { id: 'rabbit_king',     name: 'RABBIT KING',      desc: 'Reach level 10',                   icon: '◑' },
];
```

---

## Unicode Symbols Used

| Symbol | Usage |
|--------|-------|
| ◎ | Dive button, level icon, achievement |
| ◆ ◇ | Pinned (filled) / unpinned (outline) sessions |
| ◈ | Recall button, achievement |
| ★ | Top level icon |
| ◐ ◑ ◌ ◍ ◉ | Level icons |
| ▼ ▲ ▣ | Achievement icons |
| ← → ↑ | Navigation arrows, share |
| ◔ | Paused trace badge |
| ♛ | Completed level check |
| ✓ ✗ | Correct/wrong quiz marks |
| ◀ | "HERE" marker in level list |

These all render fine in web browsers. No icon library needed.
