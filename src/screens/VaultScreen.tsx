import { useCallback, useEffect, useState } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import { Achievement, ALL_ACHIEVEMENTS, GameState, getGameState, initGameState } from '@/lib/gameState';
import { loadSessions } from '@/lib/storage';
import { useTextSettings } from '@/lib/textSettings';
import { SessionRecord } from '@/types/lesson';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';

interface TagEntry { tag: string; count: number }

function buildTagCloud(sessions: SessionRecord[]): TagEntry[] {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    for (const tag of s.tags ?? []) {
      const key = tag.toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
  }
  return Object.entries(map)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 32);
}

function tagVisual(count: number, max: number, isTop: boolean): { fontSize: number; color: string; borderColor: string } {
  if (isTop && max >= 3) return { fontSize: 14, color: ACCENT, borderColor: 'rgba(239,255,0,0.25)' };
  if (max <= 1) return { fontSize: 11, color: '#555', borderColor: 'rgba(255,255,255,0.07)' };
  const ratio = count / max;
  if (ratio >= 0.6) return { fontSize: 14, color: '#bbb', borderColor: 'rgba(255,255,255,0.14)' };
  if (ratio >= 0.3) return { fontSize: 12, color: '#666', borderColor: 'rgba(255,255,255,0.08)' };
  return { fontSize: 10, color: '#333', borderColor: 'rgba(255,255,255,0.04)' };
}

function AchievementCard({ ach, unlocked, scale, bold }: { ach: Achievement; unlocked: boolean; scale: number; bold: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      backgroundColor: unlocked ? 'rgba(18,18,18,0.90)' : 'rgba(10,10,10,0.80)',
      borderRadius: 12,
      border: unlocked ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.04)',
      padding: 16, marginBottom: 10, gap: 14,
    }}>
      <span style={{ fontSize: 24, color: unlocked ? '#fff' : '#222', width: 32, textAlign: 'center', display: 'inline-block' }}>
        {unlocked ? ach.icon : '?'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 13 * scale, color: unlocked ? '#fff' : '#2a2a2a', fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 }}>{ach.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 11 * scale, color: unlocked ? '#666' : '#1a1a1a', fontWeight: bold ? '700' : '400' }}>{unlocked ? ach.desc : '???'}</div>
      </div>
      {unlocked && (
        <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#fff' }}>◆</span>
        </div>
      )}
    </div>
  );
}

export default function VaultScreen() {
  const nav = useNav();
  const [gs, setGs] = useState<GameState | null>(null);
  const [topicTags, setTopicTags] = useState<TagEntry[]>([]);
  const { scale, bold } = useTextSettings();

  const load = useCallback(async () => {
    await initGameState();
    setGs(getGameState());
    const sessions = await loadSessions();
    setTopicTags(buildTagCloud(sessions));
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlocked = gs?.achievements ?? [];
  const unlockedCount = unlocked.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      <LiquidBackground />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 'env(safe-area-inset-top, 44px)' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: 20, paddingBottom: 40 }}>

            <div style={{ fontFamily: MONO, fontSize: 24, color: '#fff', fontWeight: '700', letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>// VAULT</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#444', letterSpacing: 1, marginBottom: 24 }}>knowledge cache & achievements</div>

            {/* Achievements progress */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#666', letterSpacing: 2, marginBottom: 8 }}>
                {unlockedCount} / {totalCount} UNLOCKED
              </div>
              <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: '#fff', width: `${(unlockedCount / totalCount) * 100}%` }} />
              </div>
            </div>

            {/* Stats grid */}
            {gs && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 14 }}>// STATISTICS</div>
                <div style={{ overflowX: 'auto', display: 'flex', flexDirection: 'row', gap: 8, paddingRight: 20 }}>
                  {[
                    [
                      ['TOTAL SESSIONS', gs.totalSessions],
                      ['DEEP DIVES', gs.totalDeepDives],
                      ['PERFECT QUIZZES', gs.perfectQuizzes],
                    ],
                    [
                      ['BEST STREAK', `${gs.longestStreak}d`],
                      ['CURRENT STREAK', `${gs.currentStreak}d`],
                      ['TOTAL XP', gs.totalXP.toLocaleString()],
                    ],
                    [
                      ['RECALLS RUN', gs.totalDrills ?? 0],
                      ['RECALL ACC', gs.totalDrillQuestions ? `${Math.round(((gs.totalDrillCorrect ?? 0) / gs.totalDrillQuestions) * 100)}%` : '—'],
                    ],
                  ].map((col, ci) => (
                    <div key={ci} style={{ minWidth: 132, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {col.map(([label, value]) => (
                        <div key={String(label)} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: 14 }}>
                          <div style={{ fontFamily: MONO, fontSize: 22 * scale, color: '#fff', fontWeight: '700', marginBottom: 4 }}>{value}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', letterSpacing: 1.5, fontWeight: bold ? '700' : '400' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topic cloud */}
            {topicTags.length > 0 && (() => {
              const max = topicTags[0].count;
              return (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 14 }}>// TOPIC CLOUD</div>
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {topicTags.map(({ tag, count }, i) => {
                      const { fontSize, color, borderColor } = tagVisual(count, max, i === 0);
                      return (
                        <div key={tag} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', border: `1px solid ${borderColor}`, borderRadius: 4, padding: '5px 9px', gap: 5 }}>
                          <span style={{ fontFamily: MONO, fontSize, color, letterSpacing: 1 }}>
                            {tag.toUpperCase()}
                          </span>
                          {count > 1 && (
                            <span style={{ fontFamily: MONO, fontSize: 9, color, opacity: 0.6 }}>{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Recall button */}
            {gs && gs.totalSessions > 0 && (
              <button
                onClick={() => nav.navigate('drill')}
                style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', paddingTop: 18, paddingBottom: 18, marginBottom: 28, background: 'none', border: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <span style={{ fontFamily: MONO, fontSize: 34, color: '#2e2e2e', lineHeight: '38px' }}>[</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: '#fff', fontWeight: '700', letterSpacing: 4, marginBottom: 5, display: 'block' }}>◈  RECALL</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: 1, display: 'block' }}>test what you know</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 34, color: '#2e2e2e', lineHeight: '38px' }}>]</span>
              </button>
            )}

            {/* Achievements list */}
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 14 }}>// ACHIEVEMENTS</div>
            {ALL_ACHIEVEMENTS.map(ach => (
              <AchievementCard
                key={ach.id}
                ach={ach}
                unlocked={unlocked.includes(ach.id)}
                scale={scale}
                bold={bold}
              />
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
