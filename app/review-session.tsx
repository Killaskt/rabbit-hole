import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import { getSessionById, pinSession } from '../lib/storage';
import { SessionRecord } from '../types/lesson';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const ACCENT = '#efff00';

export default function ReviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { router.back(); return; }
    getSessionById(id).then(s => {
      if (!s) { router.back(); return; }
      setSession(s);
      setLoading(false);
    });
  }, [id]);

  const handlePin = async () => {
    if (!session) return;
    await pinSession(session.id, !session.pinned);
    setSession(s => s ? { ...s, pinned: !s.pinned } : s);
  };

  const handleDiveDeeper = (topic: string) => {
    router.push({ pathname: '/new-session', params: { prefill: topic } });
  };

  if (loading || !session) return null;

  const { lesson, cardResults } = session;
  const cards = lesson.cards ?? [];
  const quiz = lesson.quiz ?? [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </Pressable>
          <Text style={styles.headerTitle}>// REVIEW</Text>
          <Pressable onPress={handlePin} style={styles.pinBtn}>
            <Text style={[styles.pinBtnText, session.pinned && styles.pinBtnActive]}>
              {session.pinned ? '◆ UNPIN' : '◇ PIN'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Session metadata */}
          <View style={styles.metaRow}>
            <Text style={styles.metaTitle} numberOfLines={2}>{session.title}</Text>
            <View style={styles.metaBadges}>
              <Text style={styles.metaMode}>{session.mode === 'deep_dive' ? 'DEEP' : 'SKIM'}</Text>
              <Text style={styles.metaScore}>{session.quizScore}/2</Text>
              <Text style={styles.metaDate}>
                {new Date(session.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Cards section */}
          <Text style={styles.sectionLabel}>// CARDS</Text>
          {cards.map((card, i) => {
            const result = cardResults?.[i];
            return (
              <View key={card.id} style={styles.cardBlock}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIndex}>C{i + 1}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {result && (
                    <Text style={[
                      styles.cardResultBadge,
                      result === 'acquired' ? styles.cardResultAcquired : styles.cardResultNoted,
                    ]}>
                      {result === 'acquired' ? 'ACQUIRED' : 'NOTED'}
                    </Text>
                  )}
                </View>
                <Text style={styles.cardBody}>{card.body}</Text>
              </View>
            );
          })}

          {/* Quiz section */}
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>// QUIZ</Text>
          {quiz.map((q, qi) => (
            <View key={qi} style={styles.quizBlock}>
              <Text style={styles.quizNum}>Q{qi + 1}</Text>
              <Text style={styles.quizText}>{q.q}</Text>
              <View style={styles.quizChoices}>
                {q.choices.map((choice, ci) => (
                  <View
                    key={ci}
                    style={[
                      styles.quizChoice,
                      ci === q.answer_index && styles.quizChoiceCorrect,
                    ]}
                  >
                    <Text style={styles.quizChoiceLetter}>{String.fromCharCode(65 + ci)}</Text>
                    <Text style={[
                      styles.quizChoiceText,
                      ci === q.answer_index && styles.quizChoiceTextCorrect,
                      ci !== q.answer_index && styles.quizChoiceTextDim,
                    ]}>
                      {choice}
                    </Text>
                    {ci === q.answer_index && <Text style={styles.correctMark}>✓</Text>}
                  </View>
                ))}
              </View>
              <View style={styles.explanationBox}>
                <Text style={styles.explanationLabel}>// EXPLANATION</Text>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            </View>
          ))}

          {/* Go deeper section */}
          {lesson.deeper && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>// GO DEEPER</Text>
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
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#444',
    letterSpacing: 2,
  },
  pinBtn: { paddingVertical: 4, paddingLeft: 8 },
  pinBtnText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },
  pinBtnActive: {
    color: ACCENT,
  },

  scroll: { padding: 20, paddingBottom: 48 },

  metaRow: {
    marginBottom: 28,
  },
  metaTitle: {
    fontFamily: MONO,
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 26,
    marginBottom: 10,
  },
  metaBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaMode: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#666',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaScore: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  metaDate: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 0.5,
  },

  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 14,
  },

  cardBlock: {
    backgroundColor: 'rgba(14,14,14,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardIndex: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 1,
    width: 20,
  },
  cardTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  cardResultBadge: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardResultAcquired: {
    color: ACCENT,
    borderColor: ACCENT,
  },
  cardResultNoted: {
    color: '#aaa',
    borderColor: '#aaa',
  },
  cardBody: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#888',
    lineHeight: 21,
    letterSpacing: 0.2,
  },

  quizBlock: {
    backgroundColor: 'rgba(14,14,14,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 14,
  },
  quizNum: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 8,
  },
  quizText: {
    fontFamily: MONO,
    fontSize: 15,
    color: '#fff',
    lineHeight: 23,
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  quizChoices: { gap: 8, marginBottom: 14 },
  quizChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    gap: 10,
  },
  quizChoiceCorrect: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(239,255,0,0.05)',
  },
  quizChoiceLetter: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    fontWeight: '700',
    width: 16,
  },
  quizChoiceText: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  quizChoiceTextCorrect: { color: ACCENT },
  quizChoiceTextDim: { color: '#2a2a2a' },
  correctMark: {
    fontFamily: MONO,
    fontSize: 13,
    color: ACCENT,
    fontWeight: '700',
  },
  explanationBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
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
    color: '#666',
    lineHeight: 18,
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
    color: ACCENT,
  },
  deeperTopic: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#aaa',
    letterSpacing: 0.5,
    flex: 1,
  },
});
