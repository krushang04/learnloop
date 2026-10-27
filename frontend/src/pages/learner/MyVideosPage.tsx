import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyAssignmentsQuery } from '@/features/learning/learningApi';
import { useDebounced } from '@/hooks/useDebounced';
import { PageHeader } from '@/layouts/AppLayout';
import { Card, StatCard } from '@/components/ui/Card';
import { ProgressBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { ClockIcon, LibraryIcon, PlayIcon, QuestionIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration } from '@/lib/format';
import type { ProgressStatus } from '@/types';

const FILTERS: { value: ProgressStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function MyVideosPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProgressStatus | ''>('');
  const debouncedSearch = useDebounced(search);

  const { data, isLoading, isFetching, isError, error, refetch } = useMyAssignmentsQuery({
    search: debouncedSearch,
    status,
  });

  const isFiltered = Boolean(debouncedSearch || status);

  return (
    <>
      <PageHeader
        title="My learning"
        description="Videos assigned to you. Progress saves automatically as you watch."
      />

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Assigned" value={data.summary.total} />
          <StatCard label="Completed" value={data.summary.completed} tone="success" />
          <StatCard label="In progress" value={data.summary.inProgress} tone="warning" />
          <StatCard label="Not started" value={data.summary.notStarted} />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search your videos…"
          className="sm:max-w-xs"
        />
        <div className="flex overflow-x-auto rounded-lg bg-slate-100 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatus(filter.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<LibraryIcon />}
          title={isFiltered ? 'Nothing matches those filters' : 'No videos assigned yet'}
          message={
            isFiltered
              ? 'Try a different search or clear the filter.'
              : 'When an admin assigns you a video, it will appear here.'
          }
          action={
            isFiltered ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={`grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
            isFetching ? 'opacity-60' : ''
          }`}
        >
          {data.items.map((item) => {
            const { video, progress } = item;
            const isStarted = progress.status !== 'not_started';

            return (
              <Link key={item.assignmentId} to={`/learn/${video.id}`} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="relative aspect-video bg-slate-900">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600">
                        <PlayIcon width={40} height={40} />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-brand-700 shadow-lg">
                        <PlayIcon width={22} height={22} />
                      </span>
                    </div>

                    <div className="absolute left-2 top-2">
                      <ProgressBadge status={progress.status} />
                    </div>

                    {/* A thin bar on the thumbnail shows resume position at a glance. */}
                    {isStarted && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                        <div
                          className="h-full bg-brand-500"
                          style={{ width: `${progress.completionPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                      {video.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-slate-500">
                      {video.description || 'No description'}
                    </p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon width={13} height={13} />
                        {formatDuration(video.durationSeconds)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <QuestionIcon width={13} height={13} />
                        {progress.answeredQuestionCount}/{item.questionCount}
                      </span>
                    </div>

                    <div className="mt-auto pt-3">
                      <ProgressBar
                        value={progress.completionPercentage}
                        size="sm"
                        showLabel
                        tone={progress.status === 'completed' ? 'success' : 'brand'}
                      />
                      {isStarted && progress.status !== 'completed' && (
                        <p className="mt-2 text-xs text-brand-600">
                          Resume at {formatDuration(progress.lastPositionSeconds)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
