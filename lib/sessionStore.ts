import { LessonOutput } from '../types/lesson';

// In-memory store for passing session data between screens
interface CurrentSession {
  lesson: LessonOutput | null;
  mode: 'skim' | 'deep_dive';
  title: string;
  sourceType: 'url' | 'thought';
}

const store: CurrentSession = {
  lesson: null,
  mode: 'skim',
  title: '',
  sourceType: 'thought',
};

export function setCurrentSession(
  lesson: LessonOutput,
  mode: 'skim' | 'deep_dive',
  title: string,
  sourceType: 'url' | 'thought'
) {
  store.lesson = lesson;
  store.mode = mode;
  store.title = title;
  store.sourceType = sourceType;
}

export function getCurrentSession(): CurrentSession {
  return { ...store };
}

export function clearCurrentSession() {
  store.lesson = null;
  store.mode = 'skim';
  store.title = '';
  store.sourceType = 'thought';
}
