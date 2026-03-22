import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  // Animated used for scaleAnim/fadeAnim
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AchievementToast from '../components/AchievementToast';
import LiquidBackground from '../components/LiquidBackground';
import { Achievement, XPBreakdown, getLevelProgress, getGameState, recordSession } from '../lib/gameState';
import { addSession } from '../lib/storage';
import { clearCurrentSession, getCurrentSession } from '../lib/sessionStore';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const SCORE_MSGS = [
  '// SUBOPTIMAL — REVIEW RECOMMENDED',
  '// PARTIAL ACQUISITION',
  '// FULL ACQUISITION — KNOWLEDGE SECURED',
];

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ score: string; mode: string }>();
  const quizScore = parseInt(params.score ?? '0', 10);
  const { lesson, mode, title, sourceType, cardResults } = getCurrentSession();

  const [xp, setXP] = useState<XPBreakdown | null>(null);
  const [displayedXP, setDisplayedXP] = useState(0);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [currentAchIndex, setCurrentAchIndex] = useState(0);
  const [levelUp, setLevelUp] = useState(false);
  const [levelData, setLevelData] = useState<ReturnType<typeof getLevelProgress> | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lesson) { router.replace('/'); return; }

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

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    run();
  }, []);

  const handleDone = () => {
    clearCurrentSession();
    router.replace('/');
  };

  const handleDiveDeeper = (topic: string) => {
    clearCurrentSession();
    router.push({ pathname: '/new-session', params: { prefill: topic } });
  };

  if (!lesson) return null;

  const scoreMsg = SCORE_MSGS[Math.min(quizScore, 2)];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            {/* Score header */}
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>{scoreMsg}</Text>
              <Text style={styles.scoreValue}>{quizScore}/2</Text>
              <Text style={styles.scoreTitle}>{title}</Text>
            </View>

            {/* XP card */}
            {xp && (
              <View style={styles.xpCard}>
                <Text style={styles.xpLabel}>// XP EARNED</Text>
                <Text style={styles.xpTotal}>+{displayedXP}</Text>

                <View style={styles.xpBreakdown}>
                  <View style={styles.xpRow}>
                    <Text style={styles.xpRowLabel}>SESSION BASE</Text>
                    <Text style={styles.xpRowValue}>+{xp.sessionBase}</Text>
                  </View>
                  {xp.quizBonus > 0 && (
                    <View style={styles.xpRow}>
                      <Text style={styles.xpRowLabel}>QUIZ SCORE</Text>
                      <Text style={styles.xpRowValue}>+{xp.quizBonus}</Text>
                    </View>
                  )}
                  {xp.perfectBonus > 0 && (
                    <View style={styles.xpRow}>
                      <Text style={styles.xpRowLabel}>PERFECT QUIZ</Text>
                      <Text style={[styles.xpRowValue, { color: '#efff00' }]}>+{xp.perfectBonus}</Text>
                    </View>
                  )}
                  {xp.streakBonus > 0 && (
                    <View style={styles.xpRow}>
                      <Text style={styles.xpRowLabel}>STREAK BONUS</Text>
                      <Text style={[styles.xpRowValue, { color: '#fbbf24' }]}>+{xp.streakBonus}</Text>
                    </View>
                  )}
                </View>

                {levelUp && levelData && (
                  <View style={styles.levelUpBanner}>
                    <Text style={styles.levelUpText}>◎ LEVEL UP — {levelData.levelName}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Deeper rabbit holes */}
            {lesson.deeper && (
              <View style={styles.deeperSection}>
                <Text style={styles.deeperLabel}>// DIG DEEPER</Text>
                {lesson.deeper.map((topic, i) => (
                  <Pressable
                    key={i}
                    style={styles.deeperBtn}
                    onPress={() => handleDiveDeeper(topic)}
                  >
                    <Text style={styles.deeperArrow}>→</Text>
                    <Text style={styles.deeperTopic}>{topic}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Done button */}
            <Pressable onPress={handleDone} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>◎ BACK TO SURFACE</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Achievement toasts */}
      {newAchievements[currentAchIndex] && (
        <AchievementToast
          key={currentAchIndex}
          achievement={newAchievements[currentAchIndex]}
          onDone={() => setCurrentAchIndex(i => i + 1)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  scoreHeader: {
    marginTop: 8,
    marginBottom: 24,
  },
  scoreLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 10,
  },
  scoreValue: {
    fontFamily: MONO,
    fontSize: 56,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 64,
  },
  scoreTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    marginTop: 8,
    letterSpacing: 0.5,
  },

  xpCard: {
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 22,
    marginBottom: 20,
  },
  xpLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 8,
  },
  xpTotal: {
    fontFamily: MONO,
    fontSize: 40,
    color: '#efff00',
    fontWeight: '700',
    marginBottom: 20,
  },
  xpBreakdown: { gap: 8 },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  xpRowLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 1,
  },
  xpRowValue: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1,
    fontWeight: '700',
  },

  levelUpBanner: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  levelUpText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#efff00',
    fontWeight: '700',
    letterSpacing: 2,
  },

  deeperSection: {
    marginBottom: 24,
  },
  deeperLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 12,
  },
  deeperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  deeperArrow: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#efff00',
  },
  deeperTopic: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#aaa',
    letterSpacing: 0.5,
    flex: 1,
  },

  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 18,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 2,
  },
});
