import { LessonOutput } from '../types/lesson';

// In-memory store for passing session data between screens
interface CurrentSession {
  lesson: LessonOutput | null;
  mode: 'skim' | 'deep_dive';
  title: string;
  sourceType: 'url' | 'thought';
  cardResults: Array<'noted' | 'acquired'>;
}

const store: CurrentSession = {
  lesson: null,
  mode: 'skim',
  title: '',
  sourceType: 'thought',
  cardResults: [],
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
  store.cardResults = [];
}

export function getCurrentSession(): CurrentSession {
  return { ...store, cardResults: [...store.cardResults] };
}

export function addCardResult(direction: 'right' | 'left') {
  store.cardResults.push(direction === 'right' ? 'acquired' : 'noted');
}

export function clearCurrentSession() {
  store.lesson = null;
  store.mode = 'skim';
  store.title = '';
  store.sourceType = 'thought';
  store.cardResults = [];
}
