'use client';

/**
 * Shown when a user attempts to sign in with a non-SVNIT email
 * and EARLY_REJECT is enabled. Blocks all interaction until dismissed.
 */
export default function InvalidEmailModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invalid-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl p-8 flex flex-col items-center text-center shadow-2xl">

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-5">
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            className="text-zinc-300"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h2 id="invalid-email-title" className="text-white text-lg font-semibold mb-2">
          Institute email required
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed mb-1">
          Only SVNIT institutional email addresses are allowed to register.
        </p>
        <p className="text-zinc-500 text-xs mb-8">
          e.g. <span className="text-zinc-300 font-mono">u24ai091.aid@svnit.ac.in</span>
        </p>

        <button
          onClick={onDismiss}
          className="w-full bg-white text-zinc-900 rounded-md py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          Got it, sign out
        </button>
      </div>
    </div>
  );
}
