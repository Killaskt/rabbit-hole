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
import { GameState, getLevelProgress, getGameState, initGameState } from '../../lib/gameState';
import { loadSessions } from '../../lib/storage';
import { SessionRecord } from '../../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

function XPBar({ progress }: { progress: number }) {
  return (
    <View style={styles.xpBarBg}>
      <View style={[styles.xpBarFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [blink, setBlink] = useState(true);

  const loadData = useCallback(async () => {
    await initGameState();
    setGameState(getGameState());
    setSessions(await loadSessions());
  }, []);

  useEffect(() => { loadData(); }, []);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const levelData = gameState ? getLevelProgress(gameState.totalXP) : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#555"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>// RABBIT HOLE</Text>
              <Text style={styles.headerSub}>
                {`> knowledge_agent${blink ? '_' : ' '}`}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Text style={styles.settingsBtnText}>⚙</Text>
            </Pressable>
          </View>

          {/* Level card */}
          {levelData && (
            <View style={styles.levelCard}>
              <View style={styles.levelRow}>
                <View>
                  <Text style={styles.levelName}>{levelData.levelName}</Text>
                  <Text style={styles.levelNum}>LEVEL {levelData.level}</Text>
                </View>
                <View style={styles.xpRight}>
                  <Text style={styles.xpTotal}>{gameState!.totalXP.toLocaleString()}</Text>
                  <Text style={styles.xpLabel}>TOTAL XP</Text>
                </View>
              </View>
              <XPBar progress={levelData.progress} />
              <Text style={styles.xpProgress}>
                {levelData.xpInLevel} / {levelData.xpForNextLevel} XP to next level
              </Text>
            </View>
          )}

          {/* Stats row */}
          {gameState && (
            <View style={styles.statsRow}>
              <StatBox label="HOLES" value={gameState.totalSessions} />
              <StatBox label="STREAK" value={`${gameState.currentStreak}d`} />
              <StatBox label="PERFECT" value={gameState.perfectQuizzes} />
              <StatBox label="DIVES" value={gameState.totalDeepDives} />
            </View>
          )}

          {/* Dive button */}
          <Pressable
            onPress={() => router.push('/new-session')}
            style={({ pressed }) => [styles.diveBtn, pressed && styles.diveBtnPressed]}
          >
            <Text style={styles.diveBtnText}>◎ ENTER THE HOLE</Text>
            <Text style={styles.diveBtnSub}>drop a URL or thought</Text>
          </Pressable>

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>// RECENT TRACES</Text>
              {sessions.slice(0, 5).map(s => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={styles.sessionDot} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.sessionMeta}>
                      {s.mode.toUpperCase()} · {s.quizScore}/2 · +{s.xpGained}xp
                    </Text>
                  </View>
                  <Text style={styles.sessionDate}>
                    {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {sessions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>// NO TRACES YET</Text>
              <Text style={styles.emptyBody}>
                {'Your first rabbit hole awaits.\nDrop a URL or a thought above.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    marginTop: 8,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: MONO,
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsBtnText: {
    fontSize: 20,
    color: '#444',
  },

  levelCard: {
    backgroundColor: 'rgba(18,18,18,0.90)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 20,
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  levelName: {
    fontFamily: MONO,
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
  },
  levelNum: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginTop: 3,
  },
  xpRight: { alignItems: 'flex-end' },
  xpTotal: {
    fontFamily: MONO,
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  xpLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
    marginTop: 3,
  },
  xpBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  xpProgress: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(18,18,18,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: MONO,
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#444',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  diveBtn: {
    backgroundColor: '#efff00',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  diveBtnPressed: {
    backgroundColor: '#d4e600',
  },
  diveBtnText: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 2,
  },
  diveBtnSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#5a5a00',
    marginTop: 4,
    letterSpacing: 1,
  },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sessionInfo: { flex: 1 },
  sessionTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    marginBottom: 3,
  },
  sessionMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 1,
  },
  sessionDate: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptyBody: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});
