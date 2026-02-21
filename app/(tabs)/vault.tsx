import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
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

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

function AchievementCard({ ach, unlocked }: { ach: Achievement; unlocked: boolean }) {
  return (
    <View style={[styles.achCard, !unlocked && styles.achLocked]}>
      <Text style={[styles.achIcon, !unlocked && styles.achIconLocked]}>{unlocked ? ach.icon : '?'}</Text>
      <View style={styles.achText}>
        <Text style={[styles.achName, !unlocked && styles.achNameLocked]}>{ach.name}</Text>
        <Text style={[styles.achDesc, !unlocked && styles.achDescLocked]}>{unlocked ? ach.desc : '???'}</Text>
      </View>
      {unlocked && <View style={styles.achBadge}><Text style={styles.achBadgeText}>◆</Text></View>}
    </View>
  );
}

export default function VaultScreen() {
  const [gs, setGs] = useState<GameState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await initGameState();
    setGs(getGameState());
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
              <View style={styles.statsGrid}>
                {[
                  ['TOTAL SESSIONS', gs.totalSessions],
                  ['DEEP DIVES', gs.totalDeepDives],
                  ['PERFECT QUIZZES', gs.perfectQuizzes],
                  ['BEST STREAK', `${gs.longestStreak}d`],
                  ['CURRENT STREAK', `${gs.currentStreak}d`],
                  ['TOTAL XP', gs.totalXP.toLocaleString()],
                ].map(([label, value]) => (
                  <View key={String(label)} style={styles.statCell}>
                    <Text style={styles.statCellValue}>{value}</Text>
                    <Text style={styles.statCellLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Achievements list */}
          <Text style={styles.sectionLabel}>// ACHIEVEMENTS</Text>
          {ALL_ACHIEVEMENTS.map(ach => (
            <AchievementCard
              key={ach.id}
              ach={ach}
              unlocked={unlocked.includes(ach.id)}
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

  achProgress: {
    marginBottom: 28,
  },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCell: {
    width: '47%',
    backgroundColor: 'rgba(18,18,18,0.90)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
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
  achIconLocked: {
    color: '#222',
  },
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
