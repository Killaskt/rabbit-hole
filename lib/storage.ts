import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SessionRecord } from '../types/lesson';

const GAME_STATE_KEY = 'rh_game_state';
const SESSIONS_KEY = 'rh_sessions';

// ── API keys (per provider, stored encrypted) ─────────────────────────────────

export async function getApiKey(provider: 'anthropic' | 'openai' = 'anthropic'): Promise<string | null> {
  return SecureStore.getItemAsync(`rh_apikey_${provider}`);
}

export async function setApiKey(key: string, provider: 'anthropic' | 'openai' = 'anthropic'): Promise<void> {
  return SecureStore.setItemAsync(`rh_apikey_${provider}`, key);
}

export async function deleteApiKey(provider: 'anthropic' | 'openai' = 'anthropic'): Promise<void> {
  return SecureStore.deleteItemAsync(`rh_apikey_${provider}`);
}

// ── Game state ────────────────────────────────────────────────────────────────

export async function saveGameState(state: object): Promise<void> {
  await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
}

export async function loadGameState(): Promise<object | null> {
  const raw = await AsyncStorage.getItem(GAME_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Session history ───────────────────────────────────────────────────────────

export async function loadSessions(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addSession(session: SessionRecord): Promise<void> {
  const sessions = await loadSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
}

// ── Model / provider preference ───────────────────────────────────────────────

export interface ModelOption {
  id: string;
  provider: 'anthropic' | 'openai';
  label: string;
  sublabel: string;
  tier: 'free' | 'paid';
  /** Approx sessions you get for $1, based on ~2k input + 700 output tokens */
  sessionsPerDollar: number;
  /** Human cost string shown in UI */
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
  const val = await AsyncStorage.getItem('rh_preferred_model');
  return (MODELS.find(m => m.id === val) ? val : 'claude-haiku-4-5-20251001') as ModelId;
}

export async function setPreferredModel(model: ModelId): Promise<void> {
  await AsyncStorage.setItem('rh_preferred_model', model);
}

// ── Onboarding flags ──────────────────────────────────────────────────────────

export async function hasSeenSwipeHint(): Promise<boolean> {
  return (await AsyncStorage.getItem('rh_seen_swipe_hint')) === 'true';
}

export async function markSwipeHintSeen(): Promise<void> {
  await AsyncStorage.setItem('rh_seen_swipe_hint', 'true');
}
