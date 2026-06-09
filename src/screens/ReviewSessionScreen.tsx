import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import { useNav } from '@/lib/nav';
import { getSessionById, pinSession } from '@/lib/storage';
import type { SessionRecord } from '@/types/lesson';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';

const s: Record<string, CSSProperties> = {
  root: { position: 'relative', height: '100%', backgroundColor: '#000' },
  safe: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: 'env(safe-area-inset-top,44px)',
    paddingBottom: 'env(safe-area-inset-bottom,0px)',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20, paddingRight: 20,
    paddingTop: 12, paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  backBtn: {
    paddingTop: 4, paddingBottom: 4, paddingRight: 8,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: MONO, fontSize: 12, color: '#555', letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: MONO, fontSize: 13, color: '#444', letterSpacing: 2,
  },
  pinBtn: {
    paddingTop: 4, paddingBottom: 4, paddingLeft: 8,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: MONO, fontSize: 12, color: '#555', letterSpacing: 1,
  },
  pinBtnActive: { color: ACCENT },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
  scrollInner: { padding: 20, paddingBottom: 48 },
  metaRow: { marginBottom: 28 },
  metaTitle: {
    fontFamily: MONO, fontSize: 18, color: '#fff', fontWeight: 700,
    letterSpacing: 0.5, lineHeight: '26px', marginBottom: 10,
  },
  metaBadges: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaMode: {
    fontFamily: MONO, fontSize: 9, color: '#666', letterSpacing: 2,
    border: '1px solid #333', borderRadius: 4,
    paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
  },
  metaScore: { fontFamily: MONO, fontSize: 12, color: '#fff', fontWeight: 700, letterSpacing: 1 },
  metaDate: { fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 0.5 },
  sectionLabel: {
    fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 14,
  },
  cardBlock: {
    backgroundColor: 'rgba(14,14,14,0.95)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  cardIndex: { fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 1, width: 20 },
  cardTitle: {
    fontFamily: MONO, fontSize: 13, color: '#fff', fontWeight: 700, letterSpacing: 1, flex: 1,
  },
  cardResultBadge: {
    fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
    borderWidth: '1px', borderStyle: 'solid', borderRadius: 4,
    paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
  },
  cardResultAcquired: { color: ACCENT, borderColor: ACCENT },
  cardResultNoted: { color: '#aaa', borderColor: '#aaa' },
  cardBody: {
    fontFamily: MONO, fontSize: 13, color: '#888', lineHeight: '21px', letterSpacing: 0.2,
  },
  quizBlock: {
    backgroundColor: 'rgba(14,14,14,0.95)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 14,
  },
  quizNum: { fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 8 },
  quizText: {
    fontFamily: MONO, fontSize: 15, color: '#fff', lineHeight: '23px', letterSpacing: 0.3, marginBottom: 14,
  },
  quizChoices: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  quizChoice: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    borderRadius: 10,
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.05)',
    padding: 12, gap: 10,
  },
  quizChoiceCorrect: { borderColor: ACCENT, backgroundColor: 'rgba(239,255,0,0.05)' },
  quizChoiceLetter: {
    fontFamily: MONO, fontSize: 11, color: '#444', fontWeight: 700, width: 16,
  },
  quizChoiceText: { fontFamily: MONO, fontSize: 12, flex: 1, lineHeight: '18px' },
  quizChoiceTextCorrect: { color: ACCENT },
  quizChoiceTextDim: { color: '#2a2a2a' },
  correctMark: { fontFamily: MONO, fontSize: 13, color: ACCENT, fontWeight: 700 },
  explanationBox: {
    borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12,
  },
  explanationLabel: {
    fontFamily: MONO, fontSize: 9, color: '#444', letterSpacing: 2, marginBottom: 6,
  },
  explanationText: { fontFamily: MONO, fontSize: 12, color: '#666', lineHeight: '18px' },
  deeperArrow: { fontFamily: MONO, fontSize: 14, color: ACCENT },
  deeperTopic: { fontFamily: MONO, fontSize: 13, color: '#aaa', letterSpacing: 0.5, flex: 1 },
};

export default function ReviewSessionScreen() {
  const nav = useNav();
  const id = nav.params.id;
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { nav.back(); return; }
    getSessionById(id).then(rec => {
      if (!rec) { nav.back(); return; }
      setSession(rec);
      setLoading(false);
    });
  }, [id]);

  const handlePin = async () => {
    if (!session) return;
    await pinSession(session.id, !session.pinned);
    setSession(prev => prev ? { ...prev, pinned: !prev.pinned } : prev);
  };

  const handleDiveDeeper = (topic: string) => {
    nav.navigate('new-session', { prefill: topic });
  };

  if (loading || !session) return null;

  const { lesson, cardResults } = session;
  const cards = lesson.cards ?? [];
  const quiz = lesson.quiz ?? [];

  return (
    <div style={s.root}>
      <LiquidBackground />

      <div style={s.safe}>
        {/* Header */}
        <div style={s.header}>
          <button onClick={() => nav.back()} style={s.backBtn}>← BACK</button>
          <div style={s.headerTitle}>// REVIEW</div>
          <button
            onClick={handlePin}
            style={{ ...s.pinBtn, ...(session.pinned ? s.pinBtnActive : {}) }}
          >
            {session.pinned ? '◆ UNPIN' : '◇ PIN'}
          </button>
        </div>

        <div style={s.scroll}>
          <div style={s.scrollInner}>
            {/* Session metadata */}
            <div style={s.metaRow}>
              <div style={s.metaTitle}>{session.title}</div>
              <div style={s.metaBadges}>
                <div style={s.metaMode}>{session.mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</div>
                <div style={s.metaScore}>{session.quizScore}/2</div>
                <div style={s.metaDate}>
                  {new Date(session.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Cards section */}
            <div style={s.sectionLabel}>// CARDS</div>
            {cards.map((card, i) => {
              const result = cardResults?.[i];
              return (
                <div key={card.id} style={s.cardBlock}>
                  <div style={s.cardHeader}>
                    <div style={s.cardIndex}>C{i + 1}</div>
                    <div style={s.cardTitle}>{card.title}</div>
                    {result && (
                      <div style={{
                        ...s.cardResultBadge,
                        ...(result === 'acquired' ? s.cardResultAcquired : s.cardResultNoted),
                      }}>
                        {result === 'acquired' ? 'ACQUIRED' : 'NOTED'}
                      </div>
                    )}
                  </div>
                  <div style={s.cardBody}>{card.body}</div>
                </div>
              );
            })}

            {/* Quiz section */}
            <div style={{ ...s.sectionLabel, marginTop: 8 }}>// QUIZ</div>
            {quiz.map((q, qi) => (
              <div key={qi} style={s.quizBlock}>
                <div style={s.quizNum}>Q{qi + 1}</div>
                <div style={s.quizText}>{q.q}</div>
                <div style={s.quizChoices}>
                  {q.choices.map((choice, ci) => (
                    <div
                      key={ci}
                      style={{
                        ...s.quizChoice,
                        ...(ci === q.answer_index ? s.quizChoiceCorrect : {}),
                      }}
                    >
                      <div style={s.quizChoiceLetter}>{String.fromCharCode(65 + ci)}</div>
                      <div style={{
                        ...s.quizChoiceText,
                        ...(ci === q.answer_index ? s.quizChoiceTextCorrect : s.quizChoiceTextDim),
                      }}>
                        {choice}
                      </div>
                      {ci === q.answer_index && <div style={s.correctMark}>✓</div>}
                    </div>
                  ))}
                </div>
                <div style={s.explanationBox}>
                  <div style={s.explanationLabel}>// EXPLANATION</div>
                  <div style={s.explanationText}>{q.explanation}</div>
                </div>
              </div>
            ))}

            {/* Go deeper section */}
            {lesson.deeper && (
              <>
                <div style={{ ...s.sectionLabel, marginTop: 8 }}>// GO DEEPER</div>
                {lesson.deeper.map((topic, i) => (
                  <div
                    key={i}
                    onClick={() => handleDiveDeeper(topic)}
                    style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center',
                      paddingTop: 14, paddingBottom: 14,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      gap: 12, cursor: 'pointer',
                    }}
                  >
                    <div style={s.deeperArrow}>→</div>
                    <div style={s.deeperTopic}>{topic}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
