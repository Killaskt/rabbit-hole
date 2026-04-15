import type { CSSProperties } from 'react';

interface Props { children: React.ReactNode; style?: CSSProperties; }

export default function GlassCard({ children, style }: Props) {
  return (
    <div style={{
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(20,20,20,0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      ...style,
    }}>
      {children}
    </div>
  );
}
