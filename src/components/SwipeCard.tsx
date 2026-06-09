import { useState, useRef } from 'react';
import type { KeyTerm, LessonCard } from '../types/lesson';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';

interface Props {
  card: LessonCard;
  index: number;
  total: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

export default function SwipeCard({ card, index, total, onSwipeRight, onSwipeLeft }: Props) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(false);
  const [activeTerm, setActiveTerm] = useState<KeyTerm | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const SWIPE_THRESHOLD = window.innerWidth * 0.3;
  const rotate = dx * 0.016;
  const rightOpacity = Math.max(0, Math.min(1, dx / (SWIPE_THRESHOLD / 2)));
  const leftOpacity = Math.max(0, Math.min(1, -dx / (SWIPE_THRESHOLD / 2)));

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (!isDragging.current && (Math.abs(ddx) > 5 || Math.abs(ddy) > 5)) {
      isDragging.current = true;
    }
    if (isDragging.current) {
      setDx(ddx);
      setDy(ddy * 0.3);
      setDragging(true);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) {
      setDragging(false);
      return;
    }
    isDragging.current = false;
    setDragging(false);

    if (dx > SWIPE_THRESHOLD) {
      setFlying(true);
      setDx(window.innerWidth + 100);
      setTimeout(() => { setDx(0); setDy(0); setFlying(false); onSwipeRight(); }, 260);
    } else if (dx < -SWIPE_THRESHOLD) {
      setFlying(true);
      setDx(-window.innerWidth - 100);
      setTimeout(() => { setDx(0); setDy(0); setFlying(false); onSwipeLeft(); }, 260);
    } else {
      setDx(0);
      setDy(0);
    }
  };

  const handleShare = () => {
    const text = `${card.title}\n\n${card.body}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  const terms = card.key_terms ?? [];

  return (
    <>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          width: 'calc(100vw - 40px)',
          maxWidth: 520,
          backgroundColor: 'rgba(18,18,18,0.92)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.10)',
          padding: 28,
          paddingBottom: 20,
          boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
          touchAction: 'none',
          userSelect: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
          transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`,
          transition: dragging || flying ? 'none' : 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* ACQUIRED label */}
        <div style={{
          position: 'absolute', top: 28, right: 28,
          border: `2px solid ${ACCENT}`, borderRadius: 6,
          padding: '4px 10px', transform: 'rotate(12deg)',
          opacity: rightOpacity, pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: 2, color: ACCENT }}>ACQUIRED</span>
        </div>
        {/* NOTED label */}
        <div style={{
          position: 'absolute', top: 28, left: 28,
          border: '2px solid #aaaaaa', borderRadius: 6,
          padding: '4px 10px', transform: 'rotate(-12deg)',
          opacity: leftOpacity, pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#aaa' }}>NOTED</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginRight: 10 }}>{card.id.toUpperCase()}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1.5, flex: 1 }}>{card.subtitle ?? ''}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 1 }}>{index + 1} / {total}</span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 22 }} />

        {/* Title */}
        <div style={{ fontFamily: MONO, fontSize: 20, color: '#fff', fontWeight: 700, letterSpacing: 0.5, marginBottom: 16, lineHeight: 1.4 }}>{card.title}</div>

        {/* Body */}
        <div style={{ fontFamily: MONO, fontSize: 14, color: '#aaa', lineHeight: 1.6, letterSpacing: 0.2, flex: 1, overflowY: 'auto' }}>{card.body}</div>

        {/* Key terms */}
        {terms.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {terms.map(kt => (
              <button
                key={kt.term}
                onClick={() => setActiveTerm(kt)}
                style={{
                  border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4,
                  padding: '4px 9px', background: 'none', cursor: 'pointer',
                  fontFamily: MONO, fontSize: 10, color: '#666', letterSpacing: 0.5,
                }}
              >
                {kt.term}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#333', letterSpacing: 2 }}>{'< swipe >'}</span>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 14, color: '#333', padding: 0 }}>↑</button>
        </div>
      </div>

      {/* Key term modal */}
      {activeTerm && (
        <div
          onClick={() => setActiveTerm(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.78)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: 32, zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              padding: 24, width: '100%', maxWidth: 400,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 16, color: '#fff', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>{activeTerm.term}</div>
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginBottom: 14 }} />
            <div style={{ fontFamily: MONO, fontSize: 14, color: '#aaa', lineHeight: 1.6 }}>{activeTerm.explanation}</div>
            <button
              onClick={() => setActiveTerm(null)}
              style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: MONO, fontSize: 13, color: '#555', letterSpacing: 1 }}
            >
              [ CLOSE ]
            </button>
          </div>
        </div>
      )}
    </>
  );
}
