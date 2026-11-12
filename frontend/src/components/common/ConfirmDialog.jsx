export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, loading, variant }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white border border-konami-mid-gray rounded-2xl p-4 md:p-6 max-w-md mx-4 w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold uppercase tracking-wide text-konami-text mb-3">{title}</h3>
        <p className="text-sm text-konami-text-muted mb-6">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 text-sm py-2.5 rounded-lg font-heading font-bold uppercase tracking-wide border border-konami-mid-gray text-konami-text hover:bg-konami-light-gray transition-all duration-200 active:scale-[0.97]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-sm py-2.5 rounded-lg font-heading font-bold uppercase tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-konami-red hover:bg-konami-red-hover text-white'
                : 'bg-konami-yellow hover:bg-konami-yellow-hover text-konami-text'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
