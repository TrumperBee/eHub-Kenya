import { Lightbulb } from 'lucide-react';

const TONES = {
  blue:  { bg: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' },
  green: { bg: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' },
  amber: { bg: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' },
  red:   { bg: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' },
};

// Compact, contextual instruction box rendered next to the action it explains.
export default function ContextHint({ title, children, tone = 'blue', className = '' }) {
  const t = TONES[tone] || TONES.blue;
  return (
    <div
      className={`rounded-xl p-4 text-sm leading-relaxed ${className}`}
      style={{ background: t.bg, border: t.border, color: t.color }}
    >
      {title && (
        <p className="font-heading text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Lightbulb size={13} className="shrink-0" /> {title}
        </p>
      )}
      <div className="[&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-0.5 [&>p]:mt-1">{children}</div>
    </div>
  );
}