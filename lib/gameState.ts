import { saveGameState, loadGameState } from './storage';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlockedAt?: number;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_trace',     name: 'FIRST TRACE',     desc: 'Complete your first rabbit hole',       icon: '◎' },
  { id: 'first_recall',    name: 'FIRST RECALL',     desc: 'Complete your first recall drill',      icon: '◌' },
  { id: 'mind_breach',     name: 'MIND BREACH',      desc: 'Complete 5 rabbit holes',               icon: '◈' },
  { id: 'quiz_ace',        name: 'QUIZ ACE',         desc: 'Get a perfect quiz score',              icon: '◆' },
  { id: 'perfect_recall',  name: 'PERFECT RECALL',   desc: 'Score 100% on a recall drill',          icon: '◍' },
  { id: 'deep_diver',      name: 'DEEP DIVER',       desc: 'Complete 3 deep dive sessions',         icon: '▼' },
  { id: 'phantom_streak',  name: 'PHANTOM STREAK',   desc: 'Maintain a 3-day streak',               icon: '▲' },
  { id: 'void_walker',     name: 'VOID WALKER',      desc: 'Complete 25 rabbit holes',              icon: '◉' },
  { id: 'recall_veteran',  name: 'RECALL VETERAN',   desc: 'Complete 10 recall drills',             icon: '◎' },
  { id: 'knowledge_vault', name: 'KNOWLEDGE VAULT',  desc: 'Complete 10 sessions in one day',       icon: '▣' },
  { id: 'shadow_agent',    name: 'SHADOW AGENT',     desc: 'Reach level 5',                         icon: '◐' },
  { id: 'rabbit_king',     name: 'RABBIT KING',      desc: 'Reach level 10',                        icon: '◑' },
];

export const LEVEL_NAMES = [
  'GHOST', 'PHANTOM', 'SPECTER', 'ORACLE', 'ARCHITECT',
  'SHADOW', 'CIPHER', 'NEXUS', 'VOID', 'RABBIT KING',
];

// XP thresholds per level (cumulative cost to level up)
const LEVEL_XP = [0, 150, 300, 500, 750, 1100, 1500, 2100, 3000, 4200];

export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    const cumulative = LEVEL_XP.slice(0, i + 1).reduce((a, b) => a + b, 0);
    if (totalXP >= cumulative && i > 0) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 10);
}

export function getLevelProgress(totalXP: number): {
  level: number;
  levelName: string;
  progress: number;
  xpInLevel: number;
  xpForNextLevel: number;
} {
  let remaining = totalXP;
  let level = 1;

  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (i === 0) continue;
    const needed = LEVEL_XP[i];
    if (remaining < needed) {
      return {
        level,
        levelName: LEVEL_NAMES[level - 1],
        progress: remaining / needed,
        xpInLevel: remaining,
        xpForNextLevel: needed,
      };
    }
    remaining -= needed;
    level = i + 1;
  }

  return {
    level: 10,
    levelName: LEVEL_NAMES[9],
    progress: 1,
    xpInLevel: remaining,
    xpForNextLevel: LEVEL_XP[9],
  };
}

export interface GameState {
  totalXP: number;
  totalSessions: number;
  totalDeepDives: number;
  lastSessionDate: string | null;
  currentStreak: number;
  longestStreak: number;
  achievements: string[];
  perfectQuizzes: number;
  todaySessions: number;
  todayDate: string | null;
  totalDrills: number;
  perfectDrills: number;
  totalDrillCorrect: number;
  totalDrillQuestions: number;
}

export const DEFAULT_GAME_STATE: GameState = {
  totalXP: 0,
  totalSessions: 0,
  totalDeepDives: 0,
  lastSessionDate: null,
  currentStreak: 0,
  longestStreak: 0,
  achievements: [],
  perfectQuizzes: 0,
  todaySessions: 0,
  todayDate: null,
  totalDrills: 0,
  perfectDrills: 0,
  totalDrillCorrect: 0,
  totalDrillQuestions: 0,
};

let _state: GameState = { ...DEFAULT_GAME_STATE };

export async function initGameState(): Promise<GameState> {
  const saved = await loadGameState();
  if (saved) {
    _state = { ...DEFAULT_GAME_STATE, ...(saved as GameState) };
  }
  return _state;
}

export function getGameState(): GameState {
  return _state;
}

export interface XPBreakdown {
  sessionBase: number;
  quizBonus: number;
  perfectBonus: number;
  streakBonus: number;
  total: number;
}

export async function recordSession(opts: {
  mode: 'skim' | 'deep_dive';
  quizScore: number;
}): Promise<{
  xp: XPBreakdown;
  newAchievements: Achievement[];
  levelUp: boolean;
}> {
  const today = new Date().toISOString().split('T')[0];
  const prevLevel = getLevelFromXP(_state.totalXP);

  // XP breakdown
  const sessionBase = opts.mode === 'deep_dive' ? 100 : 50;
  const quizBonus = opts.quizScore * 25;
  const perfectBonus = opts.quizScore === 2 ? 50 : 0;

  // Streak logic
  let streakBonus = 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (_state.lastSessionDate !== today) {
    if (_state.lastSessionDate === yesterdayStr) {
      _state.currentStreak += 1;
    } else {
      _state.currentStreak = 1;
    }
    _state.longestStreak = Math.max(_state.currentStreak, _state.longestStreak);
    _state.lastSessionDate = today;
  }
  if (_state.currentStreak >= 3) streakBonus = 25;

  // Today's session count
  if (_state.todayDate !== today) {
    _state.todaySessions = 0;
    _state.todayDate = today;
  }
  _state.todaySessions += 1;

  const total = sessionBase + quizBonus + perfectBonus + streakBonus;
  _state.totalXP += total;
  _state.totalSessions += 1;
  if (opts.mode === 'deep_dive') _state.totalDeepDives += 1;
  if (opts.quizScore === 2) _state.perfectQuizzes += 1;

  // Achievement checks
  const newAchievements: Achievement[] = [];
  for (const ach of ALL_ACHIEVEMENTS) {
    if (_state.achievements.includes(ach.id)) continue;
    let unlocked = false;
    switch (ach.id) {
      case 'first_trace':     unlocked = _state.totalSessions >= 1; break;
      case 'mind_breach':     unlocked = _state.totalSessions >= 5; break;
      case 'void_walker':     unlocked = _state.totalSessions >= 25; break;
      case 'quiz_ace':        unlocked = opts.quizScore === 2; break;
      case 'deep_diver':      unlocked = _state.totalDeepDives >= 3; break;
      case 'phantom_streak':  unlocked = _state.currentStreak >= 3; break;
      case 'knowledge_vault': unlocked = _state.todaySessions >= 10; break;
      case 'shadow_agent':    unlocked = getLevelFromXP(_state.totalXP) >= 5; break;
      case 'rabbit_king':     unlocked = getLevelFromXP(_state.totalXP) >= 10; break;
    }
    if (unlocked) {
      _state.achievements.push(ach.id);
      newAchievements.push({ ...ach, unlockedAt: Date.now() });
    }
  }

  const levelUp = getLevelFromXP(_state.totalXP) > prevLevel;
  await saveGameState(_state);

  return {
    xp: { sessionBase, quizBonus, perfectBonus, streakBonus, total },
    newAchievements,
    levelUp,
  };
}

const XP_PER_CORRECT_DRILL = 15;

export async function recordDrill(score: number, total: number): Promise<{
  xpEarned: number;
  newAchievements: Achievement[];
}> {
  const xpEarned = score * XP_PER_CORRECT_DRILL;
  _state.totalXP += xpEarned;
  _state.totalDrills += 1;
  _state.totalDrillCorrect += score;
  _state.totalDrillQuestions += total;
  if (score === total && total > 0) _state.perfectDrills += 1;

  const newAchievements: Achievement[] = [];
  for (const ach of ALL_ACHIEVEMENTS) {
    if (_state.achievements.includes(ach.id)) continue;
    let unlocked = false;
    switch (ach.id) {
      case 'first_recall':   unlocked = _state.totalDrills >= 1; break;
      case 'perfect_recall': unlocked = score === total && total > 0; break;
      case 'recall_veteran': unlocked = _state.totalDrills >= 10; break;
    }
    if (unlocked) {
      _state.achievements.push(ach.id);
      newAchievements.push({ ...ach, unlockedAt: Date.now() });
    }
  }

  await saveGameState(_state);
  return { xpEarned, newAchievements };
}

export function getAllAchievements(): (Achievement & { unlocked: boolean })[] {
  return ALL_ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: _state.achievements.includes(ach.id),
    unlockedAt: _state.achievements.includes(ach.id) ? Date.now() : undefined,
  }));
}
