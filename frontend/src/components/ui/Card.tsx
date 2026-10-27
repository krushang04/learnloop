import clsx from 'clsx';
import { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('p-5', className)}>{children}</div>;
}

/** Headline number used across the admin dashboard. */
export function StatCard({
  label,
  value,
  sublabel,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={clsx(
          'mt-2 text-3xl font-semibold tabular-nums',
          tone === 'success' && 'text-emerald-600',
          tone === 'warning' && 'text-amber-600',
          tone === 'default' && 'text-slate-900',
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
    </Card>
  );
}
