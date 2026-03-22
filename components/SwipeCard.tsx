import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyTerm, LessonCard } from '../types/lesson';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const ACCENT = '#efff00';

interface Props {
  card: LessonCard;
  index: number;
  total: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

export default function SwipeCard({ card, index, total, onSwipeRight, onSwipeLeft }: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const [activeTerm, setActiveTerm] = useState<KeyTerm | null>(null);

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const rightLabelOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftLabelOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      // false: let taps reach child Pressables; movement still triggers via onMove
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: width + 100, y: gesture.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeRight();
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -width - 100, y: gesture.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeLeft();
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const handleShare = async () => {
    await Share.share({ message: `${card.title}\n\n${card.body}` });
  };

  const terms = card.key_terms ?? [];

  return (
    <>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Swipe labels */}
        <Animated.View style={[styles.label, styles.labelRight, { opacity: rightLabelOpacity }]}>
          <Text style={[styles.labelText, { color: ACCENT }]}>ACQUIRED</Text>
        </Animated.View>
        <Animated.View style={[styles.label, styles.labelLeft, { opacity: leftLabelOpacity }]}>
          <Text style={[styles.labelText, { color: '#aaaaaa' }]}>NOTED</Text>
        </Animated.View>

        {/* Card header */}
        <View style={styles.header}>
          <Text style={styles.cardId}>{card.id.toUpperCase()}</Text>
          <Text style={styles.cardSubtitle}>{card.subtitle ?? ''}</Text>
          <Text style={styles.progress}>{index + 1} / {total}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Card title */}
        <Text style={styles.title}>{card.title}</Text>

        {/* Card body */}
        <Text style={styles.body}>{card.body}</Text>

        {/* Key terms */}
        {terms.length > 0 && (
          <View style={styles.termsRow}>
            {terms.map((kt) => (
              <Pressable
                key={kt.term}
                onPress={() => setActiveTerm(kt)}
                style={({ pressed }) => [styles.termChip, pressed && styles.termChipPressed]}
              >
                <Text style={styles.termChipText}>{kt.term}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Footer: swipe hint + share */}
        <View style={styles.footer}>
          <Text style={styles.hint}>{'< swipe >'}</Text>
          <Pressable onPress={handleShare} hitSlop={8}>
            {({ pressed }) => (
              <Text style={[styles.shareBtn, pressed && styles.shareBtnPressed]}>↑</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>

      {/* Key term popup */}
      {activeTerm && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setActiveTerm(null)}
        >
          <Pressable style={styles.termOverlay} onPress={() => setActiveTerm(null)}>
            <Pressable style={styles.termPopup} onPress={() => {}}>
              <Text style={styles.termPopupTerm}>{activeTerm.term}</Text>
              <View style={styles.termPopupDivider} />
              <Text style={styles.termPopupExplanation}>{activeTerm.explanation}</Text>
              <Pressable onPress={() => setActiveTerm(null)} style={styles.termPopupClose}>
                {({ pressed }) => (
                  <Text style={[styles.termPopupCloseText, pressed && { color: '#888' }]}>
                    [ CLOSE ]
                  </Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: width - 40,
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 28,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    position: 'absolute',
    top: 28,
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  labelRight: {
    right: 28,
    borderColor: ACCENT,
    transform: [{ rotate: '12deg' }],
  },
  labelLeft: {
    left: 28,
    borderColor: '#aaaaaa',
    transform: [{ rotate: '-12deg' }],
  },
  labelText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardId: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginRight: 10,
  },
  cardSubtitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 1.5,
    flex: 1,
  },
  progress: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 22,
  },
  title: {
    fontFamily: MONO,
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    lineHeight: 28,
  },
  body: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#aaaaaa',
    lineHeight: 22,
    letterSpacing: 0.2,
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  termChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  termChipPressed: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  termChipText: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#666',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#333',
    letterSpacing: 2,
  },
  shareBtn: {
    fontFamily: MONO,
    fontSize: 14,
    color: '#333',
  },
  shareBtnPressed: {
    color: '#888',
  },

  // Term popup
  termOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  termPopup: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 24,
    width: '100%',
  },
  termPopupTerm: {
    fontFamily: MONO,
    fontSize: 16,
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  termPopupDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
  },
  termPopupExplanation: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 22,
  },
  termPopupClose: {
    alignSelf: 'center',
  },
  termPopupCloseText: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: 2,
  },
});
