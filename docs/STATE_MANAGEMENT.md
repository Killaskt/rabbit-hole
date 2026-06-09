# STATE_MANAGEMENT.md — Rabbit Hole

No state library. The app uses three patterns:

1. **In-memory singleton** — `gameState.ts` (XP, level, achievements)
2. **In-memory session store** — `sessionStore.ts` (passes lesson data between screens)
3. **Persistent storage** — `storage.ts` (AsyncStorage/SecureStore → Capacitor Preferences)

---

## 1. GameState (in-memory singleton persisted to storage)

**Source:** `lib/gameState.ts`

### Lifecycle
1. App starts → `initGameState()` loads from Preferences key `rh_game_state`
2. Screens call `getGameState()` to read
3. `recordSession()` or `recordDrill()` mutate `_state` + save back to Preferences
4. No event system — screens re-fetch state by calling `getGameState()` after mutations

### Key functions

```ts
initGameState(): Promise<GameState>     // load from storage, merge with defaults
getGameState(): GameState               // return current in-memory state
recordSession(opts): Promise<{ xp, newAchievements, levelUp }>
recordDrill(correct, total): Promise<{ xpEarned, newAchievements }>
getLevelProgress(totalXP): { level, levelName, progress, xpInLevel, xpForNextLevel }
getLevelFromXP(totalXP): number         // 1–10
```

### XP calculation (recordSession)
- `sessionBase`: 50 (skim) or 100 (deep_dive)
- `quizBonus`: quizScore × 25
- `perfectBonus`: 50 if quizScore === 2, else 0
- `streakBonus`: 25 if streak >= 3 days, else 0
- Total = sum of above

### Streak logic
- If `lastSessionDate !== today`:
  - If `lastSessionDate === yesterday` → increment streak
  - Else → reset streak to 1
  - Update `longestStreak` if current beats it
  - Set `lastSessionDate = today`

### Level system
10 levels. XP thresholds (cost per level): `[0, 150, 300, 500, 750, 1100, 1500, 2100, 3000, 4200]`
Progress within a level = `remaining / needed`

### Achievement checks (in recordSession)
| ID | Condition |
|----|-----------|
| `first_trace` | totalSessions >= 1 |
| `first_recall` | totalDrills >= 1 |
| `mind_breach` | totalSessions >= 5 |
| `quiz_ace` | quizScore === 2 (this session) |
| `perfect_recall` | drill perfect (score === total, total > 0) |
| `deep_diver` | totalDeepDives >= 3 |
| `phantom_streak` | currentStreak >= 3 |
| `void_walker` | totalSessions >= 25 |
| `recall_veteran` | totalDrills >= 10 |
| `knowledge_vault` | todaySessions >= 10 |
| `shadow_agent` | level >= 5 |
| `rabbit_king` | level >= 10 |

### Drill XP (recordDrill)
- 15 XP per correct answer
- bonus 25 if perfect (score === total AND total > 0)
- Triggers `first_recall`, `perfect_recall`, `recall_veteran` achievement checks

### Capacitor migration notes
- Remove `import { saveGameState, loadGameState } from './storage'` — rewrite to use inline Preferences calls
- Or keep the same indirection and just change `storage.ts`
- No RN-specific imports in gameState.ts (pure logic), should port with minimal changes

---

## 2. Session Store (in-memory, ephemeral)

**Source:** `lib/sessionStore.ts`

Pure in-memory module. No RN dependencies — port as-is.

```ts
setCurrentSession(lesson, mode, title, sourceType)   // called after AI generates lesson
getCurrentSession(): { lesson, mode, title, sourceType, cardResults }
addCardResult('right' | 'left')                      // maps to 'acquired' | 'noted'
clearCurrentSession()                                // called after results saved
```

Data flows: NewSessionScreen → setCurrentSession → SessionScreen → addCardResult × N → QuizScreen → ResultsScreen → clearCurrentSession

---

## 3. Persistent Storage (storage.ts)

**Source:** `lib/storage.ts`

### Capacitor rewrite plan

Replace all `AsyncStorage` calls with `@capacitor/preferences`:

```ts
// Before (RN):
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem(key, value);
const { value } = await AsyncStorage.getItem(key);

// After (Capacitor):
import { Preferences } from '@capacitor/preferences';
await Preferences.set({ key, value });
const { value } = await Preferences.get({ key });
await Preferences.remove({ key });
```

Replace `expo-secure-store` with Preferences using `secure_` prefix:

```ts
// Before (RN):
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('rh_apikey_anthropic', key);

// After (Capacitor):
await Preferences.set({ key: 'secure_rh_apikey_anthropic', value: key });
```

### All exported functions (port all, change implementation)

```ts
// API keys
getApiKey(provider): Promise<string | null>
setApiKey(key, provider): Promise<void>
deleteApiKey(provider): Promise<void>

// Game state
saveGameState(state): Promise<void>
loadGameState(): Promise<object | null>

// Sessions
loadSessions(): Promise<SessionRecord[]>
addSession(session): Promise<void>       // prepend, cull to 50 max (keep pinned)
getSessionById(id): Promise<SessionRecord | null>
pinSession(id, pinned): Promise<void>

// Paused session
savePausedSession(s): Promise<void>
loadPausedSession(): Promise<PausedSession | null>
clearPausedSession(): Promise<void>

// Model preference
getPreferredModel(): Promise<ModelId>
setPreferredModel(model): Promise<void>

// Drill dismissed questions  
getDismissedQuestions(): Promise<string[]>
dismissQuestion(qText): Promise<void>

// Swipe hint (shown once)
hasSeenSwipeHint(): Promise<boolean>
markSwipeHintSeen(): Promise<void>
```

### Session culling logic
When adding a new session:
1. Prepend to array
2. Split into pinned and unpinned
3. Unpinned: keep at most `max(50 - pinned.length, 10)` items
4. Merge and save

---

## 4. Text Settings (textSettings.tsx)

**Source:** `lib/textSettings.tsx`

React Context providing accessibility text scaling. Uses AsyncStorage for persistence.

```ts
SCALE_STEPS = [1, 1.15, 1.3]     // multiplied with font sizes
SCALE_LABELS = ['NORMAL', 'LARGE', 'X-LARGE']
```

### Context shape
```ts
interface TextSettingsCtx {
  scale: number;         // current multiplier
  scaleIndex: number;    // 0, 1, or 2
  scaleLabel: string;    // 'NORMAL', etc.
  bold: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  setScaleIndex(i: number): void;
  toggleBold(): void;
}
```

### Capacitor migration
- Replace `AsyncStorage` with `Preferences`
- Replace `import React` → not needed (React 19 jsx transform)
- Everything else ports as-is
