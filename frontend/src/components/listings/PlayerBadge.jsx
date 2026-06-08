export default function PlayerBadge({ playerName }) {
  return (
    <span
      className="inline-flex items-center max-w-[120px] bg-[#242424] border-l-2 border-[#BF0021] rounded-r-md px-2 py-0.5 text-xs text-[#9E9E9E] truncate"
      title={playerName}
    >
      {playerName}
    </span>
  );
}
