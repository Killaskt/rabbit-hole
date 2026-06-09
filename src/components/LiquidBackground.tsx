export default function LiquidBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes rh-b0 { 0%,100% { transform: translate(calc(10vw - 130px), calc(8vh - 130px)); } 50% { transform: translate(calc(62vw - 130px), calc(34vh - 130px)); } }
        @keyframes rh-b1 { 0%,100% { transform: translate(calc(65vw - 100px), calc(52vh - 100px)); } 50% { transform: translate(calc(14vw - 100px), calc(74vh - 100px)); } }
        @keyframes rh-b2 { 0%,100% { transform: translate(calc(38vw - 80px), calc(28vh - 80px)); } 50% { transform: translate(calc(70vw - 80px), calc(80vh - 80px)); } }
      `}</style>
      <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.055)', animation: 'rh-b0 11s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(239,255,0,0.04)', animation: 'rh-b1 14s ease-in-out infinite 2.5s' }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'rh-b2 9s ease-in-out infinite 1.2s' }} />
    </div>
  );
}
