import clsx from 'clsx';

/** A single progress bar used by cards, tables and the player alike. */
export function ProgressBar({
  value,
  tone = 'brand',
  size = 'md',
  showLabel = false,
  className,
}: {
  value: number;
  tone?: 'brand' | 'success';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx(
          'flex-1 overflow-hidden rounded-full bg-slate-200',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            tone === 'success' ? 'bg-emerald-500' : 'bg-brand-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600">
          {clamped}%
        </span>
      )}
    </div>
  );
}
