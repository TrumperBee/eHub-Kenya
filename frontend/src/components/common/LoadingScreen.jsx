import { useEffect, useState } from 'react';

export default function LoadingScreen({ show }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!show) {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400"
      style={{
        background: 'linear-gradient(135deg, #001450 0%, #003BFF 100%)',
        opacity: show ? 1 : 0,
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="animate-bounce-soft text-6xl">⚽</div>

        <div className="animate-logo-reveal text-center" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <h1 className="font-heading text-3xl font-extrabold text-white uppercase tracking-wider">
            eFOOTBALL HUB
          </h1>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-wider" style={{ color: '#FFF100' }}>
            KENYA
          </h1>
        </div>

        <div className="w-full max-w-[300px] h-1 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div className="h-full rounded animate-load-progress" style={{ background: '#FFF100' }} />
        </div>

        <p
          className="font-heading text-[11px] uppercase tracking-[0.3em] animate-pulse"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          LOADING...
        </p>
      </div>
    </div>
  );
}
