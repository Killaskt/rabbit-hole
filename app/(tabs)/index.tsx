import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
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
import { GameState, getLevelProgress, getGameState, initGameState, LEVEL_NAMES } from '../../lib/gameState';
import { useTextSettings } from '../../lib/textSettings';
import { setCurrentSession } from '../../lib/sessionStore';
import { clearPausedSession, loadPausedSession, loadSessions, pinSession } from '../../lib/storage';
import { PausedSession, SessionRecord } from '../../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const ACCENT = '#efff00';
const LEVEL_ICONS = ['○', '◌', '◎', '◐', '◑', '◍', '◈', '◉', '◆', '★'];

function XPBar({ progress }: { progress: number }) {
  return (
    <View style={styles.xpBarBg}>
      <View style={[styles.xpBarFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
    </View>
  );
}

function StatBox({ label, value, scale = 1, bold = false }: { label: string; value: string | number; scale?: number; bold?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { fontSize: 20 * scale }]}>{value}</Text>
      <Text style={[styles.statLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    </View>
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
    <Pressable
      onPress={onReview}
      style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
    >
      <Pressable onPress={onPin} hitSlop={10} style={styles.sessionPinBtn}>
        <Text style={[styles.sessionPinIcon, pinned && styles.sessionPinIconActive]}>
          {pinned ? '◆' : '◇'}
        </Text>
      </Pressable>

      <View style={styles.sessionInfo}>
        <Text
          style={[
            styles.sessionTitle,
            recent && styles.sessionTitleRecent,
            pinned && styles.sessionTitlePinned,
            { fontSize: 13 * scale },
          ]}
          numberOfLines={1}
        >
          {session.title}
        </Text>
        <Text style={[styles.sessionMeta, scale > 1 && { fontSize: 10 * scale }, bold && { fontWeight: '700' }]}>
          {session.mode === 'deep_dive' ? 'DEEP' : 'SKIM'} · {session.quizScore}/2 · +{session.xpGained}xp
        </Text>
      </View>

      <Text style={styles.sessionDate}>
        {new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [pausedSession, setPausedSession] = useState<PausedSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [blink, setBlink] = useState(true);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const { scale, bold } = useTextSettings();

  const loadData = useCallback(async () => {
    await initGameState();
    setGameState(getGameState());
    setSessions(await loadSessions());
    setPausedSession(await loadPausedSession());
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleResume = () => {
    if (!pausedSession) return;
    setCurrentSession(pausedSession.lesson, pausedSession.mode, pausedSession.title, pausedSession.sourceType);
    router.push('/session');
  };

  const handleDiscard = async () => {
    await clearPausedSession();
    setPausedSession(null);
  };

  const handleNewSession = async () => {
    await clearPausedSession();
    setPausedSession(null);
    router.push('/new-session');
  };

  const handlePin = async (id: string, currentlyPinned: boolean) => {
    await pinSession(id, !currentlyPinned);
    setSessions(await loadSessions());
  };

  const handleReview = (id: string) => {
    router.push({ pathname: '/review-session', params: { id } });
  };

  const pinnedSessions = sessions.filter(s => s.pinned);
  const unpinned = sessions.filter(s => !s.pinned);
  const tracesToShow = [
    ...pinnedSessions.map(s => ({ session: s, recent: false })),
    ...unpinned.slice(0, 5).map((s, i) => ({ session: s, recent: i < 3 })),
  ];

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#555" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>// RABBIT HOLE</Text>
              <Text style={styles.headerSub}>{`> knowledge_agent${blink ? '_' : ' '}`}</Text>
            </View>
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Text style={styles.settingsBtnText}>⚙</Text>
            </Pressable>
          </View>

          {/* Level card */}
          {levelData && (
            <Pressable onPress={() => setShowLevelModal(true)} style={({ pressed }) => [styles.levelCard, pressed && { opacity: 0.75 }]}>
              <View style={styles.levelRow}>
                <View>
                  <Text style={[styles.levelName, { fontSize: 22 * scale }]}>{levelData.levelName}</Text>
                  <Text style={styles.levelNum}>LEVEL {levelData.level}</Text>
                </View>
                <View style={styles.xpRight}>
                  <Text style={[styles.xpTotal, { fontSize: 22 * scale }]}>{gameState!.totalXP.toLocaleString()}</Text>
                  <Text style={styles.xpLabel}>TOTAL XP</Text>
                </View>
              </View>
              <XPBar progress={levelData.progress} />
              <Text style={styles.xpProgress}>
                {levelData.xpInLevel} / {levelData.xpForNextLevel} XP to next level
              </Text>
            </Pressable>
          )}

          {/* Stats row */}
          {gameState && (
            <View style={styles.statsRow}>
              <StatBox label="HOLES" value={gameState.totalSessions} scale={scale} bold={bold} />
              <StatBox label="STREAK" value={`${gameState.currentStreak}d`} scale={scale} bold={bold} />
              <StatBox label="PERFECT" value={gameState.perfectQuizzes} scale={scale} bold={bold} />
              <StatBox label="DIVES" value={gameState.totalDeepDives} scale={scale} bold={bold} />
            </View>
          )}

          {/* Paused session banner */}
          {pausedSession && (
            <View style={styles.pausedBanner}>
              <Text style={styles.pausedBadge}>◔ PAUSED TRACE</Text>
              <View style={styles.pausedRow}>
                <Text style={styles.pausedTitle} numberOfLines={1}>{pausedSession.title}</Text>
                <Text style={styles.pausedMode}>{pausedSession.mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</Text>
              </View>
              <View style={styles.pausedActions}>
                <Pressable onPress={handleDiscard} style={styles.discardBtn}>
                  <Text style={styles.discardBtnText}>× DISCARD</Text>
                </Pressable>
                <Pressable onPress={handleResume} style={styles.resumeBtn}>
                  <Text style={styles.resumeBtnText}>RESUME →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Dive button */}
          <Pressable
            onPress={handleNewSession}
            style={({ pressed }) => [styles.diveBtn, pressed && styles.diveBtnPressed]}
          >
            <Text style={styles.diveBtnText}>◎ ENTER THE HOLE</Text>
            <Text style={styles.diveBtnSub}>drop a URL or thought</Text>
          </Pressable>


          {/* Session history */}
          {tracesToShow.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>// RECENT TRACES</Text>
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
            </View>
          )}

          {tracesToShow.length === 0 && !pausedSession && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>// NO TRACES YET</Text>
              <Text style={styles.emptyBody}>
                {'Your first rabbit hole awaits.\nDrop a URL or a thought above.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Level history modal */}
      <Modal visible={showLevelModal} transparent animationType="fade" onRequestClose={() => setShowLevelModal(false)}>
        <Pressable style={styles.rankBackdrop} onPress={() => setShowLevelModal(false)}>
          <Pressable style={styles.rankCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {LEVEL_NAMES.map((name, i) => {
                const lvl = i + 1;
                const current = levelData ? lvl === levelData.level : false;
                const done = levelData ? lvl < levelData.level : false;
                return (
                  <View key={name} style={[styles.rankItem, done && styles.rankItemDone, current && styles.rankItemCurrent]}>
                    <Text style={[styles.rankIcon, !done && !current && styles.rankIconLocked, current && styles.rankIconCurrent]}>
                      {LEVEL_ICONS[i]}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rankName, !done && !current && styles.rankNameLocked, current && styles.rankNameCurrent]}>
                        {name}
                      </Text>
                      <Text style={[styles.rankNum, current && styles.rankNumCurrent]}>LEVEL {lvl}</Text>
                    </View>
                    <View style={styles.rankRight}>
                      {current && <Text style={styles.rankHere}>◀ HERE</Text>}
                      {done && <Text style={styles.rankCheck}>♛</Text>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  settingsBtn: { padding: 8 },
  settingsBtnText: { fontSize: 20, color: '#444' },

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

  pausedBanner: {
    backgroundColor: 'rgba(14,14,0,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    marginBottom: 16,
  },
  pausedBadge: {
    fontFamily: MONO,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 8,
  },
  pausedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  pausedTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    flex: 1,
  },
  pausedMode: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#888',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pausedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  discardBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  discardBtnText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },
  resumeBtn: {
    flex: 2,
    backgroundColor: ACCENT,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  resumeBtnText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  diveBtn: {
    backgroundColor: '#efff00',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  diveBtnPressed: { backgroundColor: '#d4e600' },
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
  sessionRowPressed: {
    opacity: 0.6,
  },
  sessionPinBtn: {
    width: 14,
    alignItems: 'center',
  },
  sessionPinIcon: {
    fontFamily: MONO,
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
  },
  sessionPinIconActive: {
    color: ACCENT,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },
  sessionTitleRecent: {
    color: '#ccc',
  },
  sessionTitlePinned: {
    color: '#fff',
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

  rankBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rankCard: {
    width: '100%',
    maxHeight: '80%',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(10,10,10,0.92)',
    marginBottom: 6,
  },
  rankItemDone: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(14,14,14,0.92)',
  },
  rankItemCurrent: {
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(20,20,20,0.96)',
  },
  rankIcon: {
    fontFamily: MONO,
    fontSize: 18,
    color: '#2a2a2a',
    width: 22,
    textAlign: 'center',
  },
  rankIconCurrent: { color: '#fff' },
  rankIconLocked: { color: '#1a1a1a' },
  rankName: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#444',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  rankNameCurrent: { color: '#fff' },
  rankNameLocked: { color: '#1e1e1e' },
  rankNum: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#2a2a2a',
    letterSpacing: 2,
  },
  rankNumCurrent: { color: '#555' },
  rankRight: {
    width: 52,
    alignItems: 'flex-end',
  },
  rankHere: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#555',
    letterSpacing: 1.5,
  },
  rankCheck: {
    fontFamily: MONO,
    fontSize: 14,
    color: ACCENT,
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
