import { useEffect, useState } from 'react';
import LiquidBackground from '@/components/LiquidBackground';
import {
  ModelId,
  ModelOption,
  MODELS,
  deleteApiKey,
  getApiKey,
  setApiKey,
  getPreferredModel,
  setPreferredModel,
} from '@/lib/storage';
import { SCALE_LABELS, useTextSettings } from '@/lib/textSettings';
import { useNav } from '@/lib/nav';

const MONO = '"Courier New", Courier, monospace';
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
    <button
      onClick={onPress}
      style={{
        width: '100%', textAlign: 'left', boxSizing: 'border-box',
        backgroundColor: active ? 'rgba(239,255,0,0.04)' : 'rgba(14,14,14,0.90)',
        borderRadius: 12,
        border: active ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
        padding: 16, cursor: 'pointer', display: 'block',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 16, color: active ? ACCENT : '#444', fontWeight: '700', letterSpacing: 2 }}>
            {model.label}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', letterSpacing: 0.5, marginTop: 3 }}>{model.sublabel}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ border: model.tier === 'free' ? '1px solid rgba(239,255,0,0.25)' : '1px solid #2a2a2a', borderRadius: 4, padding: '2px 6px' }}>
            <span style={{ fontFamily: MONO, fontSize: 8, color: model.tier === 'free' ? 'rgba(239,255,0,0.6)' : '#444', letterSpacing: 1.5 }}>
              {model.tier.toUpperCase()}
            </span>
          </div>
          {active && <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT }} />}
        </div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: active ? ACCENT : '#444', letterSpacing: 0.5 }}>
        {model.costLine}
      </div>
    </button>
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
      window.alert(`Invalid Key: ${label} keys start with ${keyPrefix}`);
      return;
    }
    await setApiKey(trimmed, provider);
    setHasKey(true);
    setSaved(true);
    (document.activeElement as HTMLElement)?.blur();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Remove ${label} Key — Are you sure?`);
    if (confirmed) {
      deleteApiKey(provider).then(() => {
        setApiKeyState('');
        setHasKey(false);
      });
    }
  };

  const masked = apiKey.length > 12
    ? apiKey.slice(0, 10) + '••••' + apiKey.slice(-4)
    : apiKey;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 3, marginBottom: 10 }}>{label}</div>
      <input
        style={{ width: '100%', backgroundColor: 'rgba(15,15,15,0.90)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: 14, fontFamily: MONO, fontSize: 13, color: '#ccc', letterSpacing: 0.3, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
        placeholder={placeholder}
        value={showKey ? apiKey : masked}
        onChange={e => setApiKeyState(e.target.value)}
        autoCapitalize="none"
        type={showKey ? 'text' : 'password'}
        onFocus={() => setShowKey(true)}
        onBlur={() => setShowKey(false)}
      />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          style={{
            flex: 1,
            backgroundColor: !apiKey.trim() ? 'rgba(239,255,0,0.07)' : ACCENT,
            borderRadius: 10, padding: 13, border: 'none',
            cursor: apiKey.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 13, color: !apiKey.trim() ? '#3a3a00' : '#000', fontWeight: '700', letterSpacing: 2 }}>
            {saved ? '✓ SAVED' : 'SAVE'}
          </span>
        </button>
        {hasKey && (
          <button
            onClick={handleDelete}
            style={{ borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', padding: '13px 18px', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontFamily: MONO, fontSize: 13, color: '#f87171', letterSpacing: 1.5 }}>REMOVE</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsScreen() {
  const nav = useNav();
  const [selectedModel, setSelectedModel] = useState<ModelId>('claude-haiku-4-5-20251001');
  const { scaleIndex, bold, setScaleIndex, toggleBold } = useTextSettings();

  useEffect(() => {
    getPreferredModel().then(m => setSelectedModel(m));
  }, []);

  const handleModelSelect = async (id: ModelId) => {
    setSelectedModel(id);
    await setPreferredModel(id);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      <LiquidBackground />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 'env(safe-area-inset-top, 44px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: 20, paddingBottom: 48 }}>

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 32, marginTop: 8, gap: 16 }}>
              <button onClick={() => nav.back()} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#555', letterSpacing: 1 }}>← BACK</span>
              </button>
              <span style={{ fontFamily: MONO, fontSize: 18, color: '#fff', fontWeight: '700', letterSpacing: 3, flex: 1 }}>SETTINGS</span>
            </div>

            {/* Display */}
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 8 }}>// DISPLAY</div>
            <div style={{ backgroundColor: 'rgba(14,14,14,0.90)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: 16, marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 3, marginBottom: 14 }}>TEXT SIZE</div>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
                {SCALE_LABELS.map((label, i) => (
                  <button key={i} onClick={() => setScaleIndex(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11 + i * 6, color: scaleIndex === i ? '#fff' : '#2e2e2e', fontWeight: '700' }}>A</span>
                    <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: scaleIndex === i ? '#fff' : '#2e2e2e' }} />
                    <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: scaleIndex === i ? '#555' : '#2e2e2e' }}>{label}</span>
                  </button>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 14, paddingTop: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 13 * (1 + scaleIndex * 0.15), color: '#666', letterSpacing: 1, fontWeight: bold ? '700' : '400' }}>
                  the quick fox jumps
                </span>
              </div>
            </div>

            <button
              onClick={toggleBold}
              style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(14,14,14,0.90)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: 16, marginBottom: 8, cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 3 }}>BOLD TEXT</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: bold ? '#fff' : '#333', letterSpacing: 1 }}>{bold ? '[ ON ]' : '[ OFF ]'}</span>
            </button>

            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 24, marginBottom: 24 }} />

            {/* Model selector */}
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 8 }}>// MODEL</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', lineHeight: '17px', marginBottom: 16 }}>
              Each session costs less than half a cent on free-tier models. Prices are list rates — check provider pages for current rates.
            </div>

            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 3, marginBottom: 8, marginTop: 4 }}>ANTHROPIC</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {ANTHROPIC_MODELS.map(m => (
                <ModelCard
                  key={m.id}
                  model={m}
                  active={selectedModel === m.id}
                  onPress={() => handleModelSelect(m.id as ModelId)}
                />
              ))}
            </div>

            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 3, marginBottom: 8, marginTop: 4 }}>OPENAI</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {OPENAI_MODELS.map(m => (
                <ModelCard
                  key={m.id}
                  model={m}
                  active={selectedModel === m.id}
                  onPress={() => handleModelSelect(m.id as ModelId)}
                />
              ))}
            </div>

            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 24, marginBottom: 24 }} />

            {/* API Keys */}
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 8 }}>// API KEYS</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', lineHeight: '17px', marginBottom: 16 }}>
              Stored in encrypted storage on your device only. Never leaves except to the provider's API.
            </div>

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
            <div style={{ backgroundColor: 'rgba(12,12,12,0.80)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: 18, marginTop: 4 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 10 }}>// GET API KEYS</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', lineHeight: '19px', whiteSpace: 'pre-line' }}>
                {'Anthropic: console.anthropic.com\nOpenAI: platform.openai.com/api-keys\n\nBoth have free tiers. Anthropic free tier works with Haiku. OpenAI free tier works with 4o mini.\n\nSession cost estimate: ~2k input tokens + ~700 output tokens.'}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
