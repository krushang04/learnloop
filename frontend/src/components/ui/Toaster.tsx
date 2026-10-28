import clsx from 'clsx';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toastDismissed, type Toast } from '@/features/ui/toastSlice';

const TONES: Record<Toast['variant'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timeout = setTimeout(
      () => dispatch(toastDismissed(toast.id)),
      toast.variant === 'error' ? 6000 : 3500,
    );
    return () => clearTimeout(timeout);
  }, [toast.id, toast.variant, dispatch]);

  return (
    <div
      role="status"
      className={clsx(
        'pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg animate-slide-up',
        TONES[toast.variant],
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => dispatch(toastDismissed(toast.id))}
        className="shrink-0 text-white/70 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.toast.items);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
