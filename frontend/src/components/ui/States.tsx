import { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
        !
      </div>
      <div>
        <h3 className="text-sm font-semibold text-red-900">{title}</h3>
        {message && <p className="mt-1 max-w-md text-sm text-red-700">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}
