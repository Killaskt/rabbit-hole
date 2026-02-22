import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../components/LiquidBackground';
import { fetchOGTags, generateLesson } from '../lib/claude';
import { setCurrentSession } from '../lib/sessionStore';
import { getApiKey } from '../lib/storage';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const LOADING_MSGS = [
  '> INITIATING DIVE SEQUENCE...',
  '> PARSING SIGNAL...',
  '> EXTRACTING KNOWLEDGE NODES...',
  '> COMPILING MICRO-LESSON...',
  '> BUILDING CARD DECK...',
  '> ENCRYPTING INSIGHTS...',
  '> ALMOST THERE...',
];

export default function NewSessionScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>();
  const [mode, setMode] = useState<'skim' | 'deep_dive'>('skim');
  const [sourceType, setSourceType] = useState<'url' | 'thought'>('thought');
  const [urlInput, setUrlInput] = useState('');
  const [thoughtInput, setThoughtInput] = useState(params.prefill ?? '');
  const [intentInput, setIntentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [error, setError] = useState('');

  const msgIndex = useRef(0);
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const startLoadingMessages = () => {
    msgIndex.current = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    loadingInterval.current = setInterval(() => {
      msgIndex.current = (msgIndex.current + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIndex.current]);
    }, 900);
  };

  const stopLoadingMessages = () => {
    if (loadingInterval.current) clearInterval(loadingInterval.current);
  };

  const handleDive = async () => {
    Keyboard.dismiss();
    setError('');

    const apiKey = await getApiKey();
    if (!apiKey) {
      setError('No API key. Go to Settings first.');
      return;
    }

    const rawInput = sourceType === 'url' ? urlInput.trim() : thoughtInput.trim();
    if (!rawInput) {
      setError(sourceType === 'url' ? 'Enter a URL.' : 'Enter a thought.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    startLoadingMessages();

    try {
      let ogData = { og_title: '', og_description: '', domain: '', site_name: '' };
      let title = rawInput.slice(0, 80);

      if (sourceType === 'url') {
        ogData = await fetchOGTags(rawInput);
        title = ogData.og_title || ogData.domain || rawInput.slice(0, 80);
      } else {
        title = rawInput.slice(0, 80);
      }

      const lesson = await generateLesson({
        mode,
        source_type: sourceType,
        user_intent: intentInput.trim(),
        url: sourceType === 'url' ? rawInput : '',
        domain: ogData.domain,
        site_name: ogData.site_name,
        og_title: ogData.og_title,
        og_description: ogData.og_description,
        thought: sourceType === 'thought' ? rawInput : '',
      });

      setCurrentSession(lesson, mode, title, sourceType);
      stopLoadingMessages();
      setLoading(false);
      router.replace('/session');
    } catch (e: unknown) {
      stopLoadingMessages();
      setLoading(false);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (msg === 'NO_API_KEY') {
        setError('No API key. Go to Settings.');
      } else if (msg === 'PARSE_ERROR') {
        setError('Bad response from AI. Try again.');
      } else {
        setError(msg.slice(0, 120));
      }
    }
  };

  const isDisabled = loading || (sourceType === 'url' ? !urlInput.trim() : !thoughtInput.trim());

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                  <Text style={styles.backText}>← BACK</Text>
                </Pressable>
                <Text style={styles.title}>NEW SESSION</Text>
              </View>

              {/* Mode selector */}
              <Text style={styles.label}>// MODE</Text>
              <View style={styles.toggle}>
                {(['skim', 'deep_dive'] as const).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                      {m === 'skim' ? 'SKIM' : 'DEEP DIVE'}
                    </Text>
                    {m === 'deep_dive' && (
                      <Text style={[styles.toggleSub, mode === m && styles.toggleSubActive]}>
                        +2x XP
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Source selector */}
              <Text style={styles.label}>// SOURCE</Text>
              <View style={styles.toggle}>
                {(['thought', 'url'] as const).map(s => (
                  <Pressable
                    key={s}
                    onPress={() => setSourceType(s)}
                    style={[styles.toggleBtn, sourceType === s && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, sourceType === s && styles.toggleTextActive]}>
                      {s === 'thought' ? 'THOUGHT' : 'URL'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Input */}
              <Text style={styles.label}>
                {sourceType === 'url' ? '// PASTE URL' : '// ENTER THOUGHT'}
              </Text>
              {sourceType === 'url' ? (
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#2a2a2a"
                  value={urlInput}
                  onChangeText={setUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  selectionColor="#fff"
                  keyboardAppearance="dark"
                />
              ) : (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="what are you curious about..."
                  placeholderTextColor="#2a2a2a"
                  value={thoughtInput}
                  onChangeText={setThoughtInput}
                  multiline
                  numberOfLines={4}
                  selectionColor="#fff"
                  keyboardAppearance="dark"
                />
              )}

              {/* Optional intent */}
              <Text style={styles.label}>// INTENT (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="what do you want to understand..."
                placeholderTextColor="#2a2a2a"
                value={intentInput}
                onChangeText={setIntentInput}
                selectionColor="#fff"
                keyboardAppearance="dark"
              />

              {/* Error */}
              {!!error && (
                <Text style={styles.error}>{`! ${error}`}</Text>
              )}

              {/* Loading state */}
              {loading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#fff" style={{ marginBottom: 10 }} />
                  <Text style={styles.loadingText}>{loadingMsg}</Text>
                </View>
              )}

              {/* Dive button */}
              {!loading && (
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <Pressable
                    onPress={handleDive}
                    disabled={isDisabled}
                    style={[styles.diveBtn, isDisabled && styles.diveBtnDisabled]}
                  >
                    <Text style={[styles.diveBtnText, isDisabled && styles.diveBtnTextDisabled]}>
                      ◎ DIVE IN
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
    gap: 16,
  },
  backBtn: { padding: 4 },
  backText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },
  title: {
    fontFamily: MONO,
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 3,
    flex: 1,
  },

  label: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },

  toggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.80)',
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  toggleText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#444',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  toggleTextActive: { color: '#fff' },
  toggleSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#555',
    letterSpacing: 1,
    marginTop: 3,
  },
  toggleSubActive: { color: '#efff00' },

  input: {
    backgroundColor: 'rgba(15,15,15,0.90)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  error: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#f87171',
    marginBottom: 16,
    letterSpacing: 0.5,
  },

  loadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },

  diveBtn: {
    backgroundColor: '#efff00',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  diveBtnDisabled: {
    backgroundColor: 'rgba(239,255,0,0.10)',
  },
  diveBtnText: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 2,
  },
  diveBtnTextDisabled: {
    color: '#3a3a00',
  },
});
