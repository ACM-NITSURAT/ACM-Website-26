'use client';

interface LoggedOutModalProps {
  onDismiss: () => void;
}

export default function LoggedOutModal({ onDismiss }: LoggedOutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <svg
            className="h-6 w-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-xl font-semibold text-white">
          Logged Out
        </h2>

        {/* Message */}
        <p className="mb-6 text-sm text-zinc-400 leading-relaxed">
          You have been logged out due to incomplete registration. Please register with a valid institute email address ending with{' '}
          <span className="font-mono text-zinc-300">@svnit.ac.in</span>.
        </p>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full rounded-md bg-white py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
