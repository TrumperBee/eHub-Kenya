// Shared small count badge (e.g. "action required" on the seller's My Sales
// entry). Renders nothing when the count is zero.
export default function Badge({ count, className }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${className || ''}`}
      style={{ background: '#FFF100', color: '#111111' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}