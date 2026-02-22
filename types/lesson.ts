export interface LessonCard {
  id: 'c1' | 'c2' | 'c3' | 'c4' | 'c5';
  title: string;
  body: string;
}

export interface QuizQuestion {
  q: string;
  choices: [string, string, string, string];
  answer_index: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface LessonOutput {
  cards: LessonCard[];
  quiz: QuizQuestion[];
  deeper: [string, string, string];
  safety_note: string;
}

export interface LessonInput {
  mode: 'skim' | 'deep_dive';
  source_type: 'url' | 'thought';
  user_intent: string;
  url: string;
  domain: string;
  site_name: string;
  og_title: string;
  og_description: string;
  thought: string;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  title: string;
  mode: 'skim' | 'deep_dive';
  source_type: 'url' | 'thought';
  xpGained: number;
  quizScore: number;
  lesson: LessonOutput;
  cardResults?: Array<'noted' | 'acquired'>;
  pinned?: boolean;
}

export interface PausedSession {
  lesson: LessonOutput;
  mode: 'skim' | 'deep_dive';
  title: string;
  sourceType: 'url' | 'thought';
  cardResults: Array<'noted' | 'acquired'>;
  pausedAt: number;
}
