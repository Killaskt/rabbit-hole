import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../components/LiquidBackground';
import XPBurst from '../components/XPBurst';
import { getCurrentSession } from '../lib/sessionStore';
import { savePausedSession } from '../lib/storage';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const XP_CORRECT = 25;

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizScreen() {
  const { lesson, mode, title, sourceType, cardResults } = getCurrentSession();
  const quiz = lesson?.quiz ?? [];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [abandonState, setAbandonState] = useState<'idle' | 'confirming'>('idle');
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    };
  }, []);

  const handleExitTap = () => {
    if (abandonState === 'idle') {
      setAbandonState('confirming');
      abandonTimerRef.current = setTimeout(() => setAbandonState('idle'), 3000);
    } else {
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
      savePausedSession({
        lesson: lesson!,
        mode,
        title,
        sourceType,
        cardResults,
        pausedAt: Date.now(),
      });
      router.replace('/');
    }
  };

  const currentQ = quiz[questionIndex];
  const isLast = questionIndex === quiz.length - 1;

  const handleAnswer = (choiceIndex: number) => {
    if (answerState !== 'unanswered') return;

    setSelected(choiceIndex);
    const isCorrect = choiceIndex === currentQ.answer_index;
    const newState: AnswerState = isCorrect ? 'correct' : 'wrong';
    setAnswerState(newState);
    setShowExplanation(true);

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const burstId = Date.now();
      setXPBursts(prev => [...prev, { id: burstId, amount: XP_CORRECT }]);

      // Green flash
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Red flash
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleNext = () => {
    if (isLast) {
      router.replace({
        pathname: '/results',
        params: { score: String(scoreRef.current), mode },
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: -1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setQuestionIndex(i => i + 1);
        setSelected(null);
        setAnswerState('unanswered');
        setShowExplanation(false);
        slideAnim.setValue(1);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
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
    if (answerState === 'unanswered') {
      return styles.choiceBtn;
    }
    if (idx === currentQ.answer_index) {
      return [styles.choiceBtn, styles.choiceCorrect];
    }
    if (idx === selected && answerState === 'wrong') {
      return [styles.choiceBtn, styles.choiceWrong];
    }
    return [styles.choiceBtn, styles.choiceDim];
  }

  function choiceTextStyle(idx: number) {
    if (answerState === 'unanswered') return styles.choiceText;
    if (idx === currentQ.answer_index) return [styles.choiceText, styles.choiceTextCorrect];
    if (idx === selected && answerState === 'wrong') return [styles.choiceText, styles.choiceTextWrong];
    return [styles.choiceText, styles.choiceTextDim];
  }

  if (!lesson) {
    router.replace('/');
    return null;
  }

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
          <Text style={styles.headerLabel}>// KNOWLEDGE CHECK</Text>
          <View style={styles.headerRight}>
            <Text style={styles.scoreText}>{score}/{questionIndex + (answerState !== 'unanswered' ? 1 : 0)}</Text>
            <Pressable onPress={handleExitTap} style={styles.exitBtn}>
              <Text style={[styles.exitBtnText, abandonState === 'confirming' && styles.exitBtnConfirming]}>
                {abandonState === 'confirming' ? 'ABORT?' : 'EXIT'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {quiz.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === questionIndex && styles.dotActive,
                i < questionIndex && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Question */}
        <Animated.View
          style={[
            styles.questionCard,
            { transform: [{ translateX: slideTranslate }] },
          ]}
        >
          <Text style={styles.qNum}>Q{questionIndex + 1}</Text>
          <Text style={styles.qText}>{currentQ.q}</Text>
        </Animated.View>

        {/* Choices */}
        <Animated.View
          style={[styles.choices, { transform: [{ translateX: slideTranslate }] }]}
        >
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

        {/* Explanation */}
        {showExplanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>
              {answerState === 'correct' ? '// CORRECT' : '// INCORRECT'}
            </Text>
            <Text style={styles.explanationText}>{currentQ.explanation}</Text>
          </View>
        )}

        {/* Next button */}
        {answerState !== 'unanswered' && (
          <Pressable onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>
              {isLast ? 'SEE RESULTS →' : 'NEXT QUESTION →'}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>

      {/* XP bursts */}
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
  safe: { flex: 1, padding: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#444',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  exitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  exitBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 1.5,
  },
  exitBtnConfirming: {
    color: '#f87171',
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
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

  choices: { gap: 10, flex: 1 },

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
    borderColor: '#efff00',
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
  choiceTextCorrect: { color: '#efff00' },
  choiceTextWrong: { color: '#f87171' },
  choiceTextDim: { color: '#2a2a2a' },
  correctMark: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#efff00',
    fontWeight: '700',
  },
  wrongMark: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#f87171',
    fontWeight: '700',
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
});
