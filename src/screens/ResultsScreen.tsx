import { useEffect, useRef, useState } from 'react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import AchievementToast from '@/components/AchievementToast';
import LiquidBackground from '@/components/LiquidBackground';
import {
  Achievement,
  XPBreakdown,
  getLevelProgress,
  getGameState,
  recordSession,
} from '@/lib/gameState';
import { addSession } from '@/lib/storage';
import { clearCurrentSession, getCurrentSession } from '@/lib/sessionStore';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';

const SCORE_MSGS = [
  '// SUBOPTIMAL — REVIEW RECOMMENDED',
  '// PARTIAL ACQUISITION',
  '// FULL ACQUISITION — KNOWLEDGE SECURED',
];

export default function ResultsScreen() {
  const nav = useNav();
  const { score: scoreStr, mode } = nav.params as { score: string; mode: string };
  const quizScore = parseInt(scoreStr ?? '0', 10);
  const { lesson, title, sourceType, cardResults } = getCurrentSession();

  const [xp, setXP] = useState<XPBreakdown | null>(null);
  const [displayedXP, setDisplayedXP] = useState(0);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [currentAchIndex, setCurrentAchIndex] = useState(0);
  const [levelUp, setLevelUp] = useState(false);
  const [levelData, setLevelData] = useState<ReturnType<typeof getLevelProgress> | null>(null);
  const [ready, setReady] = useState(false);

  const runRef = useRef(false);

  useEffect(() => {
    if (!lesson) { nav.replace('home'); return; }
    if (runRef.current) return;
    runRef.current = true;

    const run = async () => {
      const result = await recordSession({ mode: mode as 'skim' | 'deep_dive', quizScore });
      setXP(result.xp);
      setNewAchievements(result.newAchievements);
      setLevelUp(result.levelUp);
      setLevelData(getLevelProgress(getGameState().totalXP));

      await addSession({
        id: String(Date.now()),
        timestamp: Date.now(),
        title: title || 'Unknown',
        mode: mode as 'skim' | 'deep_dive',
        source_type: sourceType,
        xpGained: result.xp.total,
        quizScore,
        lesson: lesson!,
        cardResults,
        topic_type: lesson!.topic_type,
        tags: lesson!.tags,
      });

      // Fade/scale in
      setTimeout(() => setReady(true), 100);

      // Count-up XP display
      const target = result.xp.total;
      const steps = 20;
      const interval = 1200 / steps;
      let step = 0;
      const id = setInterval(() => {
        step++;
        setDisplayedXP(Math.round((step / steps) * target));
        if (step >= steps) clearInterval(id);
      }, interval);

      if (result.newAchievements.length > 0) {
        Haptics.notification({ type: NotificationType.Success });
      }
    };

    run();
  }, []);

  const handleDone = () => {
    clearCurrentSession();
    nav.replace('home');
  };

  const handleDiveDeeper = (topic: string) => {
    clearCurrentSession();
    nav.navigate('new-session', { prefill: topic });
  };

  if (!lesson) return null;

  const scoreMsg = SCORE_MSGS[Math.min(quizScore, 2)];

  return (
    <div style={{ position: 'relative', height: '100%', backgroundColor: '#000' }}>
      <LiquidBackground />

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
        {/* Scroll container */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              padding: 20,
              paddingBottom: 40,
              opacity: ready ? 1 : 0,
              transform: ready ? 'scale(1)' : 'scale(0.8)',
              transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
            }}
          >
            {/* Score header */}
            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 10 }}>
                {scoreMsg}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 56, color: '#fff', fontWeight: 700, lineHeight: '64px' }}>
                {quizScore}/2
              </div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: '#555', marginTop: 8, letterSpacing: 0.5 }}>
                {title}
              </div>
            </div>

            {/* XP card */}
            {xp && (
              <div
                style={{
                  backgroundColor: 'rgba(18,18,18,0.92)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.10)',
                  padding: 22,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 2, marginBottom: 8 }}>
                  // XP EARNED
                </div>
                <div style={{ fontFamily: MONO, fontSize: 40, color: '#efff00', fontWeight: 700, marginBottom: 20 }}>
                  +{displayedXP}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 6,
                      paddingBottom: 6,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1 }}>SESSION BASE</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#fff', letterSpacing: 1, fontWeight: 700 }}>
                      +{xp.sessionBase}
                    </span>
                  </div>
                  {xp.quizBonus > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1 }}>QUIZ SCORE</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#fff', letterSpacing: 1, fontWeight: 700 }}>
                        +{xp.quizBonus}
                      </span>
                    </div>
                  )}
                  {xp.perfectBonus > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1 }}>PERFECT QUIZ</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#efff00', letterSpacing: 1, fontWeight: 700 }}>
                        +{xp.perfectBonus}
                      </span>
                    </div>
                  )}
                  {xp.streakBonus > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: 6,
                        paddingBottom: 6,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', letterSpacing: 1 }}>STREAK BONUS</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#fbbf24', letterSpacing: 1, fontWeight: 700 }}>
                        +{xp.streakBonus}
                      </span>
                    </div>
                  )}
                </div>

                {levelUp && levelData && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 13, color: '#efff00', fontWeight: 700, letterSpacing: 2 }}>
                      ◎ LEVEL UP — {levelData.levelName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Deeper rabbit holes */}
            {lesson.deeper && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 12 }}>
                  // DIG DEEPER
                </div>
                {lesson.deeper.map((topic, i) => (
                  <button
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingTop: 14,
                      paddingBottom: 14,
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      gap: 12,
                      background: 'none',
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxSizing: 'border-box',
                    }}
                    onClick={() => handleDiveDeeper(topic)}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 14, color: '#efff00' }}>→</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: '#aaa', letterSpacing: 0.5, flex: 1 }}>
                      {topic}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Done button */}
            <button
              onClick={handleDone}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                padding: 18,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 14, color: '#888', fontWeight: 700, letterSpacing: 2 }}>
                ◎ BACK TO SURFACE
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Achievement toasts */}
      {newAchievements[currentAchIndex] && (
        <AchievementToast
          key={currentAchIndex}
          achievement={newAchievements[currentAchIndex]}
          onDone={() => setCurrentAchIndex(i => i + 1)}
        />
      )}
    </div>
  );
}
