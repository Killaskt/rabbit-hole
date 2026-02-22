import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../components/LiquidBackground';
import XPBurst from '../components/XPBurst';
import AchievementToast from '../components/AchievementToast';
import { Achievement, recordDrill } from '../lib/gameState';
import { dismissQuestion, getDismissedQuestions, loadSessions } from '../lib/storage';
import { QuizQuestion } from '../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const ACCENT = '#efff00';
const XP_PER_CORRECT = 15;
const DRILL_SIZE = 5;

interface DrillQuestion extends QuizQuestion {
  sourceTitle: string;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DrillScreen() {
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [done, setDone] = useState(false);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [achIndex, setAchIndex] = useState(0);
  const totalRef = useRef(0);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const doneAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([loadSessions(), getDismissedQuestions()]).then(([sessions, dismissed]) => {
      const all: DrillQuestion[] = [];
      for (const s of sessions) {
        if (s.mode !== 'deep_dive') continue; // skip skim sessions
        for (const q of s.lesson?.quiz ?? []) {
          if (!dismissed.includes(q.q)) {
            all.push({ ...q, sourceTitle: s.title });
          }
        }
      }
      setQuestions(shuffle(all).slice(0, DRILL_SIZE));
      setLoading(false);
    });
  }, []);

  const currentQ = questions[questionIndex];
  const isLast = questionIndex === questions.length - 1;

  const handleAnswer = (choiceIndex: number) => {
    if (answerState !== 'unanswered') return;

    setSelected(choiceIndex);
    const isCorrect = choiceIndex === currentQ.answer_index;
    setAnswerState(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setTotalXPEarned(prev => prev + XP_PER_CORRECT);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const burstId = Date.now();
      setXPBursts(prev => [...prev, { id: burstId, amount: XP_PER_CORRECT }]);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  const finishDrill = async (finalScore: number, finalTotal: number) => {
    const result = await recordDrill(finalScore, finalTotal);
    setTotalXPEarned(result.xpEarned);
    setNewAchievements(result.newAchievements);
    totalRef.current = finalTotal;
    setDone(true);
    Animated.timing(doneAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleNext = async () => {
    if (isLast) {
      await finishDrill(scoreRef.current, questions.length);
    } else {
      Animated.timing(slideAnim, { toValue: -1, duration: 200, useNativeDriver: true }).start(() => {
        setQuestionIndex(i => i + 1);
        setSelected(null);
        setAnswerState('unanswered');
        slideAnim.setValue(1);
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      });
    }
  };

  const handleDismiss = async () => {
    await dismissQuestion(currentQ.q);
    const remaining = questions.filter((_, i) => i !== questionIndex);
    if (remaining.length === 0) {
      await finishDrill(scoreRef.current, questions.length - 1);
    } else {
      // Keep index in bounds after removal
      const nextIndex = questionIndex >= remaining.length ? remaining.length - 1 : questionIndex;
      setQuestions(remaining);
      setQuestionIndex(nextIndex);
      setSelected(null);
      setAnswerState('unanswered');
    }
  };

  const flashColor = flashAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['rgba(248,113,113,0.08)', 'rgba(0,0,0,0)', 'rgba(74,222,128,0.08)'],
  });
  const slideTranslate = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-40, 0, 40],
  });

  function choiceStyle(idx: number) {
    if (answerState === 'unanswered') return styles.choiceBtn;
    if (idx === currentQ.answer_index) return [styles.choiceBtn, styles.choiceCorrect];
    if (idx === selected && answerState === 'wrong') return [styles.choiceBtn, styles.choiceWrong];
    return [styles.choiceBtn, styles.choiceDim];
  }
  function choiceTextStyle(idx: number) {
    if (answerState === 'unanswered') return styles.choiceText;
    if (idx === currentQ.answer_index) return [styles.choiceText, styles.choiceTextCorrect];
    if (idx === selected && answerState === 'wrong') return [styles.choiceText, styles.choiceTextWrong];
    return [styles.choiceText, styles.choiceTextDim];
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!loading && questions.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LiquidBackground />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyLabel}>// NO DATA</Text>
            <Text style={styles.emptyBody}>
              Complete at least one session{'\n'}to unlock recall drills.
            </Text>
            <Pressable onPress={() => router.replace('/')} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>← BACK</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    const finalTotal = totalRef.current;
    const pct = finalTotal > 0 ? Math.round((scoreRef.current / finalTotal) * 100) : 0;
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LiquidBackground />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View style={[styles.doneWrap, { opacity: doneAnim }]}>
            <Text style={styles.doneLabel}>// RECALL COMPLETE</Text>
            <Text style={styles.doneScore}>{scoreRef.current}/{finalTotal}</Text>
            <Text style={styles.donePct}>{pct}% retention</Text>
            {totalXPEarned > 0 && (
              <Text style={styles.doneXP}>+{totalXPEarned} XP</Text>
            )}
            <Pressable onPress={() => router.replace('/')} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>◎ BACK TO SURFACE</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
        {newAchievements[achIndex] && (
          <AchievementToast
            key={achIndex}
            achievement={newAchievements[achIndex]}
            onDone={() => setAchIndex(i => i + 1)}
          />
        )}
      </View>
    );
  }

  if (loading || !currentQ) return null;

  // ── Quiz ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />

      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: flashColor }]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← EXIT</Text>
          </Pressable>
          <Text style={styles.headerLabel}>// RECALL</Text>
          <Text style={styles.scoreText}>{score}/{questionIndex + (answerState !== 'unanswered' ? 1 : 0)}</Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {questions.map((_, i) => (
            <View key={i} style={[
              styles.dot,
              i === questionIndex && styles.dotActive,
              i < questionIndex && styles.dotDone,
            ]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Source label */}
          <Text style={styles.sourceLabel} numberOfLines={1}>
            from: {currentQ.sourceTitle}
          </Text>

          {/* Question */}
          <Animated.View style={[styles.questionCard, { transform: [{ translateX: slideTranslate }] }]}>
            <Text style={styles.qNum}>Q{questionIndex + 1}</Text>
            <Text style={styles.qText}>{currentQ.q}</Text>
          </Animated.View>

          {/* Choices */}
          <Animated.View style={[styles.choices, { transform: [{ translateX: slideTranslate }] }]}>
            {currentQ.choices.map((choice, idx) => (
              <Pressable
                key={idx}
                style={choiceStyle(idx)}
                onPress={() => handleAnswer(idx)}
                disabled={answerState !== 'unanswered'}
              >
                <Text style={styles.choiceLetter}>{String.fromCharCode(65 + idx)}</Text>
                <Text style={choiceTextStyle(idx)}>{choice}</Text>
                {answerState !== 'unanswered' && idx === currentQ.answer_index && (
                  <Text style={styles.correctMark}>✓</Text>
                )}
                {answerState !== 'unanswered' && idx === selected && answerState === 'wrong' && idx !== currentQ.answer_index && (
                  <Text style={styles.wrongMark}>✗</Text>
                )}
              </Pressable>
            ))}
          </Animated.View>

          {/* Not interested */}
          {answerState === 'unanswered' && (
            <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
              <Text style={styles.dismissBtnText}>NOT INTERESTED</Text>
            </Pressable>
          )}

          {/* Explanation */}
          {answerState !== 'unanswered' && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>
                {answerState === 'correct' ? '// CORRECT' : '// INCORRECT'}
              </Text>
              <Text style={styles.explanationText}>{currentQ.explanation}</Text>
            </View>
          )}

          {/* Next */}
          {answerState !== 'unanswered' && (
            <Pressable onPress={handleNext} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>
                {isLast ? 'FINISH RECALL →' : 'NEXT →'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      {xpBursts.map(burst => (
        <XPBurst
          key={burst.id}
          amount={burst.amount}
          onDone={() => setXPBursts(prev => prev.filter(b => b.id !== burst.id))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: { paddingRight: 4 },
  backBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 1,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#444',
    letterSpacing: 2,
    flex: 1,
  },
  scoreText: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  sourceLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#333',
    letterSpacing: 1,
    marginBottom: 10,
  },

  questionCard: {
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 22,
    marginBottom: 16,
  },
  qNum: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 10,
  },
  qText: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    letterSpacing: 0.3,
  },

  choices: { gap: 10 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.90)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  choiceCorrect: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(239,255,0,0.06)',
  },
  choiceWrong: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248,113,113,0.06)',
  },
  choiceDim: {
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(10,10,10,0.60)',
  },
  choiceLetter: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
    width: 18,
  },
  choiceText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    flex: 1,
    lineHeight: 20,
  },
  choiceTextCorrect: { color: ACCENT },
  choiceTextWrong: { color: '#f87171' },
  choiceTextDim: { color: '#2a2a2a' },
  correctMark: { fontFamily: MONO, fontSize: 14, color: ACCENT, fontWeight: '700' },
  wrongMark: { fontFamily: MONO, fontSize: 14, color: '#f87171', fontWeight: '700' },

  dismissBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#333',
    letterSpacing: 2,
  },

  explanationBox: {
    backgroundColor: 'rgba(12,12,12,0.90)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    marginTop: 12,
  },
  explanationLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 6,
  },
  explanationText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },

  nextBtn: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  nextBtnText: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyLabel: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 16,
  },
  emptyBody: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Done screen ──────────────────────────────────────────────────────────
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  doneLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 20,
  },
  doneScore: {
    fontFamily: MONO,
    fontSize: 64,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 72,
  },
  donePct: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#555',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  doneXP: {
    fontFamily: MONO,
    fontSize: 20,
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 40,
  },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 18,
    paddingHorizontal: 32,
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
