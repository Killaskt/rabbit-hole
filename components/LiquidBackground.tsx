/**
 * LiquidBackground — animated blobs using React Native's built-in Animated API.
 * No react-native-reanimated dependency, works in Expo Go.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface BlobCfg {
  x0: number; x1: number;
  y0: number; y1: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
}

const BLOBS: BlobCfg[] = [
  {
    x0: 0.10, x1: 0.62, y0: 0.08, y1: 0.34,
    size: 260, dur: 11000, delay: 0,
    color: 'rgba(255,255,255,0.055)',
  },
  {
    x0: 0.65, x1: 0.14, y0: 0.52, y1: 0.74,
    size: 200, dur: 14000, delay: 2500,
    color: 'rgba(239,255,0,0.04)',
  },
  {
    x0: 0.38, x1: 0.70, y0: 0.28, y1: 0.80,
    size: 160, dur: 9000, delay: 1200,
    color: 'rgba(255,255,255,0.04)',
  },
];

function Blob({ x0, x1, y0, y1, size, dur, delay, color }: BlobCfg) {
  const tx = useRef(new Animated.Value(width * x0 - size / 2)).current;
  const ty = useRef(new Animated.Value(height * y0 - size / 2)).current;

  useEffect(() => {
    const animX = Animated.loop(
      Animated.sequence([
        Animated.timing(tx, {
          toValue: width * x1 - size / 2,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tx, {
          toValue: width * x0 - size / 2,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const animY = Animated.loop(
      Animated.sequence([
        Animated.timing(ty, {
          toValue: height * y1 - size / 2,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: height * y0 - size / 2,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      animX.start();
      animY.start();
    }, delay);

    return () => {
      clearTimeout(timer);
      animX.stop();
      animY.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          left: 0,
          top: 0,
          backgroundColor: color,
        },
        { transform: [{ translateX: tx }, { translateY: ty }] },
      ]}
    />
  );
}

export default function LiquidBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BLOBS.map((b, i) => (
        <Blob key={i} {...b} />
      ))}
    </View>
  );
}
