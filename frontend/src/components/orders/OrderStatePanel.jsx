import { Clock, CheckCircle2, PackageCheck, ShieldAlert, RotateCcw, Lock } from 'lucide-react';

const TONES = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', Icon: Clock },
  paid:     { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', Icon: CheckCircle2 },
  waiting:  { color: '#003BFF', bg: '#EFF6FF', border: '#BFDBFE', Icon: Clock },
  received: { color: '#003BFF', bg: '#EFF6FF', border: '#BFDBFE', Icon: PackageCheck },
  dispute:  { color: '#C8102E', bg: '#FEF2F2', border: '#FECACA', Icon: ShieldAlert },
  complete: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', Icon: CheckCircle2 },
  refunded: { color: '#C8102E', bg: '#FEF2F2', border: '#FECACA', Icon: RotateCcw },
  cancelled:{ color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', Icon: Lock },
};

// Answers the four "order state" questions:
// 1. What just happened?    -> guide.whatHappened
// 2. What happens next?     -> guide.next
// 3. Who needs to act?      -> guide.whoActs
// 4. What should they click?-> children (the CTA buttons)
export default function OrderStatePanel({ guide, children }) {
  const t = TONES[guide?.tone] || TONES.pending;
  const Icon = t.Icon;

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: t.bg, border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.color}` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.color, color: '#FFFFFF' }}>
          <Icon size={18} />
        </span>
        <p className="font-heading text-sm font-extrabold uppercase tracking-wide" style={{ color: t.color }}>
          {guide.title}
        </p>
      </div>

      {guide.paymentConfirmedBadge && (
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: '#16A34A', color: '#FFFFFF' }}>
          <CheckCircle2 size={13} /> {guide.paymentConfirmedBadge}
        </p>
      )}

      <p className="text-sm leading-snug" style={{ color: '#111111' }}>{guide.whatHappened}</p>

      <p className="text-xs leading-snug" style={{ color: '#4B5563' }}>
        <span className="font-bold" style={{ color: t.color }}>NEXT:</span>{' '}
        <span className="text-sm" style={{ color: '#374151' }}>{guide.next}</span>
      </p>

      <p className="text-xs leading-snug" style={{ color: '#6B7280' }}>
        <span className="font-bold" style={{ color: t.color }}>WHO ACTS:</span> {guide.whoActs}
      </p>

      {children && <div className="pt-1 space-y-2">{children}</div>}
    </div>
  );
}