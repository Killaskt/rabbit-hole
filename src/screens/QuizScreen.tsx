import { useEffect, useRef, useState } from 'react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import LiquidBackground from '@/components/LiquidBackground';
import XPBurst from '@/components/XPBurst';
import { getCurrentSession } from '@/lib/sessionStore';
import { savePausedSession } from '@/lib/storage';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';
const XP_CORRECT = 25;

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizScreen() {
  const nav = useNav();
  const { lesson, mode, title, sourceType, cardResults } = getCurrentSession();
  const quiz = lesson?.quiz ?? [];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [abandonState, setAbandonState] = useState<'idle' | 'confirming'>('idle');
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [slideX, setSlideX] = useState(0);
  const [noTransition, setNoTransition] = useState(false);

  useEffect(() => {
    return () => {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    };
  }, []);

  const handleExitTap = () => {
    if (abandonState === 'idle') {
      setAbandonState('confirming');
      abandonTimerRef.current = setTimeout(() => setAbandonState('idle'), 3000);
    } else {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
      savePausedSession({
        lesson: lesson!,
        mode,
        title,
        sourceType,
        cardResults,
        pausedAt: Date.now(),
      });
      nav.replace('home');
    }
  };

  const currentQ = quiz[questionIndex];
  const isLast = questionIndex === quiz.length - 1;

  const handleAnswer = (choiceIndex: number) => {
    if (answerState !== 'unanswered') return;
    setSelected(choiceIndex);
    const isCorrect = choiceIndex === currentQ.answer_index;
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    setShowExplanation(true);

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      Haptics.notification({ type: NotificationType.Success });
      const burstId = Date.now();
      setXPBursts(prev => [...prev, { id: burstId, amount: XP_CORRECT }]);
    } else {
      Haptics.notification({ type: NotificationType.Error });
    }
  };

  const handleNext = () => {
    if (isLast) {
      nav.replace('results', { score: String(scoreRef.current), mode });
    } else {
      setSlideX(-40);
      setTimeout(() => {
        setQuestionIndex(i => i + 1);
        setSelected(null);
        setAnswerState('unanswered');
        setShowExplanation(false);
        setNoTransition(true);
        setSlideX(40);
        setTimeout(() => {
          setNoTransition(false);
          setSlideX(0);
        }, 16);
      }, 200);
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
      return { ...base, border: '1px solid #efff00', backgroundColor: 'rgba(239,255,0,0.06)' };
    if (idx === selected && answerState === 'wrong')
      return { ...base, border: '1px solid #f87171', backgroundColor: 'rgba(248,113,113,0.06)' };
    return { ...base, border: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(10,10,10,0.60)' };
  }

  function choiceTextColor(idx: number): string {
    if (answerState === 'unanswered') return '#ccc';
    if (idx === currentQ.answer_index) return '#efff00';
    if (idx === selected && answerState === 'wrong') return '#f87171';
    return '#2a2a2a';
  }

  if (!lesson) {
    nav.replace('home');
    return null;
  }

  const slideStyle: React.CSSProperties = {
    transform: `translateX(${slideX}px)`,
    transition: noTransition ? 'none' : 'transform 0.2s ease',
  };

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

      {/* Safe area + content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 'calc(env(safe-area-inset-top, 44px) + 20px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
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
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#444', letterSpacing: 2 }}>
            // KNOWLEDGE CHECK
          </span>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 16, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>
              {score}/{questionIndex + (answerState !== 'unanswered' ? 1 : 0)}
            </span>
            <button
              onClick={handleExitTap}
              style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: abandonState === 'confirming' ? '#f87171' : '#444',
                  letterSpacing: 1.5,
                }}
              >
                {abandonState === 'confirming' ? 'ABORT?' : 'EXIT'}
              </span>
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {quiz.map((_, i) => (
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
        <div style={{ ...slideStyle, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
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
                <span style={{ fontFamily: MONO, fontSize: 14, color: '#efff00', fontWeight: 700 }}>✓</span>
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

        {/* Explanation */}
        {showExplanation && (
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
              {isLast ? 'SEE RESULTS →' : 'NEXT QUESTION →'}
            </span>
          </button>
        )}
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
