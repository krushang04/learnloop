import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListVideosQuery } from '@/features/videos/videosApi';
import { useDebounced } from '@/hooks/useDebounced';
import { PageHeader } from '@/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { VideoStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Table, Td, Th } from '@/components/ui/Table';
import { ReportIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDate, formatDuration } from '@/lib/format';

/** Picks a video to drill into. The per-learner detail lives on VideoReportPage. */
export function ReportsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const { data, isLoading, isError, error, refetch } = useListVideosQuery({
    search: debouncedSearch,
    limit: 50,
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Choose a video to see how each assigned learner is progressing."
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search videos…"
        className="mb-5 sm:max-w-xs"
      />

      {isLoading ? (
        <Card className="p-5">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<ReportIcon />}
          title={search ? 'No videos match' : 'No videos to report on'}
          message={
            search ? 'Try a different search term.' : 'Create and assign a video to see reports.'
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Video</Th>
                <Th>Status</Th>
                <Th align="right">Questions</Th>
                <Th align="right">Length</Th>
                <Th align="right">Created</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((video) => (
                <tr key={video._id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <span className="font-medium text-slate-900">{video.title}</span>
                  </Td>
                  <Td>
                    <VideoStatusBadge status={video.status} />
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {video.questionCount ?? 0}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {formatDuration(video.durationSeconds)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-slate-500">
                    {formatDate(video.createdAt)}
                  </Td>
                  <Td align="right">
                    <Link
                      to={`/admin/reports/${video._id}`}
                      className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline"
                    >
                      View report
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
