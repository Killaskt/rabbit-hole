import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import LiquidBackground from '@/components/LiquidBackground';
import { fetchOGTags, generateLesson } from '@/lib/claude';
import { useNav } from '@/lib/nav';
import { setCurrentSession } from '@/lib/sessionStore';
import { getApiKey } from '@/lib/storage';

const MONO = '"Courier New", Courier, monospace';

const LOADING_MSGS = [
  '> INITIATING DIVE SEQUENCE...',
  '> PARSING SIGNAL...',
  '> EXTRACTING KNOWLEDGE NODES...',
  '> COMPILING MICRO-LESSON...',
  '> BUILDING CARD DECK...',
  '> ENCRYPTING INSIGHTS...',
  '> ALMOST THERE...',
];

const s: Record<string, CSSProperties> = {
  root: { position: 'relative', height: '100%', backgroundColor: '#000' },
  safe: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: 'env(safe-area-inset-top,44px)',
    paddingBottom: 'env(safe-area-inset-bottom,0px)',
    position: 'relative',
    zIndex: 1,
  },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
  scrollInner: { padding: 20, paddingBottom: 40 },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
    gap: 16,
  },
  backBtn: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: MONO,
    fontSize: 12,
    color: '#555',
    letterSpacing: 1,
  },
  title: {
    fontFamily: MONO,
    fontSize: 18,
    color: '#fff',
    fontWeight: 700,
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
  toggle: { display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 24 },
  toggleBtn: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.80)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    border: '1px solid rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  toggleText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#444',
    letterSpacing: 1.5,
    fontWeight: 700,
  },
  toggleTextActive: { color: '#fff' },
  toggleSub: { fontFamily: MONO, fontSize: 9, color: '#555', letterSpacing: 1, marginTop: 3 },
  toggleSubActive: { color: '#efff00' },
  input: {
    backgroundColor: 'rgba(15,15,15,0.90)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 14,
    fontFamily: MONO,
    fontSize: 13,
    color: '#ccc',
    marginBottom: 20,
    letterSpacing: 0.3,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    display: 'block',
  },
  textArea: { minHeight: 100, resize: 'vertical' },
  error: { fontFamily: MONO, fontSize: 12, color: '#f87171', marginBottom: 16, letterSpacing: 0.5 },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  loadingText: { fontFamily: MONO, fontSize: 12, color: '#555', letterSpacing: 1 },
  diveBtn: {
    backgroundColor: '#efff00',
    borderRadius: 14,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.1s ease',
  },
  diveBtnDisabled: { backgroundColor: 'rgba(239,255,0,0.10)', cursor: 'default' },
  diveBtnText: { fontFamily: MONO, fontSize: 16, color: '#000', fontWeight: 700, letterSpacing: 2 },
  diveBtnTextDisabled: { color: '#3a3a00' },
};

export default function NewSessionScreen() {
  const nav = useNav();
  const [mode, setMode] = useState<'skim' | 'deep_dive'>('skim');
  const [sourceType, setSourceType] = useState<'url' | 'thought'>('thought');
  const [urlInput, setUrlInput] = useState('');
  const [thoughtInput, setThoughtInput] = useState(nav.params.prefill ?? '');
  const [intentInput, setIntentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [error, setError] = useState('');
  const [btnPressed, setBtnPressed] = useState(false);

  const msgIndex = useRef(0);
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
    (document.activeElement as HTMLElement)?.blur();
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

    Haptics.impact({ style: ImpactStyle.Medium });

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
      nav.replace('session');
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
    <div style={s.root}>
      <LiquidBackground />
      <div style={s.safe}>
        <div style={s.scroll}>
          <div style={s.scrollInner}>
            {/* Header */}
            <div style={s.header}>
              <button onClick={() => nav.back()} style={s.backBtn}>← BACK</button>
              <div style={s.title}>NEW SESSION</div>
            </div>

            {/* Mode selector */}
            <div style={s.label}>// MODE</div>
            <div style={s.toggle}>
              {(['skim', 'deep_dive'] as const).map(m => (
                <div
                  key={m}
                  onClick={() => setMode(m)}
                  style={{ ...s.toggleBtn, ...(mode === m ? s.toggleBtnActive : {}) }}
                >
                  <div style={{ ...s.toggleText, ...(mode === m ? s.toggleTextActive : {}) }}>
                    {m === 'skim' ? 'SKIM' : 'DEEP DIVE'}
                  </div>
                  {m === 'deep_dive' && (
                    <div style={{ ...s.toggleSub, ...(mode === m ? s.toggleSubActive : {}) }}>
                      +2x XP
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Source selector */}
            <div style={s.label}>// SOURCE</div>
            <div style={s.toggle}>
              {(['thought', 'url'] as const).map(src => (
                <div
                  key={src}
                  onClick={() => setSourceType(src)}
                  style={{ ...s.toggleBtn, ...(sourceType === src ? s.toggleBtnActive : {}) }}
                >
                  <div style={{ ...s.toggleText, ...(sourceType === src ? s.toggleTextActive : {}) }}>
                    {src === 'thought' ? 'THOUGHT' : 'URL'}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={s.label}>
              {sourceType === 'url' ? '// PASTE URL' : '// ENTER THOUGHT'}
            </div>
            {sourceType === 'url' ? (
              <input
                style={s.input}
                placeholder="https://..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            ) : (
              <textarea
                style={{ ...s.input, ...s.textArea }}
                placeholder="what are you curious about..."
                value={thoughtInput}
                onChange={e => setThoughtInput(e.target.value)}
                rows={4}
              />
            )}

            {/* Optional intent */}
            <div style={s.label}>// INTENT (optional)</div>
            <input
              style={s.input}
              placeholder="what do you want to understand..."
              value={intentInput}
              onChange={e => setIntentInput(e.target.value)}
            />

            {/* Error */}
            {!!error && <div style={s.error}>{`! ${error}`}</div>}

            {/* Loading state */}
            {loading && (
              <div style={s.loadingBox}>
                <div style={{ textAlign: 'center', color: '#fff', padding: 10 }}>▸</div>
                <div style={s.loadingText}>{loadingMsg}</div>
              </div>
            )}

            {/* Dive button */}
            {!loading && (
              <button
                onClick={handleDive}
                disabled={isDisabled}
                onMouseDown={() => setBtnPressed(true)}
                onMouseUp={() => setBtnPressed(false)}
                onMouseLeave={() => setBtnPressed(false)}
                style={{
                  ...s.diveBtn,
                  ...(isDisabled ? s.diveBtnDisabled : {}),
                  transform: btnPressed && !isDisabled ? 'scale(0.95)' : 'scale(1)',
                }}
              >
                <span style={{ ...s.diveBtnText, ...(isDisabled ? s.diveBtnTextDisabled : {}) }}>
                  ◎ DIVE IN
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
