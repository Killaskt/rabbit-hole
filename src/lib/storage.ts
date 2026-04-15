import { Preferences } from '@capacitor/preferences';
import type { PausedSession, SessionRecord } from '../types/lesson';

// ── Storage keys ──────────────────────────────────────────────────────────────

const GAME_STATE_KEY = 'rh_game_state';
const SESSIONS_KEY = 'rh_sessions';
const PAUSED_SESSION_KEY = 'rh_paused_session';
const PREFERRED_MODEL_KEY = 'rh_preferred_model';
const DISMISSED_QUESTIONS_KEY = 'rh_dismissed_questions';
const TEXT_SETTINGS_KEY = 'rh_text_settings';
const SWIPE_HINT_KEY = 'rh_swipe_hint_seen';

// ── API keys ──────────────────────────────────────────────────────────────────

export async function getApiKey(provider: 'anthropic' | 'openai' = 'anthropic'): Promise<string | null> {
  const { value } = await Preferences.get({ key: `secure_rh_apikey_${provider}` });
  return value;
}

export async function setApiKey(key: string, provider: 'anthropic' | 'openai' = 'anthropic'): Promise<void> {
  await Preferences.set({ key: `secure_rh_apikey_${provider}`, value: key });
}

export async function deleteApiKey(provider: 'anthropic' | 'openai' = 'anthropic'): Promise<void> {
  await Preferences.remove({ key: `secure_rh_apikey_${provider}` });
}

// ── Game state ────────────────────────────────────────────────────────────────

export async function saveGameState(state: object): Promise<void> {
  await Preferences.set({ key: GAME_STATE_KEY, value: JSON.stringify(state) });
}

export async function loadGameState(): Promise<object | null> {
  const { value } = await Preferences.get({ key: GAME_STATE_KEY });
  return value ? (JSON.parse(value) as object) : null;
}

// ── Session history ───────────────────────────────────────────────────────────

export async function loadSessions(): Promise<SessionRecord[]> {
  const { value } = await Preferences.get({ key: SESSIONS_KEY });
  return value ? (JSON.parse(value) as SessionRecord[]) : [];
}

export async function addSession(session: SessionRecord): Promise<void> {
  const sessions = await loadSessions();
  sessions.unshift(session);
  const pinned = sessions.filter(s => s.pinned);
  const unpinned = sessions.filter(s => !s.pinned).slice(0, Math.max(50 - pinned.length, 10));
  await Preferences.set({ key: SESSIONS_KEY, value: JSON.stringify([...pinned, ...unpinned]) });
}

export async function getSessionById(id: string): Promise<SessionRecord | null> {
  const sessions = await loadSessions();
  return sessions.find(s => s.id === id) ?? null;
}

export async function pinSession(id: string, pinned: boolean): Promise<void> {
  const sessions = await loadSessions();
  const updated = sessions.map(s => s.id === id ? { ...s, pinned } : s);
  await Preferences.set({ key: SESSIONS_KEY, value: JSON.stringify(updated) });
}

// ── Paused session ────────────────────────────────────────────────────────────

export async function savePausedSession(s: PausedSession): Promise<void> {
  await Preferences.set({ key: PAUSED_SESSION_KEY, value: JSON.stringify(s) });
}

export async function loadPausedSession(): Promise<PausedSession | null> {
  const { value } = await Preferences.get({ key: PAUSED_SESSION_KEY });
  return value ? (JSON.parse(value) as PausedSession) : null;
}

export async function clearPausedSession(): Promise<void> {
  await Preferences.remove({ key: PAUSED_SESSION_KEY });
}

// ── Model preference ──────────────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  provider: 'anthropic' | 'openai';
  label: string;
  sublabel: string;
  tier: 'free' | 'paid';
  sessionsPerDollar: number;
  costLine: string;
}

export const MODELS: ModelOption[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    label: 'HAIKU',
    sublabel: 'Claude Haiku 4.5',
    tier: 'free',
    sessionsPerDollar: 225,
    costLine: '~$0.004 / session  ·  225 sessions per $1',
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'SONNET',
    sublabel: 'Claude Sonnet 4.6',
    tier: 'paid',
    sessionsPerDollar: 60,
    costLine: '~$0.017 / session  ·  60 sessions per $1',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    label: '4O MINI',
    sublabel: 'OpenAI GPT-4o mini',
    tier: 'free',
    sessionsPerDollar: 1000,
    costLine: '~$0.001 / session  ·  1000 sessions per $1',
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    label: '4O',
    sublabel: 'OpenAI GPT-4o',
    tier: 'paid',
    sessionsPerDollar: 85,
    costLine: '~$0.012 / session  ·  85 sessions per $1',
  },
];

export type ModelId = (typeof MODELS)[number]['id'];

export function getModelOption(id: ModelId): ModelOption {
  return MODELS.find(m => m.id === id) ?? MODELS[0];
}

export async function getPreferredModel(): Promise<ModelId> {
  const { value } = await Preferences.get({ key: PREFERRED_MODEL_KEY });
  return (MODELS.find(m => m.id === value) ? value : 'claude-haiku-4-5-20251001') as ModelId;
}

export async function setPreferredModel(model: ModelId): Promise<void> {
  await Preferences.set({ key: PREFERRED_MODEL_KEY, value: model });
}

// ── Drill dismissed questions ─────────────────────────────────────────────────

export async function getDismissedQuestions(): Promise<string[]> {
  const { value } = await Preferences.get({ key: DISMISSED_QUESTIONS_KEY });
  return value ? (JSON.parse(value) as string[]) : [];
}

export async function dismissQuestion(qText: string): Promise<void> {
  const dismissed = await getDismissedQuestions();
  if (!dismissed.includes(qText)) {
    dismissed.push(qText);
    await Preferences.set({ key: DISMISSED_QUESTIONS_KEY, value: JSON.stringify(dismissed) });
  }
}

// ── Swipe hint ────────────────────────────────────────────────────────────────

export async function hasSeenSwipeHint(): Promise<boolean> {
  const { value } = await Preferences.get({ key: SWIPE_HINT_KEY });
  return value === 'true';
}

export async function markSwipeHintSeen(): Promise<void> {
  await Preferences.set({ key: SWIPE_HINT_KEY, value: 'true' });
}

// ── Text settings (used by textSettings.tsx) ──────────────────────────────────

export async function loadTextSettings(): Promise<object | null> {
  const { value } = await Preferences.get({ key: TEXT_SETTINGS_KEY });
  return value ? (JSON.parse(value) as object) : null;
}

export async function saveTextSettings(settings: object): Promise<void> {
  await Preferences.set({ key: TEXT_SETTINGS_KEY, value: JSON.stringify(settings) });
}
