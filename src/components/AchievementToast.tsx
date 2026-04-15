import { useEffect } from 'react';
import type { Achievement } from '@/lib/gameState';

const MONO = '"Courier New", Courier, monospace';

interface Props { achievement: Achievement; onDone: () => void; }

export default function AchievementToast({ achievement, onDone }: Props) {
  useEffect(() => { const t = setTimeout(onDone, 2900); return () => clearTimeout(t); }, [onDone]);
  return (
    <>
      <style>{`@keyframes rh-toast{0%{opacity:0;transform:translateY(-30px)}15%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-20px)}}`}</style>
      <div style={{ position: 'fixed', top: 60, left: 20, right: 20, display: 'flex', alignItems: 'center', gap: 14, backgroundColor: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: 14, zIndex: 999, animation: 'rh-toast 2.9s ease forwards', pointerEvents: 'none' }}>
        <span style={{ fontSize: 28 }}>{achievement.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', letterSpacing: 1.5, marginBottom: 3 }}>// ACHIEVEMENT UNLOCKED</div>
          <div style={{ fontFamily: MONO, fontSize: 14, color: '#fff', fontWeight: 700, letterSpacing: 1.5 }}>{achievement.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#777', marginTop: 2 }}>{achievement.desc}</div>
        </div>
      </div>
    </>
  );
}
