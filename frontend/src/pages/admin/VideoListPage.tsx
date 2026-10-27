import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListVideosQuery } from '@/features/videos/videosApi';
import { useDebounced } from '@/hooks/useDebounced';
import { PageHeader } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { VideoStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { PlusIcon, QuestionIcon, VideoIcon, ClockIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDate, formatDuration } from '@/lib/format';
import type { VideoStatus } from '@/types';

const STATUS_FILTERS: { value: VideoStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export function VideoListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VideoStatus | ''>('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search);
  const { data, isLoading, isFetching, isError, error, refetch } = useListVideosQuery({
    search: debouncedSearch,
    status,
    page,
    limit: 12,
  });

  // A filter change makes the current page number meaningless.
  const applyFilter = (next: VideoStatus | '') => {
    setStatus(next);
    setPage(1);
  };

  const isFiltered = Boolean(debouncedSearch || status);

  return (
    <>
      <PageHeader
        title="Videos"
        description="Create lessons, place questions on the timeline and assign them to learners."
        action={
          <Link to="/admin/videos/new">
            <Button leftIcon={<PlusIcon width={16} height={16} />}>New video</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by title or description…"
          className="sm:max-w-xs"
        />

        <div className="flex rounded-lg bg-slate-100 p-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => applyFilter(filter.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {data && (
          <span className="text-sm text-slate-500 sm:ml-auto">
            {data.meta.total} video{data.meta.total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<VideoIcon />}
          title={isFiltered ? 'No videos match your filters' : 'No videos yet'}
          message={
            isFiltered
              ? 'Try a different search term or clear the status filter.'
              : 'Create your first video, add timestamp questions, then assign it to learners.'
          }
          action={
            isFiltered ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  applyFilter('');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link to="/admin/videos/new">
                <Button size="sm" leftIcon={<PlusIcon width={16} height={16} />}>
                  New video
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div
            className={`grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching ? 'opacity-60' : ''
            }`}
          >
            {data.items.map((video) => (
              <Link key={video._id} to={`/admin/videos/${video._id}`} className="group">
                <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="relative aspect-video bg-slate-100">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <VideoIcon width={32} height={32} />
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <VideoStatusBadge status={video.status} />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                      {video.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 h-8 text-xs text-slate-500">
                      {video.description || 'No description'}
                    </p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon width={13} height={13} />
                        {formatDuration(video.durationSeconds)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <QuestionIcon width={13} height={13} />
                        {video.questionCount ?? 0}
                      </span>
                      <span className="ml-auto">{formatDate(video.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {data.meta.page} of {data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!data.meta.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
