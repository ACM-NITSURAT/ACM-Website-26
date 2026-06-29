'use client';

/**
 * ToggleRow — a labelled toggle switch row.
 *
 * Track:  44×24px
 * Thumb:  20×20px, 2px inset from edges
 * OFF: thumb at left  (translateX 2px  → handled by left-[2px])
 * ON:  thumb at right (translateX 22px → left-[2px] + translate-x-[22px])
 *
 * Usage:
 *   <ToggleRow
 *     checked={isFormOpen}
 *     onChange={handleToggle}
 *     label="Form is open"
 *     labelOff="Form is closed"
 *     loading={togglingForm}
 *   />
 */

interface ToggleRowProps {
  checked: boolean;
  onChange: () => void;
  /** Label shown when checked=true */
  label: string;
  /** Label shown when checked=false. Defaults to label. */
  labelOff?: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function ToggleRow({
  checked,
  onChange,
  label,
  labelOff,
  loading = false,
  disabled = false,
}: ToggleRowProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={isDisabled}
      className={`
        flex items-center justify-between w-full gap-3
        px-3.5 py-2.5 rounded-md text-sm font-medium border
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
        }
      `}
    >
      <span>{loading ? 'Updating…' : checked ? label : (labelOff ?? label)}</span>

      {/* Track */}
      <span
        aria-hidden="true"
        className={`
          relative flex-shrink-0
          w-11 h-6 rounded-full
          transition-colors duration-200
          ${checked ? 'bg-emerald-500' : 'bg-zinc-600'}
        `}
      >
        {/* Thumb */}
        <span
          className={`
            absolute top-[2px] left-[2px]
            w-5 h-5 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </span>
    </button>
  );
}
