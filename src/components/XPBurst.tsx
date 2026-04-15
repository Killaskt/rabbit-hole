import { useEffect } from 'react';

const MONO = '"Courier New", Courier, monospace';
const ACCENT = '#efff00';

interface Props { amount: number; onDone: () => void; }

export default function XPBurst({ amount, onDone }: Props) {
  useEffect(() => { const t = setTimeout(onDone, 1350); return () => clearTimeout(t); }, [onDone]);
  return (
    <>
      <style>{`@keyframes rh-xpburst{0%{opacity:0;transform:translateX(-50%) scale(.6)}15%{opacity:1;transform:translateX(-50%) scale(1)}80%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-40px) scale(1)}}`}</style>
      <div style={{ position: 'fixed', top: '40%', left: '50%', pointerEvents: 'none', zIndex: 100, animation: 'rh-xpburst 1.35s ease forwards', backgroundColor: 'rgba(0,0,0,0.90)', border: `1px solid ${ACCENT}`, borderRadius: 8, padding: '8px 16px', fontFamily: MONO, fontSize: 18, color: ACCENT, fontWeight: 700, letterSpacing: 2, whiteSpace: 'nowrap' }}>
        +{amount} XP
      </div>
    </>
  );
}
