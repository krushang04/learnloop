import clsx from 'clsx';
import type { ProgressStatus, QuestionType, VideoStatus } from '@/types';
import { QUESTION_TYPE_LABELS, STATUS_LABELS } from '@/lib/format';

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const PROGRESS_TONES: Record<ProgressStatus, Tone> = {
  not_started: 'neutral',
  in_progress: 'warning',
  completed: 'success',
};

export function ProgressBadge({ status }: { status: ProgressStatus }) {
  return <Badge tone={PROGRESS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  return (
    <Badge tone={status === 'published' ? 'success' : 'neutral'}>{STATUS_LABELS[status]}</Badge>
  );
}

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const tone: Tone =
    type === 'single_choice' ? 'info' : type === 'multiple_choice' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{QUESTION_TYPE_LABELS[type]}</Badge>;
}
