import { Link } from 'react-router-dom';
import { useGetOverviewQuery } from '@/features/reports/reportsApi';
import { useListVideosQuery } from '@/features/videos/videosApi';
import { PageHeader } from '@/layouts/AppLayout';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VideoStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { PlusIcon, VideoIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration } from '@/lib/format';

export function AdminDashboard() {
  const overview = useGetOverviewQuery();
  const recent = useListVideosQuery({ limit: 5 });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Library health and learner progress at a glance."
        action={
          <Link to="/admin/videos/new">
            <Button leftIcon={<PlusIcon width={16} height={16} />}>New video</Button>
          </Link>
        }
      />

      {overview.isError ? (
        <ErrorState message={getErrorMessage(overview.error)} onRetry={overview.refetch} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {overview.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-8 w-14" />
                </Card>
              ))
            : overview.data && (
                <>
                  <StatCard
                    label="Videos"
                    value={overview.data.totalVideos}
                    sublabel={`${overview.data.publishedVideos} published · ${overview.data.draftVideos} draft`}
                  />
                  <StatCard
                    label="Learners"
                    value={overview.data.totalLearners}
                    sublabel={`${overview.data.totalAssignments} assignments`}
                  />
                  <StatCard
                    label="Completed"
                    value={overview.data.completed}
                    sublabel={`${overview.data.inProgress} in progress`}
                    tone="success"
                  />
                  <StatCard
                    label="Completion rate"
                    value={`${overview.data.completionRate}%`}
                    sublabel="Across all assignments"
                    tone={overview.data.completionRate >= 50 ? 'success' : 'warning'}
                  />
                </>
              )}
        </div>
      )}

      {overview.data && overview.data.totalAssignments > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Assignment breakdown"
            description={`${overview.data.totalAssignments} total assignments`}
          />
          <CardBody className="space-y-4">
            {[
              { label: 'Completed', value: overview.data.completed, tone: 'success' as const },
              { label: 'In progress', value: overview.data.inProgress, tone: 'brand' as const },
              { label: 'Not started', value: overview.data.notStarted, tone: 'brand' as const },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
                </div>
                <ProgressBar
                  value={Math.round((row.value / overview.data!.totalAssignments) * 100)}
                  tone={row.tone}
                  size="sm"
                />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Recent videos"
          action={
            <Link to="/admin/videos" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
        />
        <CardBody className="p-0">
          {recent.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : recent.isError ? (
            <div className="p-5">
              <ErrorState message={getErrorMessage(recent.error)} onRetry={recent.refetch} />
            </div>
          ) : !recent.data?.items.length ? (
            <div className="p-5">
              <EmptyState
                icon={<VideoIcon />}
                title="No videos yet"
                message="Create your first video to start building a lesson."
                action={
                  <Link to="/admin/videos/new">
                    <Button size="sm" leftIcon={<PlusIcon width={16} height={16} />}>
                      New video
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.data.items.map((video) => (
                <li key={video._id}>
                  <Link
                    to={`/admin/videos/${video._id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="h-11 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{video.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {video.questionCount ?? 0} question
                        {video.questionCount === 1 ? '' : 's'} ·{' '}
                        {formatDuration(video.durationSeconds)}
                      </p>
                    </div>
                    <VideoStatusBadge status={video.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
