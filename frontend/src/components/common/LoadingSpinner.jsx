const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export default function LoadingSpinner({ size = 'md', fullScreen = false }) {
  const spinner = (
    <div
      className={`${sizes[size]} rounded-full border-transparent border-t-konami-blue animate-spin`}
      style={{ borderRightColor: '#003BFF' }}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-konami-light-gray flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  );
}
