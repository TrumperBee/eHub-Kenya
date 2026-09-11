import { useEffect, useState } from 'react';
import { Rocket, Flame } from 'lucide-react';
import { getTimeUntilFriday, getTimeUntilDropEnd, isDropLive } from '../../utils/fridayUtils';

function Segment({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center"
        style={{
          background: '#001E7A',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#FFF100',
        }}
      >
        <span className="font-heading text-2xl md:text-4xl font-extrabold">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="font-heading text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mt-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer({ compact = false, onLive }) {
  const [time, setTime] = useState(() => getTimeUntilFriday());
  const [end, setEnd] = useState(() => getTimeUntilDropEnd());
  const [live, setLive] = useState(() => isDropLive());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(getTimeUntilFriday());
      setEnd(getTimeUntilDropEnd());
      setLive(isDropLive());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (onLive) onLive(live);
  }, [live, onLive]);

  if (live) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full"
          style={{ background: 'rgba(200,16,46,0.15)', border: '1.5px solid #C8102E' }}
        >
          <span className="live-dot" />
          <Flame size={16} style={{ color: '#C8102E' }} />
          <span className="font-heading text-sm font-extrabold uppercase tracking-widest" style={{ color: '#C8102E' }}>
            Live Now - Deals are dropping!
          </span>
        </div>
        <p className="font-heading text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Ends in: {String(end.hours).padStart(2, '0')}h {String(end.minutes).padStart(2, '0')}m {String(end.seconds).padStart(2, '0')}s
        </p>
      </div>
    );
  }

  const segs = [
    { value: time.days, label: 'Days' },
    { value: time.hours, label: 'Hrs' },
    { value: time.minutes, label: 'Min' },
    { value: time.seconds, label: 'Sec' },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {!compact && (
        <p className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.25em]" style={{ color: '#FFF100' }}>
          <Rocket size={14} /> Next Drop in
        </p>
      )}
      <div className="flex items-center gap-2 md:gap-3">
        {segs.map((s) => (
          <Segment key={s.label} value={s.value} label={s.label} />
        ))}
      </div>
    </div>
  );
}