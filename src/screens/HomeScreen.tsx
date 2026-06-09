import { useCallback, useEffect, useState } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import { GameState, getLevelProgress, getGameState, initGameState, LEVEL_NAMES } from '@/lib/gameState';
import { useTextSettings } from '@/lib/textSettings';
import { setCurrentSession } from '@/lib/sessionStore';
import { clearPausedSession, loadPausedSession, loadSessions, pinSession } from '@/lib/storage';
import { PausedSession, SessionRecord } from '@/types/lesson';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';
const LEVEL_ICONS = ['○', '◌', '◎', '◐', '◑', '◍', '◈', '◉', '◆', '★'];

function XPBar({ progress }: { progress: number }) {
  return (
    <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', backgroundColor: '#fff', borderRadius: 2, width: `${Math.min(progress * 100, 100)}%` }} />
    </div>
  );
}

function StatBox({ label, value, scale = 1, bold = false }: { label: string; value: string | number; scale?: number; bold?: boolean }) {
  return (
    <div style={{ flex: 1, backgroundColor: 'rgba(18,18,18,0.85)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontFamily: MONO, fontSize: 20 * scale, color: '#fff', fontWeight: '700' }}>{value}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', letterSpacing: 1.5, marginTop: 4, fontWeight: bold ? '700' : '400' }}>{label}</span>
    </div>
  );
}

function TraceRow({ session, onPin, onReview, recent = false, scale = 1, bold = false }: {
  session: SessionRecord;
  onPin: () => void;
  onReview: () => void;
  recent?: boolean;
  scale?: number;
  bold?: boolean;
}) {
  const pinned = !!session.pinned;
  return (
    <div
      onClick={onReview}
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, cursor: 'pointer' }}
    >
      <button
        onClick={e => { e.stopPropagation(); onPin(); }}
        style={{ width: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, color: pinned ? ACCENT : 'rgba(255,255,255,0.15)' }}>
          {pinned ? '◆' : '◇'}
        </span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 13 * scale, color: pinned ? '#fff' : recent ? '#ccc' : '#555', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.title}
        </div>
        <div style={{ fontFamily: MONO, fontSize: scale > 1 ? 10 * scale : 10, color: '#444', letterSpacing: 1, fontWeight: bold ? '700' : '400' }}>
          {session.mode === 'deep_dive' ? 'DEEP' : 'SKIM'} · {session.quizScore}/2 · +{session.xpGained}xp
        </div>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
        {new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
}

export default function HomeScreen() {
  const nav = useNav();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [pausedSession, setPausedSession] = useState<PausedSession | null>(null);
  const [blink, setBlink] = useState(true);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const { scale, bold } = useTextSettings();

  const loadData = useCallback(async () => {
    await initGameState();
    setGameState(getGameState());
    setSessions(await loadSessions());
    setPausedSession(await loadPausedSession());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  const handleResume = () => {
    if (!pausedSession) return;
    setCurrentSession(pausedSession.lesson, pausedSession.mode, pausedSession.title, pausedSession.sourceType);
    nav.navigate('session');
  };

  const handleDiscard = async () => {
    await clearPausedSession();
    setPausedSession(null);
  };

  const handleNewSession = async () => {
    await clearPausedSession();
    setPausedSession(null);
    nav.navigate('new-session');
  };

  const handlePin = async (id: string, currentlyPinned: boolean) => {
    await pinSession(id, !currentlyPinned);
    setSessions(await loadSessions());
  };

  const handleReview = (id: string) => {
    nav.navigate('review-session', { id });
  };

  const pinnedSessions = sessions.filter(s => s.pinned);
  const unpinned = sessions.filter(s => !s.pinned);
  const tracesToShow = [
    ...pinnedSessions.map(s => ({ session: s, recent: false })),
    ...unpinned.slice(0, 5).map((s, i) => ({ session: s, recent: i < 3 })),
  ];

  const levelData = gameState ? getLevelProgress(gameState.totalXP) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      <LiquidBackground />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 'env(safe-area-inset-top, 44px)' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: 20, paddingBottom: 40 }}>

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, marginTop: 8 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 4 }}>// RABBIT HOLE</div>
                <div style={{ fontFamily: MONO, fontSize: 20, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>{`> knowledge_agent${blink ? '_' : ' '}`}</div>
              </div>
              <button onClick={() => nav.navigate('settings')} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 20, color: '#444' }}>⚙</span>
              </button>
            </div>

            {/* Level card */}
            {levelData && (
              <button
                onClick={() => setShowLevelModal(true)}
                style={{ width: '100%', textAlign: 'left', backgroundColor: 'rgba(18,18,18,0.90)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.10)', padding: 20, marginBottom: 16, cursor: 'pointer', display: 'block', boxSizing: 'border-box' }}
              >
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 22 * scale, color: '#fff', fontWeight: '700', letterSpacing: 2 }}>{levelData.levelName}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 3 }}>LEVEL {levelData.level}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontFamily: MONO, fontSize: 22 * scale, color: '#fff', fontWeight: '700' }}>{gameState!.totalXP.toLocaleString()}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 3 }}>TOTAL XP</div>
                  </div>
                </div>
                <XPBar progress={levelData.progress} />
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 1 }}>
                  {levelData.xpInLevel} / {levelData.xpForNextLevel} XP to next level
                </div>
              </button>
            )}

            {/* Stats row */}
            {gameState && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <StatBox label="HOLES" value={gameState.totalSessions} scale={scale} bold={bold} />
                <StatBox label="STREAK" value={`${gameState.currentStreak}d`} scale={scale} bold={bold} />
                <StatBox label="PERFECT" value={gameState.perfectQuizzes} scale={scale} bold={bold} />
                <StatBox label="DIVES" value={gameState.totalDeepDives} scale={scale} bold={bold} />
              </div>
            )}

            {/* Paused session banner */}
            {pausedSession && (
              <div style={{ backgroundColor: 'rgba(14,14,0,0.95)', borderRadius: 14, border: `1px solid ${ACCENT}`, padding: 16, marginBottom: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, letterSpacing: 2, marginBottom: 8 }}>◔ PAUSED TRACE</div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pausedSession.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#888', letterSpacing: 2, border: '1px solid #444', borderRadius: 4, padding: '2px 6px' }}>{pausedSession.mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                  <button
                    onClick={handleDiscard}
                    style={{ flex: 1, border: '1px solid #333', borderRadius: 10, padding: 12, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#555', letterSpacing: 1 }}>× DISCARD</span>
                  </button>
                  <button
                    onClick={handleResume}
                    style={{ flex: 2, backgroundColor: ACCENT, borderRadius: 10, padding: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 13, color: '#000', fontWeight: '700', letterSpacing: 1.5 }}>RESUME →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dive button */}
            <button
              onClick={handleNewSession}
              style={{ width: '100%', backgroundColor: '#efff00', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, border: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <span style={{ fontFamily: MONO, fontSize: 16, color: '#000', fontWeight: '700', letterSpacing: 2 }}>◎ ENTER THE HOLE</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#5a5a00', marginTop: 4, letterSpacing: 1 }}>drop a URL or thought</span>
            </button>

            {/* Session history */}
            {tracesToShow.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 12 }}>// RECENT TRACES</div>
                {tracesToShow.map(({ session: s, recent }) => (
                  <TraceRow
                    key={s.id}
                    session={s}
                    recent={recent}
                    onPin={() => handlePin(s.id, !!s.pinned)}
                    onReview={() => handleReview(s.id)}
                    scale={scale}
                    bold={bold}
                  />
                ))}
              </div>
            )}

            {tracesToShow.length === 0 && !pausedSession && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, paddingBottom: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 12 }}>// NO TRACES YET</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: '#555', textAlign: 'center', lineHeight: '20px', letterSpacing: 0.5, whiteSpace: 'pre-line' }}>
                  {'Your first rabbit hole awaits.\nDrop a URL or a thought above.'}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Level history modal */}
      {showLevelModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 200 }}
          onClick={() => setShowLevelModal(false)}
        >
          <div
            style={{ width: '100%', maxHeight: '80%', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {LEVEL_NAMES.map((name, i) => {
              const lvl = i + 1;
              const current = levelData ? lvl === levelData.level : false;
              const done = levelData ? lvl < levelData.level : false;
              return (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: current
                      ? '1px solid rgba(255,255,255,0.22)'
                      : done
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: current
                      ? 'rgba(20,20,20,0.96)'
                      : done
                      ? 'rgba(14,14,14,0.92)'
                      : 'rgba(10,10,10,0.92)',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 18, color: current ? '#fff' : done ? '#2a2a2a' : '#1a1a1a', width: 22, textAlign: 'center', display: 'inline-block' }}>
                    {LEVEL_ICONS[i]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: MONO, fontSize: 13, color: current ? '#fff' : done ? '#444' : '#1e1e1e', fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: current ? '#555' : '#2a2a2a', letterSpacing: 2 }}>LEVEL {lvl}</div>
                  </div>
                  <div style={{ width: 52, display: 'flex', justifyContent: 'flex-end' }}>
                    {current && <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 1.5 }}>◀ HERE</span>}
                    {done && <span style={{ fontFamily: MONO, fontSize: 14, color: ACCENT }}>♛</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
