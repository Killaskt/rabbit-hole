import { useEffect, useRef, useState } from 'react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import LiquidBackground from '@/components/LiquidBackground';
import XPBurst from '@/components/XPBurst';
import AchievementToast from '@/components/AchievementToast';
import { Achievement, recordDrill } from '@/lib/gameState';
import { dismissQuestion, getDismissedQuestions, loadSessions } from '@/lib/storage';
import { QuizQuestion } from '@/types/lesson';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';
const XP_PER_CORRECT = 15;
const DRILL_SIZE = 5;

interface DrillQuestion extends QuizQuestion {
  sourceTitle: string;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DrillScreen() {
  const nav = useNav();
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [done, setDone] = useState(false);
  const [doneVisible, setDoneVisible] = useState(false);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [achIndex, setAchIndex] = useState(0);
  const totalRef = useRef(0);

  const [slideX, setSlideX] = useState(0);
  const [noTransition, setNoTransition] = useState(false);

  useEffect(() => {
    Promise.all([loadSessions(), getDismissedQuestions()]).then(([sessions, dismissed]) => {
      const all: DrillQuestion[] = [];
      for (const s of sessions) {
        if (s.mode !== 'deep_dive') continue;
        for (const q of s.lesson?.quiz ?? []) {
          if (!dismissed.includes(q.q)) {
            all.push({ ...q, sourceTitle: s.title });
          }
        }
      }
      setQuestions(shuffle(all).slice(0, DRILL_SIZE));
      setLoading(false);
    });
  }, []);

  const currentQ = questions[questionIndex];
  const isLast = questionIndex === questions.length - 1;

  const handleAnswer = (choiceIndex: number) => {
    if (answerState !== 'unanswered') return;
    setSelected(choiceIndex);
    const isCorrect = choiceIndex === currentQ.answer_index;
    setAnswerState(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setTotalXPEarned(prev => prev + XP_PER_CORRECT);
      Haptics.notification({ type: NotificationType.Success });
      const burstId = Date.now();
      setXPBursts(prev => [...prev, { id: burstId, amount: XP_PER_CORRECT }]);
    } else {
      Haptics.notification({ type: NotificationType.Error });
    }
  };

  const finishDrill = async (finalScore: number, finalTotal: number) => {
    const result = await recordDrill(finalScore, finalTotal);
    setTotalXPEarned(result.xpEarned);
    setNewAchievements(result.newAchievements);
    totalRef.current = finalTotal;
    setDone(true);
    setTimeout(() => setDoneVisible(true), 16);
  };

  const handleNext = async () => {
    if (isLast) {
      await finishDrill(scoreRef.current, questions.length);
    } else {
      setSlideX(-40);
      setTimeout(() => {
        setQuestionIndex(i => i + 1);
        setSelected(null);
        setAnswerState('unanswered');
        setNoTransition(true);
        setSlideX(40);
        setTimeout(() => {
          setNoTransition(false);
          setSlideX(0);
        }, 16);
      }, 200);
    }
  };

  const handleDismiss = async () => {
    await dismissQuestion(currentQ.q);
    const remaining = questions.filter((_, i) => i !== questionIndex);
    if (remaining.length === 0) {
      await finishDrill(scoreRef.current, questions.length - 1);
    } else {
      const nextIndex = questionIndex >= remaining.length ? remaining.length - 1 : questionIndex;
      setQuestions(remaining);
      setQuestionIndex(nextIndex);
      setSelected(null);
      setAnswerState('unanswered');
    }
  };

  const flashBg =
    answerState === 'correct'
      ? 'rgba(74,222,128,0.08)'
      : answerState === 'wrong'
      ? 'rgba(248,113,113,0.08)'
      : 'transparent';

  function choiceStyle(idx: number): React.CSSProperties {
    const base: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(18,18,18,0.90)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      padding: 16,
      gap: 12,
      width: '100%',
      cursor: answerState === 'unanswered' ? 'pointer' : 'default',
      textAlign: 'left',
      boxSizing: 'border-box',
    };
    if (answerState === 'unanswered') return base;
    if (idx === currentQ.answer_index)
      return { ...base, border: '1px solid ' + ACCENT, backgroundColor: 'rgba(239,255,0,0.06)' };
    if (idx === selected && answerState === 'wrong')
      return { ...base, border: '1px solid #f87171', backgroundColor: 'rgba(248,113,113,0.06)' };
    return { ...base, border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(10,10,10,0.60)' };
  }

  function choiceTextColor(idx: number): string {
    if (answerState === 'unanswered') return '#ccc';
    if (idx === currentQ.answer_index) return ACCENT;
    if (idx === selected && answerState === 'wrong') return '#f87171';
    return '#2a2a2a';
  }

  const slideStyle: React.CSSProperties = {
    transform: `translateX(${slideX}px)`,
    transition: noTransition ? 'none' : 'transform 0.2s ease',
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && questions.length === 0) {
    return (
      <div style={{ position: 'relative', height: '100%', backgroundColor: '#000' }}>
        <LiquidBackground />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            paddingTop: 'env(safe-area-inset-top, 44px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#444', letterSpacing: 2, marginBottom: 16 }}>
              // NO DATA
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: '#555',
                textAlign: 'center',
                lineHeight: '22px',
                marginBottom: 32,
              }}
            >
              Complete at least one session{'\n'}to unlock recall drills.
            </div>
            <button
              onClick={() => nav.replace('home')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                paddingTop: 18,
                paddingBottom: 18,
                paddingLeft: 32,
                paddingRight: 32,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 14, color: '#888', fontWeight: 700, letterSpacing: 2 }}>
                ← BACK
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    const finalTotal = totalRef.current;
    const pct = finalTotal > 0 ? Math.round((scoreRef.current / finalTotal) * 100) : 0;
    return (
      <div style={{ position: 'relative', height: '100%', backgroundColor: '#000' }}>
        <LiquidBackground />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            paddingTop: 'env(safe-area-inset-top, 44px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              opacity: doneVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 20 }}>
              // RECALL COMPLETE
            </div>
            <div style={{ fontFamily: MONO, fontSize: 64, color: '#fff', fontWeight: 700, lineHeight: '72px' }}>
              {scoreRef.current}/{finalTotal}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: '#555', letterSpacing: 1, marginTop: 8, marginBottom: 16 }}>
              {pct}% retention
            </div>
            {totalXPEarned > 0 && (
              <div style={{ fontFamily: MONO, fontSize: 20, color: ACCENT, fontWeight: 700, letterSpacing: 1, marginBottom: 40 }}>
                +{totalXPEarned} XP
              </div>
            )}
            <button
              onClick={() => nav.replace('home')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                paddingTop: 18,
                paddingBottom: 18,
                paddingLeft: 32,
                paddingRight: 32,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 14, color: '#888', fontWeight: 700, letterSpacing: 2 }}>
                ◎ BACK TO SURFACE
              </span>
            </button>
          </div>
        </div>
        {newAchievements[achIndex] && (
          <AchievementToast
            key={achIndex}
            achievement={newAchievements[achIndex]}
            onDone={() => setAchIndex(i => i + 1)}
          />
        )}
      </div>
    );
  }

  if (loading || !currentQ) return null;

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '100%', backgroundColor: '#000' }}>
      <LiquidBackground />

      {/* Flash overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundColor: flashBg,
          transition: 'background-color 0.4s ease',
          zIndex: 10,
        }}
      />

      {/* Safe area wrapper */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 44px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 12,
            paddingBottom: 8,
            gap: 12,
          }}
        >
          <button
            onClick={() => nav.back()}
            style={{ background: 'none', border: 'none', paddingRight: 4, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 1 }}>← EXIT</span>
          </button>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#444', letterSpacing: 2, flex: 1 }}>
            // RECALL
          </span>
          <span style={{ fontFamily: MONO, fontSize: 16, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>
            {score}/{questionIndex + (answerState !== 'unanswered' ? 1 : 0)}
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, paddingLeft: 20, paddingRight: 20, marginBottom: 16 }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === questionIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i === questionIndex
                    ? '#fff'
                    : i < questionIndex
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.10)',
              }}
            />
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 32 }}>
            {/* Source label */}
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', letterSpacing: 1, marginBottom: 10 }}>
              from: {currentQ.sourceTitle}
            </div>

            {/* Question card */}
            <div
              style={{
                ...slideStyle,
                backgroundColor: 'rgba(18,18,18,0.92)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.10)',
                padding: 22,
                marginBottom: 16,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10 }}>
                Q{questionIndex + 1}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, color: '#fff', lineHeight: '24px', letterSpacing: 0.3 }}>
                {currentQ.q}
              </div>
            </div>

            {/* Choices */}
            <div style={{ ...slideStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQ.choices.map((choice, idx) => (
                <button
                  key={idx}
                  style={choiceStyle(idx)}
                  onClick={() => handleAnswer(idx)}
                  disabled={answerState !== 'unanswered'}
                >
                  <span style={{ fontFamily: MONO, fontSize: 12, color: '#444', fontWeight: 700, width: 18 }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: choiceTextColor(idx),
                      flex: 1,
                      lineHeight: '20px',
                    }}
                  >
                    {choice}
                  </span>
                  {answerState !== 'unanswered' && idx === currentQ.answer_index && (
                    <span style={{ fontFamily: MONO, fontSize: 14, color: ACCENT, fontWeight: 700 }}>✓</span>
                  )}
                  {answerState !== 'unanswered' &&
                    idx === selected &&
                    answerState === 'wrong' &&
                    idx !== currentQ.answer_index && (
                      <span style={{ fontFamily: MONO, fontSize: 14, color: '#f87171', fontWeight: 700 }}>✗</span>
                    )}
                </button>
              ))}
            </div>

            {/* Not interested */}
            {answerState === 'unanswered' && (
              <button
                onClick={handleDismiss}
                style={{
                  marginTop: 16,
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  paddingTop: 10,
                  paddingBottom: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#333', letterSpacing: 2 }}>
                  NOT INTERESTED
                </span>
              </button>
            )}

            {/* Explanation */}
            {answerState !== 'unanswered' && (
              <div
                style={{
                  backgroundColor: 'rgba(12,12,12,0.90)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: 14,
                  marginTop: 12,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', letterSpacing: 2, marginBottom: 6 }}>
                  {answerState === 'correct' ? '// CORRECT' : '// INCORRECT'}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: '#888', lineHeight: '18px' }}>
                  {currentQ.explanation}
                </div>
              </div>
            )}

            {/* Next button */}
            {answerState !== 'unanswered' && (
              <button
                onClick={handleNext}
                style={{
                  marginTop: 16,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  border: 'none',
                  padding: 18,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 14, color: '#000', fontWeight: 700, letterSpacing: 2 }}>
                  {isLast ? 'FINISH RECALL →' : 'NEXT →'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* XP bursts */}
      {xpBursts.map(burst => (
        <XPBurst
          key={burst.id}
          amount={burst.amount}
          onDone={() => setXPBursts(prev => prev.filter(b => b.id !== burst.id))}
        />
      ))}
    </div>
  );
}
