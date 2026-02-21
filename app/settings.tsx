import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidBackground from '../components/LiquidBackground';
import {
  ModelId,
  ModelOption,
  MODELS,
  deleteApiKey,
  getApiKey,
  getPreferredModel,
  setApiKey,
  setPreferredModel,
} from '../lib/storage';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const ACCENT = '#efff00';

const ANTHROPIC_MODELS = MODELS.filter(m => m.provider === 'anthropic');
const OPENAI_MODELS = MODELS.filter(m => m.provider === 'openai');

function ModelCard({
  model,
  active,
  onPress,
}: {
  model: ModelOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modelCard, active && styles.modelCardActive]}
    >
      <View style={styles.modelCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modelLabel, active && styles.modelLabelActive]}>
            {model.label}
          </Text>
          <Text style={styles.modelSublabel}>{model.sublabel}</Text>
        </View>
        <View style={styles.modelMeta}>
          <View style={[styles.tierBadge, model.tier === 'free' && styles.tierBadgeFree]}>
            <Text style={[styles.tierText, model.tier === 'free' && styles.tierTextFree]}>
              {model.tier.toUpperCase()}
            </Text>
          </View>
          {active && <View style={styles.activeDot} />}
        </View>
      </View>
      <Text style={[styles.pricingCost, active && styles.pricingCostActive]}>
        {model.costLine}
      </Text>
    </Pressable>
  );
}

function ApiKeyRow({
  provider,
  label,
  placeholder,
  keyPrefix,
}: {
  provider: 'anthropic' | 'openai';
  label: string;
  placeholder: string;
  keyPrefix: string;
}) {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    getApiKey(provider).then(k => {
      if (k) { setApiKeyState(k); setHasKey(true); }
    });
  }, []);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith(keyPrefix)) {
      Alert.alert('Invalid Key', `${label} keys start with ${keyPrefix}`);
      return;
    }
    await setApiKey(trimmed, provider);
    setHasKey(true);
    setSaved(true);
    Keyboard.dismiss();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    Alert.alert(`Remove ${label} Key`, 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await deleteApiKey(provider);
          setApiKeyState('');
          setHasKey(false);
        },
      },
    ]);
  };

  const masked = apiKey.length > 12
    ? apiKey.slice(0, 10) + '••••' + apiKey.slice(-4)
    : apiKey;

  return (
    <View style={styles.keySection}>
      <Text style={styles.keySectionLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#2a2a2a"
        value={showKey ? apiKey : masked}
        onChangeText={setApiKeyState}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!showKey}
        selectionColor="#fff"
        keyboardAppearance="dark"
        onFocus={() => setShowKey(true)}
        onBlur={() => setShowKey(false)}
      />
      <View style={styles.keyButtons}>
        <Pressable
          onPress={handleSave}
          disabled={!apiKey.trim()}
          style={[styles.saveBtn, !apiKey.trim() && styles.saveBtnDisabled]}
        >
          <Text style={[styles.saveBtnText, !apiKey.trim() && styles.saveBtnTextDisabled]}>
            {saved ? '✓ SAVED' : 'SAVE'}
          </Text>
        </Pressable>
        {hasKey && (
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>REMOVE</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const [selectedModel, setSelectedModel] = useState<ModelId>('claude-haiku-4-5-20251001');

  useEffect(() => {
    getPreferredModel().then(m => setSelectedModel(m));
  }, []);

  const handleModelSelect = async (id: ModelId) => {
    setSelectedModel(id);
    await setPreferredModel(id);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LiquidBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>← BACK</Text>
              </Pressable>
              <Text style={styles.title}>SETTINGS</Text>
            </View>

            {/* Model selector */}
            <Text style={styles.sectionLabel}>// MODEL</Text>
            <Text style={styles.sectionHint}>
              Each session costs less than half a cent on free-tier models. Prices are list rates — check provider pages for current rates.
            </Text>

            <Text style={styles.providerLabel}>ANTHROPIC</Text>
            <View style={styles.modelGroup}>
              {ANTHROPIC_MODELS.map(m => (
                <ModelCard
                  key={m.id}
                  model={m}
                  active={selectedModel === m.id}
                  onPress={() => handleModelSelect(m.id as ModelId)}
                />
              ))}
            </View>

            <Text style={styles.providerLabel}>OPENAI</Text>
            <View style={styles.modelGroup}>
              {OPENAI_MODELS.map(m => (
                <ModelCard
                  key={m.id}
                  model={m}
                  active={selectedModel === m.id}
                  onPress={() => handleModelSelect(m.id as ModelId)}
                />
              ))}
            </View>

            <View style={styles.divider} />

            {/* API Keys */}
            <Text style={styles.sectionLabel}>// API KEYS</Text>
            <Text style={styles.sectionHint}>
              Stored in encrypted storage on your device only. Never leaves except to the provider's API.
            </Text>

            <ApiKeyRow
              provider="anthropic"
              label="ANTHROPIC"
              placeholder="sk-ant-api03-..."
              keyPrefix="sk-ant-"
            />
            <ApiKeyRow
              provider="openai"
              label="OPENAI"
              placeholder="sk-proj-..."
              keyPrefix="sk-"
            />

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>// GET API KEYS</Text>
              <Text style={styles.infoText}>
                {'Anthropic: console.anthropic.com\n'}
                {'OpenAI: platform.openai.com/api-keys\n\n'}
                {'Both have free tiers. Anthropic free tier works with Haiku. OpenAI free tier works with 4o mini.\n\n'}
                {'Session cost estimate: ~2k input tokens + ~700 output tokens.'}
              </Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },

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

  sectionLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionHint: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#2d2d2d',
    lineHeight: 17,
    marginBottom: 16,
  },
  providerLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#333',
    letterSpacing: 3,
    marginBottom: 8,
    marginTop: 4,
  },
  modelGroup: {
    gap: 8,
    marginBottom: 16,
  },

  // Model card
  modelCard: {
    backgroundColor: 'rgba(14,14,14,0.90)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
  },
  modelCardActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(239,255,0,0.04)',
  },
  modelCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modelLabel: {
    fontFamily: MONO,
    fontSize: 16,
    color: '#444',
    fontWeight: '700',
    letterSpacing: 2,
  },
  modelLabelActive: { color: ACCENT },
  modelSublabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#2d2d2d',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  modelMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  tierBadge: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierBadgeFree: {
    borderColor: 'rgba(239,255,0,0.25)',
  },
  tierText: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#2a2a2a',
    letterSpacing: 1.5,
  },
  tierTextFree: { color: 'rgba(239,255,0,0.6)' },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  pricingCost: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#444',
    letterSpacing: 0.5,
  },
  pricingCostActive: { color: ACCENT },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 24,
  },

  // API key rows
  keySection: {
    marginBottom: 20,
  },
  keySectionLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#333',
    letterSpacing: 3,
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(15,15,15,0.90)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  keyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(239,255,0,0.07)',
  },
  saveBtnText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#000',
    fontWeight: '700',
    letterSpacing: 2,
  },
  saveBtnTextDisabled: { color: '#3a3a00' },
  deleteBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    padding: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#f87171',
    letterSpacing: 1.5,
  },

  infoBox: {
    backgroundColor: 'rgba(12,12,12,0.80)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    marginTop: 4,
  },
  infoLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#333',
    letterSpacing: 2,
    marginBottom: 10,
  },
  infoText: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#2d2d2d',
    lineHeight: 19,
  },
});
