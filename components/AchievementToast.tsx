import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Achievement } from '../lib/gameState';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

interface Props {
  achievement: Achievement;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.icon}>{achievement.icon}</Text>
      <View style={styles.textGroup}>
        <Text style={styles.label}>// ACHIEVEMENT UNLOCKED</Text>
        <Text style={styles.name}>{achievement.name}</Text>
        <Text style={styles.desc}>{achievement.desc}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 14,
    zIndex: 999,
    gap: 14,
  },
  icon: {
    fontSize: 28,
    color: '#ffffff',
  },
  textGroup: {
    flex: 1,
  },
  label: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  name: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  desc: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
});
