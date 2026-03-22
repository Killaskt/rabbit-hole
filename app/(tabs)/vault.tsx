import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../../components/LiquidBackground';
import { Achievement, ALL_ACHIEVEMENTS, GameState, getGameState, initGameState } from '../../lib/gameState';
import { loadSessions } from '../../lib/storage';
import { useTextSettings } from '../../lib/textSettings';
import { SessionRecord } from '../../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
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
    <View style={[styles.achCard, !unlocked && styles.achLocked]}>
      <Text style={[styles.achIcon, !unlocked && styles.achIconLocked]}>{unlocked ? ach.icon : '?'}</Text>
      <View style={styles.achText}>
        <Text style={[styles.achName, !unlocked && styles.achNameLocked, { fontSize: 13 * scale }]}>{ach.name}</Text>
        <Text style={[styles.achDesc, !unlocked && styles.achDescLocked, { fontSize: 11 * scale, fontWeight: bold ? '700' : '400' }]}>{unlocked ? ach.desc : '???'}</Text>
      </View>
      {unlocked && <View style={styles.achBadge}><Text style={styles.achBadgeText}>◆</Text></View>}
    </View>
  );
}

export default function VaultScreen() {
  const [gs, setGs] = useState<GameState | null>(null);
  const [topicTags, setTopicTags] = useState<TagEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { scale, bold } = useTextSettings();

  const load = useCallback(async () => {
    await initGameState();
    setGs(getGameState());
    const sessions = await loadSessions();
    setTopicTags(buildTagCloud(sessions));
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const unlocked = gs?.achievements ?? [];
  const unlockedCount = unlocked.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#555" />
          }
        >
          <Text style={styles.title}>// VAULT</Text>
          <Text style={styles.subtitle}>knowledge cache & achievements</Text>

          {/* Achievements progress */}
          <View style={styles.achProgress}>
            <Text style={styles.achProgressText}>
              {unlockedCount} / {totalCount} UNLOCKED
            </Text>
            <View style={styles.achProgressBar}>
              <View
                style={[
                  styles.achProgressFill,
                  { width: `${(unlockedCount / totalCount) * 100}%` as any },
                ]}
              />
            </View>
          </View>

          {/* Stats grid */}
          {gs && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionLabel}>// STATISTICS</Text>
              <View style={styles.statsSunken}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statsScrollContent}
                >
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
                    <View key={ci} style={styles.statsColumn}>
                      {col.map(([label, value]) => (
                        <View key={String(label)} style={styles.statCell}>
                          <Text style={[styles.statCellValue, { fontSize: 22 * scale }]}>{value}</Text>
                          <Text style={[styles.statCellLabel, bold && { fontWeight: '700' }]}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Topic cloud */}
          {topicTags.length > 0 && (() => {
            const max = topicTags[0].count;
            return (
              <View style={styles.cloudSection}>
                <Text style={styles.sectionLabel}>// TOPIC CLOUD</Text>
                <View style={styles.cloudWrap}>
                  {topicTags.map(({ tag, count }, i) => {
                    const { fontSize, color, borderColor } = tagVisual(count, max, i === 0);
                    return (
                      <View key={tag} style={[styles.cloudTag, { borderColor }]}>
                        <Text style={[styles.cloudTagText, { fontSize, color }]}>
                          {tag.toUpperCase()}
                        </Text>
                        {count > 1 && (
                          <Text style={[styles.cloudTagCount, { color }]}>{count}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Recall button */}
          {gs && gs.totalSessions > 0 && (
            <Pressable onPress={() => router.push('/drill')} style={styles.recallBtn}>
              {({ pressed }) => (
                <>
                  <Text style={[styles.recallBracket, pressed && styles.recallBracketActive]}>[</Text>
                  <View style={styles.recallCenter}>
                    <Text style={[styles.recallBtnLabel, pressed && styles.recallBtnLabelActive]}>◈  RECALL</Text>
                    <Text style={[styles.recallBtnSub, pressed && styles.recallBtnSubActive]}>test what you know</Text>
                  </View>
                  <Text style={[styles.recallBracket, pressed && styles.recallBracketActive]}>]</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Achievements list */}
          <Text style={styles.sectionLabel}>// ACHIEVEMENTS</Text>
          {ALL_ACHIEVEMENTS.map(ach => (
            <AchievementCard
              key={ach.id}
              ach={ach}
              unlocked={unlocked.includes(ach.id)}
              scale={scale}
              bold={bold}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  recallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 28,
  },
  recallBracket: {
    fontFamily: MONO,
    fontSize: 34,
    color: '#2e2e2e',
    lineHeight: 38,
  },
  recallBracketActive: { color: '#efff00' },
  recallCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recallBtnLabel: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 5,
  },
  recallBtnLabelActive: { color: '#efff00' },
  recallBtnSub: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 1,
  },
  recallBtnSubActive: { color: '#9aaa00' },

  title: {
    fontFamily: MONO,
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#444',
    letterSpacing: 1,
    marginBottom: 24,
  },

  achProgress: { marginBottom: 28 },
  achProgressText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#666',
    letterSpacing: 2,
    marginBottom: 8,
  },
  achProgressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  achProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },

  statsSection: { marginBottom: 28 },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 14,
  },
  statsSunken: {
    overflow: 'hidden',
  },
  statsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  statsColumn: {
    width: 132,
    gap: 8,
  },
  statCell: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  statCellValue: {
    fontFamily: MONO,
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  statCellLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#444',
    letterSpacing: 1.5,
  },

  cloudSection: { marginBottom: 28 },
  cloudWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cloudTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  cloudTagText: {
    fontFamily: MONO,
    letterSpacing: 1,
  },
  cloudTagCount: {
    fontFamily: MONO,
    fontSize: 9,
    opacity: 0.6,
  },

  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.90)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  achLocked: {
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(10,10,10,0.80)',
  },
  achIcon: {
    fontSize: 24,
    color: '#fff',
    width: 32,
    textAlign: 'center',
  },
  achIconLocked: { color: '#222' },
  achText: { flex: 1 },
  achName: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  achNameLocked: { color: '#2a2a2a' },
  achDesc: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#666',
  },
  achDescLocked: { color: '#1a1a1a' },
  achBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achBadgeText: {
    fontSize: 12,
    color: '#fff',
  },
});
