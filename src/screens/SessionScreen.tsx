import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import LiquidBackground from '@/components/LiquidBackground';
import SwipeCard from '@/components/SwipeCard';
import XPBurst from '@/components/XPBurst';
import { useNav } from '@/lib/nav';
import { addCardResult, getCurrentSession } from '@/lib/sessionStore';
import { hasSeenSwipeHint, markSwipeHintSeen, savePausedSession } from '@/lib/storage';
import type { LessonCard } from '@/types/lesson';

const MONO = '"Courier New", Courier, monospace';
const XP_PER_CARD = 10;
const ACCENT = '#efff00';

// ── Swipe hint styles ─────────────────────────────────────────────────────────

const swHintCard: CSSProperties = {
  width: '100%',
  backgroundColor: '#0d0d0d',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.12)',
  padding: 28,
};
const swHintTitle: CSSProperties = {
  fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 24,
};
const swHintArrow: CSSProperties = {
  fontFamily: MONO, fontSize: 26, color: '#555',
};
const swHintTagNoted: CSSProperties = {
  fontFamily: MONO, fontSize: 13, color: '#aaa', fontWeight: 700, letterSpacing: 2,
  border: '1px solid #aaa', borderRadius: 4,
  paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3,
};
const swHintTagAcquired: CSSProperties = {
  fontFamily: MONO, fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: 2,
  border: `1px solid ${ACCENT}`, borderRadius: 4,
  paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3,
};
const swHintSideDesc: CSSProperties = {
  fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 0.5,
};
const swHintBody: CSSProperties = {
  fontFamily: MONO, fontSize: 12, color: '#555', lineHeight: '19px', marginBottom: 24, letterSpacing: 0.2,
};
const swHintBtn: CSSProperties = {
  backgroundColor: ACCENT, borderRadius: 10, padding: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', cursor: 'pointer', width: '100%',
};
const swHintBtnText: CSSProperties = {
  fontFamily: MONO, fontSize: 14, color: '#000', fontWeight: 700, letterSpacing: 2,
};

// ── Main screen styles ────────────────────────────────────────────────────────

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
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20, paddingRight: 20,
    paddingTop: 12, paddingBottom: 8,
  },
  topTitle: {
    fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1,
    flex: 1, marginRight: 12,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  topRight: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  modeTag: {
    fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 2,
    border: '1px solid #444', borderRadius: 4,
    paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
  },
  xpEarned: {
    fontFamily: MONO, fontSize: 12, color: '#4ade80', letterSpacing: 1, fontWeight: 700,
  },
  exitBtn: {
    paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4,
    background: 'none', border: 'none', cursor: 'pointer',
  },
  exitBtnText: {
    fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 1.5,
  },
  exitBtnConfirming: { color: '#f87171' },
  cardArea: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16,
    minHeight: 0,
  },
  dots: {
    display: 'flex', flexDirection: 'row', justifyContent: 'center',
    flexWrap: 'wrap', gap: 8, paddingBottom: 8, paddingLeft: 20, paddingRight: 20,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dotActive: { backgroundColor: '#fff', width: 18 },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.30)' },
  hint: {
    fontFamily: MONO, fontSize: 10, color: '#555', letterSpacing: 1.5,
    textAlign: 'center', paddingBottom: 12,
  },
};

// ── Swipe hint overlay (shown once) ──────────────────────────────────────────

function SwipeHint({ onDismiss }: { onDismiss: () => void }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setOpacity(1)));
  }, []);

  const dismiss = () => {
    setOpacity(0);
    setTimeout(onDismiss, 200);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.80)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 24,
      opacity,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={swHintCard}>
        <div style={swHintTitle}>// SWIPE GUIDE</div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={swHintArrow}>←</div>
            <div style={swHintTagNoted}>NOTED</div>
            <div style={swHintSideDesc}>logged, moving on</div>
          </div>

          <div style={{ width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 16, marginRight: 16 }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={swHintArrow}>→</div>
            <div style={swHintTagAcquired}>ACQUIRED</div>
            <div style={swHintSideDesc}>you got it</div>
          </div>
        </div>

        <div style={swHintBody}>
          Both directions advance the card — the label is just your signal to yourself. Swipe whichever feels right.
        </div>

        <button onClick={dismiss} style={swHintBtn}>
          <span style={swHintBtnText}>GOT IT</span>
        </button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const nav = useNav();
  const { lesson, mode, title, sourceType } = getCurrentSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [key, setKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [abandonState, setAbandonState] = useState<'idle' | 'confirming'>('idle');
  const [fadeVisible, setFadeVisible] = useState(true);

  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cards: LessonCard[] = lesson?.cards ?? [];
  const total = cards.length;

  useEffect(() => {
    if (!lesson) { nav.replace('home'); return; }
    hasSeenSwipeHint().then(seen => { if (!seen) setShowHint(true); });
  }, []);

  useEffect(() => {
    return () => {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    };
  }, []);

  const handleDismissHint = () => {
    markSwipeHintSeen();
    setShowHint(false);
  };

  const advanceCard = (direction: 'right' | 'left') => {
    Haptics.impact({ style: ImpactStyle.Light });
    addCardResult(direction);

    const burstId = Date.now();
    setXPBursts(prev => [...prev, { id: burstId, amount: XP_PER_CARD }]);
    setTotalXPEarned(prev => prev + XP_PER_CARD);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= total) {
      setTimeout(() => {
        nav.replace('quiz');
      }, 300);
    } else {
      setFadeVisible(false);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setKey(k => k + 1);
        setFadeVisible(true);
      }, 80);
    }
  };

  const handleExitTap = () => {
    if (abandonState === 'idle') {
      setAbandonState('confirming');
      abandonTimerRef.current = setTimeout(() => setAbandonState('idle'), 3000);
    } else {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
      const { cardResults: currentResults } = getCurrentSession();
      savePausedSession({
        lesson: lesson!,
        mode,
        title,
        sourceType,
        cardResults: currentResults,
        pausedAt: Date.now(),
      });
      nav.replace('home');
    }
  };

  if (!lesson) return null;

  const currentCard = cards[currentIndex];

  return (
    <div style={s.root}>
      <LiquidBackground />

      <div style={s.safe}>
        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.topTitle}>{title}</div>
          <div style={s.topRight}>
            <div style={s.modeTag}>{mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</div>
            <div style={s.xpEarned}>+{totalXPEarned}xp</div>
            <button onClick={handleExitTap} style={s.exitBtn}>
              <span style={{ ...s.exitBtnText, ...(abandonState === 'confirming' ? s.exitBtnConfirming : {}) }}>
                {abandonState === 'confirming' ? 'ABORT?' : 'EXIT'}
              </span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 20, marginRight: 20, borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(currentIndex / total) * 100}%`, transition: 'width 0.4s ease', backgroundColor: '#fff', borderRadius: 1 }} />
        </div>

        {/* Card area */}
        <div style={s.cardArea}>
          <div style={{
            opacity: fadeVisible ? 1 : 0,
            transition: fadeVisible ? 'opacity 0.2s ease' : 'opacity 0.08s ease',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}>
            <SwipeCard
              key={key}
              card={currentCard}
              index={currentIndex}
              total={total}
              onSwipeRight={() => advanceCard('right')}
              onSwipeLeft={() => advanceCard('left')}
            />
          </div>
        </div>

        {/* Dot indicators */}
        <div style={s.dots}>
          {cards.map((_, i) => (
            <div
              key={i}
              style={{
                ...s.dot,
                ...(i === currentIndex ? s.dotActive : {}),
                ...(i < currentIndex ? s.dotDone : {}),
              }}
            />
          ))}
        </div>

        {/* Hint text */}
        <div style={s.hint}>
          {currentIndex === 0 ? 'swipe cards to advance' : `${total - currentIndex} card${total - currentIndex !== 1 ? 's' : ''} remaining`}
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

      {/* First-time swipe guide */}
      {showHint && <SwipeHint onDismiss={handleDismissHint} />}
    </div>
  );
}
