import { useGetLearnerReportQuery } from '@/features/reports/reportsApi';
import { Modal } from '@/components/ui/Modal';
import { Badge, ProgressBadge, QuestionTypeBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDateTime, formatDuration } from '@/lib/format';

/**
 * A learner's full answer sheet for one video: every question, what they
 * submitted, and the correct answer beside it.
 */
export function LearnerResponseModal({
  videoId,
  learnerId,
  onClose,
}: {
  videoId: string;
  learnerId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useGetLearnerReportQuery(
    { videoId, learnerId: learnerId ?? '' },
    { skip: !learnerId },
  );

  return (
    <Modal
      isOpen={Boolean(learnerId)}
      onClose={onClose}
      title={data ? data.learner.name : 'Learner responses'}
      description={data?.learner.email}
      size="xl"
    >
      {isLoading ? (
        <LoadingState label="Loading responses…" />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : data ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1">
                <ProgressBadge status={data.progress.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Watched</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                {data.progress.completionPercentage}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Score</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                {data.summary.correct}/{data.summary.answered} correct
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Points</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                {data.summary.pointsAwarded}/{data.summary.pointsPossible}
              </p>
            </div>
          </div>

          {data.items.length === 0 ? (
            <EmptyState
              title="No questions in this video"
              message="There is nothing for this learner to answer yet. Add questions to the video to start collecting responses."
            />
          ) : (
            <ul className="space-y-3">
              {data.items.map((item, index) => {
                const { question, response } = item;
                return (
                  <li
                    key={question.id}
                    className={`rounded-lg border p-4 ${
                      !response
                        ? 'border-slate-200 bg-slate-50'
                        : response.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Q{index + 1}</span>
                      <QuestionTypeBadge type={question.type} />
                      <Badge tone="neutral">at {formatDuration(question.timestampSeconds)}</Badge>
                      {!response ? (
                        <Badge tone="neutral">Not answered</Badge>
                      ) : response.isCorrect ? (
                        <Badge tone="success">Correct</Badge>
                      ) : (
                        <Badge tone="danger">Incorrect</Badge>
                      )}
                      {response && response.attempts > 1 && (
                        <Badge tone="warning">{response.attempts} attempts</Badge>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900">{question.prompt}</p>

                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-slate-500">Their answer</dt>
                        <dd className="font-medium text-slate-800">
                          {!response ? (
                            <span className="italic text-slate-400">—</span>
                          ) : question.type === 'short_answer' ? (
                            `"${response.answerText}"`
                          ) : (
                            response.selectedOptionTexts.join(', ')
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-slate-500">Correct answer</dt>
                        <dd className="font-medium text-emerald-700">
                          {question.type === 'short_answer'
                            ? question.acceptedAnswers.join(' / ')
                            : question.correctOptionTexts.join(', ')}
                        </dd>
                      </div>
                      {response && (
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-slate-500">Answered</dt>
                          <dd className="text-slate-600">{formatDateTime(response.answeredAt)}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </Modal>
  );
}
