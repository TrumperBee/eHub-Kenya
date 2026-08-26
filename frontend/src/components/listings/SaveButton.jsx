import { Bookmark } from 'lucide-react';

export default function SaveButton({ listing, isSaved, onToggle, size = 'md' }) {
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={`flex items-center justify-center rounded-full
                  transition-all duration-200 active:scale-90
                  ${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'}
                  ${isSaved
                    ? 'bg-[#003BFF] text-white shadow-[0_4px_14px_rgba(0,59,255,0.4)]'
                    : 'bg-white border border-gray-200 text-gray-400 hover:border-[#003BFF] hover:text-[#003BFF]'
                  }`}
      aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
      title={isSaved ? 'Saved' : 'Save for later'}
    >
      <Bookmark size={iconSize} className={isSaved ? 'fill-white' : ''} />
    </button>
  );
}