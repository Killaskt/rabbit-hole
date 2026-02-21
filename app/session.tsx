import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../components/LiquidBackground';
import SwipeCard from '../components/SwipeCard';
import XPBurst from '../components/XPBurst';
import { getCurrentSession } from '../lib/sessionStore';
import { hasSeenSwipeHint, markSwipeHintSeen } from '../lib/storage';
import { LessonCard } from '../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const { width } = Dimensions.get('window');
const XP_PER_CARD = 10;
const ACCENT = '#efff00';

// ── Swipe hint overlay (shown once) ──────────────────────────────────────────

function SwipeHint({ onDismiss }: { onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  return (
    <Animated.View style={[styles.hintOverlay, { opacity }]}>
      <View style={styles.hintCard}>
        <Text style={styles.hintTitle}>// SWIPE GUIDE</Text>

        <View style={styles.hintRow}>
          <View style={styles.hintSide}>
            <Text style={styles.hintArrow}>←</Text>
            <Text style={styles.hintTagNoted}>NOTED</Text>
            <Text style={styles.hintSideDesc}>logged, moving on</Text>
          </View>

          <View style={styles.hintDividerV} />

          <View style={styles.hintSide}>
            <Text style={styles.hintArrow}>→</Text>
            <Text style={styles.hintTagAcquired}>ACQUIRED</Text>
            <Text style={styles.hintSideDesc}>you got it</Text>
          </View>
        </View>

        <Text style={styles.hintBody}>
          Both directions advance the card — the label is just your signal to yourself. Swipe whichever feels right.
        </Text>

        <Pressable onPress={dismiss} style={styles.hintBtn}>
          <Text style={styles.hintBtnText}>GOT IT</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { lesson, mode, title } = getCurrentSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpBursts, setXPBursts] = useState<{ id: number; amount: number }[]>([]);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [key, setKey] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const cards: LessonCard[] = lesson?.cards ?? [];
  const total = cards.length;

  useEffect(() => {
    if (!lesson) { router.replace('/'); return; }
    hasSeenSwipeHint().then(seen => { if (!seen) setShowHint(true); });
  }, []);

  const handleDismissHint = () => {
    markSwipeHintSeen();
    setShowHint(false);
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentIndex / total),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const advanceCard = (direction: 'right' | 'left') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // XP burst
    const burstId = Date.now();
    setXPBursts(prev => [...prev, { id: burstId, amount: XP_PER_CARD }]);
    setTotalXPEarned(prev => prev + XP_PER_CARD);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= total) {
      // All cards done → go to quiz
      setTimeout(() => {
        router.replace('/quiz');
      }, 300);
    } else {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setCurrentIndex(nextIndex);
      setKey(k => k + 1);
    }
  };

  if (!lesson) return null;

  const currentCard = cards[currentIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.topRight}>
            <Text style={styles.modeTag}>{mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</Text>
            <Text style={styles.xpEarned}>+{totalXPEarned}xp</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          <Animated.View style={{ opacity: fadeAnim, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SwipeCard
              key={key}
              card={currentCard}
              index={currentIndex}
              total={total}
              onSwipeRight={() => advanceCard('right')}
              onSwipeLeft={() => advanceCard('left')}
            />
          </Animated.View>
        </View>

        {/* Dot indicators */}
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i < currentIndex && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Skip to quiz hint */}
        <Text style={styles.hint}>
          {currentIndex === 0 ? 'swipe cards to advance' : `${total - currentIndex} card${total - currentIndex !== 1 ? 's' : ''} remaining`}
        </Text>
      </SafeAreaView>

      {/* XP bursts */}
      {xpBursts.map(burst => (
        <XPBurst
          key={burst.id}
          amount={burst.amount}
          onDone={() => setXPBursts(prev => prev.filter(b => b.id !== burst.id))}
        />
      ))}

      {/* First-time swipe guide */}
      {showHint && <SwipeHint onDismiss={handleDismissHint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 1,
    flex: 1,
    marginRight: 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeTag: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#333',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  xpEarned: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#4ade80',
    letterSpacing: 1,
    fontWeight: '700',
  },

  progressBg: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },

  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  dotDone: {
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  hint: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#333',
    letterSpacing: 1.5,
    textAlign: 'center',
    paddingBottom: 12,
  },

  // ── Swipe hint overlay ──────────────────────────────────────────────────────
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 24,
  },
  hintCard: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 28,
  },
  hintTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 24,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  hintSide: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  hintDividerV: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  hintArrow: {
    fontFamily: MONO,
    fontSize: 26,
    color: '#555',
  },
  hintTagNoted: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#aaa',
    fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hintTagAcquired: {
    fontFamily: MONO,
    fontSize: 13,
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hintSideDesc: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 0.5,
  },
  hintBody: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    lineHeight: 19,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  hintBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  hintBtnText: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 2,
  },
});
