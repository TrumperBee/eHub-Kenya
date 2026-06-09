import { Circle } from 'lucide-react';

export default function PlayerBadge({ playerName }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-[10px] py-[4px] text-xs font-medium truncate max-w-[140px]"
      style={{
        background: '#F0F4FF',
        border: '1px solid #003BFF',
        color: '#003BFF',
      }}
      title={playerName}
    >
      <Circle size={6} className="fill-current" />
      {playerName}
    </span>
  );
}
