import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetVideoReportQuery } from '@/features/reports/reportsApi';
import { PageHeader } from '@/layouts/AppLayout';
import { Card, StatCard } from '@/components/ui/Card';
import { ProgressBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Table, Td, Th } from '@/components/ui/Table';
import { ChevronLeftIcon, UsersIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration, formatRelative } from '@/lib/format';
import { LearnerResponseModal } from './LearnerResponseModal';

export function VideoReportPage() {
  const { videoId = '' } = useParams();
  const [openLearnerId, setOpenLearnerId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useGetVideoReportQuery(videoId);

  if (isLoading) return <LoadingState label="Building report…" />;
  if (isError || !data) {
    return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;
  }

  return (
    <>
      <PageHeader
        title={data.video.title}
        description={`${data.video.questionCount} question${
          data.video.questionCount === 1 ? '' : 's'
        } · ${formatDuration(data.video.durationSeconds)}`}
        backLink={
          <Link
            to="/admin/reports"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeftIcon width={16} height={16} />
            Back to reports
          </Link>
        }
        action={
          <Link
            to={`/admin/videos/${videoId}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Edit video
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned" value={data.summary.assigned} />
        <StatCard label="Completed" value={data.summary.completed} tone="success" />
        <StatCard
          label="Completion rate"
          value={`${data.summary.completionRate}%`}
          tone={data.summary.completionRate >= 50 ? 'success' : 'warning'}
        />
        <StatCard
          label="Avg. watched"
          value={`${data.summary.averageCompletion}%`}
          sublabel="Across assigned learners"
        />
      </div>

      {!data.rows.length ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No learners assigned"
          message="Assign this video to learners to start collecting progress."
          action={
            <Link
              to={`/admin/videos/${videoId}`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Assign learners
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Learner</Th>
                <Th>Status</Th>
                <Th className="min-w-[140px]">Progress</Th>
                <Th align="right">Answered</Th>
                <Th align="right">Accuracy</Th>
                <Th align="right">Last activity</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.learner.id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{row.learner.name}</p>
                      <p className="truncate text-xs text-slate-500">{row.learner.email}</p>
                    </div>
                  </Td>
                  <Td>
                    <ProgressBadge status={row.status} />
                  </Td>
                  <Td>
                    <ProgressBar
                      value={row.completionPercentage}
                      size="sm"
                      showLabel
                      tone={row.status === 'completed' ? 'success' : 'brand'}
                    />
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {row.answered}/{data.video.questionCount}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {row.accuracy === null ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <span
                        className={
                          row.accuracy >= 70
                            ? 'font-medium text-emerald-600'
                            : 'font-medium text-amber-600'
                        }
                      >
                        {row.accuracy}%
                      </span>
                    )}
                  </Td>
                  <Td align="right" className="whitespace-nowrap text-slate-500">
                    {formatRelative(row.lastWatchedAt)}
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => setOpenLearnerId(row.learner.id)}
                      disabled={row.answered === 0}
                      className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                    >
                      View answers
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <LearnerResponseModal
        videoId={videoId}
        learnerId={openLearnerId}
        onClose={() => setOpenLearnerId(null)}
      />
    </>
  );
}
