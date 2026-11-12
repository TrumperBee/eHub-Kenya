export default function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="bg-white border border-konami-mid-gray rounded-xl overflow-hidden animate-pulse">
      <div className="h-11 bg-konami-light-gray border-b border-konami-mid-gray" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 px-4 py-4 border-b border-konami-light-gray last:border-0"
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-4 flex-1 rounded bg-konami-mid-gray/70" />
          ))}
        </div>
      ))}
    </div>
  );
}
