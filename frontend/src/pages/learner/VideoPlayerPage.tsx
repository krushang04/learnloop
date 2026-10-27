import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  useGetPlayerPayloadQuery,
  useSubmitAnswerMutation,
} from '@/features/learning/learningApi';
import {
  playerInitialised,
  playerReset,
  questionAnswered,
  questionDismissed,
  questionTriggered,
} from '@/features/learning/playerSlice';
import { useProgressAutosave } from '@/features/learning/useProgressAutosave';
import { QuestionOverlay } from '@/features/learning/QuestionOverlay';
import { learningApi } from '@/features/learning/learningApi';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ProgressBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { CheckIcon, ChevronLeftIcon, ClockIcon, QuestionIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration } from '@/lib/format';
import type { Progress } from '@/types';

/** Resuming within this margin of the end would replay only the credits. */
const RESUME_END_MARGIN_SECONDS = 3;

export function VideoPlayerPage() {
  const { videoId = '' } = useParams();
  const dispatch = useAppDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data, isLoading, isError, error, refetch } = useGetPlayerPayloadQuery(videoId);
  const [submitAnswer, submitState] = useSubmitAnswerMutation();

  const { activeQuestionId, answeredQuestionIds, lastResult, saveState } = useAppSelector(
    (state) => state.player,
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<Progress | null>(null);
  const hasResumedRef = useRef(false);

  const questions = useMemo(
    () => [...(data?.questions ?? [])].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    [data?.questions],
  );

  const getPosition = useCallback(() => videoRef.current?.currentTime ?? null, []);
  const { flush, setDuration } = useProgressAutosave(videoId, getPosition, setLiveProgress);

  // Seed the player with answers already on record, so a refresh mid-video does
  // not re-ask questions the learner has answered.
  useEffect(() => {
    if (!data) return;
    dispatch(playerInitialised(data.answers.map((answer) => answer.questionId)));
    setLiveProgress(data.progress);
    hasResumedRef.current = false;
    return () => {
      dispatch(playerReset());
    };
  }, [data, dispatch]);

  // On leaving, refresh the assignment list so its progress bars are current.
  useEffect(() => {
    return () => {
      dispatch(learningApi.util.invalidateTags(['MyAssignment']));
    };
  }, [dispatch]);

  const activeQuestion = questions.find((question) => question.id === activeQuestionId) ?? null;

  /**
   * Finds the earliest unanswered question the playhead has reached. Checking
   * the earliest (not the nearest) means seeking forward past several questions
   * still surfaces them in order rather than letting them be skipped.
   */
  const findDueQuestion = useCallback(
    (time: number) =>
      questions.find(
        (question) =>
          question.timestampSeconds <= time && !answeredQuestionIds.includes(question.id),
      ) ?? null,
    [questions, answeredQuestionIds],
  );

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (activeQuestionId) return;

    const due = findDueQuestion(video.currentTime);
    if (!due) return;

    video.pause();
    // If the learner seeked well past the question, bring them back to it so
    // the question is answered in the context it belongs to.
    if (video.currentTime - due.timestampSeconds > 1) {
      video.currentTime = due.timestampSeconds;
    }
    dispatch(questionTriggered(due.id));
    setAnswerError(null);
    void flush({ force: true });
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || hasResumedRef.current) return;
    hasResumedRef.current = true;

    setDuration(video.duration);

    // Restore the saved playhead. Starting over at the end would be useless,
    // so a finished video restarts from the beginning.
    const resumeAt = data?.progress.lastPositionSeconds ?? 0;
    if (resumeAt > 0 && resumeAt < video.duration - RESUME_END_MARGIN_SECONDS) {
      video.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  };

  const handleAnswerSubmit = async (answer: {
    selectedOptionKeys?: string[];
    answerText?: string;
  }) => {
    if (!activeQuestion) return;
    setAnswerError(null);

    try {
      const response = await submitAnswer({
        videoId,
        questionId: activeQuestion.id,
        ...answer,
      }).unwrap();

      dispatch(
        questionAnswered({
          questionId: activeQuestion.id,
          isCorrect: response.result.isCorrect,
          explanation: response.result.explanation,
        }),
      );
      setLiveProgress(response.progress);
    } catch (err) {
      setAnswerError(getErrorMessage(err, 'Could not submit your answer.'));
    }
  };

  const handleContinue = () => {
    dispatch(questionDismissed());
    void videoRef.current?.play();
  };

  if (isLoading) return <LoadingState label="Loading video…" />;
  if (isError || !data) {
    return (
      <>
        <BackLink />
        <ErrorState
          title="Cannot open this video"
          message={getErrorMessage(
            error,
            'It may have been unpublished or unassigned from you.',
          )}
          onRetry={refetch}
        />
      </>
    );
  }

  const progress = liveProgress ?? data.progress;
  const answeredCount = answeredQuestionIds.length;
  const nextQuestion = questions.find(
    (question) =>
      !answeredQuestionIds.includes(question.id) && question.timestampSeconds > currentTime,
  );

  return (
    <>
      <BackLink />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-xl bg-black shadow-sm">
            <video
              ref={videoRef}
              src={data.video.videoUrl}
              poster={data.video.thumbnailUrl || undefined}
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              className="aspect-video w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPause={() => void flush({ force: true })}
              onEnded={() => void flush({ force: true })}
              onSeeked={() => void flush({ force: true })}
            />

            {activeQuestion && (
              <QuestionOverlay
                question={activeQuestion}
                isSubmitting={submitState.isLoading}
                error={answerError}
                result={lastResult}
                onSubmit={handleAnswerSubmit}
                onContinue={handleContinue}
              />
            )}
          </div>

          {/* Markers show where questions sit on the timeline. */}
          {questions.length > 0 && data.video.durationSeconds > 0 && (
            <div className="relative mt-3 h-6">
              <div className="absolute inset-x-0 top-2.5 h-1 rounded-full bg-slate-200" />
              <div
                className="absolute left-0 top-2.5 h-1 rounded-full bg-brand-500 transition-[width]"
                style={{
                  width: `${Math.min((currentTime / data.video.durationSeconds) * 100, 100)}%`,
                }}
              />
              {questions.map((question) => {
                const isAnswered = answeredQuestionIds.includes(question.id);
                const left = Math.min(
                  (question.timestampSeconds / data.video.durationSeconds) * 100,
                  100,
                );
                return (
                  <span
                    key={question.id}
                    title={`Question at ${formatDuration(question.timestampSeconds)}`}
                    style={{ left: `${left}%` }}
                    className={`absolute top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow ${
                      isAnswered ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <h1 className="text-xl font-semibold text-slate-900">{data.video.title}</h1>
            {data.video.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {data.video.description}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader
              title="Your progress"
              action={<SaveIndicator state={saveState} />}
            />
            <CardBody className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Watched</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {progress.completionPercentage}%
                  </span>
                </div>
                <ProgressBar
                  value={progress.completionPercentage}
                  tone={progress.status === 'completed' ? 'success' : 'brand'}
                />
              </div>

              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <ProgressBadge status={progress.status} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    <QuestionIcon width={14} height={14} />
                    Questions
                  </dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {answeredCount}/{questions.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    <ClockIcon width={14} height={14} />
                    Position
                  </dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatDuration(currentTime)} / {formatDuration(data.video.durationSeconds)}
                  </dd>
                </div>
              </dl>

              {progress.status === 'completed' ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                  <CheckIcon width={16} height={16} />
                  You have completed this video.
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
                  Watch to the end and answer every question to complete this video. Your position
                  saves automatically.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Questions"
              description={
                nextQuestion
                  ? `Next at ${formatDuration(nextQuestion.timestampSeconds)}`
                  : questions.length
                    ? 'All questions answered'
                    : 'No questions in this video'
              }
            />
            <CardBody className="p-0">
              {!questions.length ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  This video has no questions — just watch it through.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {questions.map((question, index) => {
                    const isAnswered = answeredQuestionIds.includes(question.id);
                    const isActive = question.id === activeQuestionId;
                    return (
                      <li
                        key={question.id}
                        className={`flex items-center gap-3 px-5 py-3 ${
                          isActive ? 'bg-amber-50' : ''
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isAnswered
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isAnswered ? '✓' : index + 1}
                        </span>
                        <span className="flex-1 text-xs text-slate-600">
                          {/* The prompt stays hidden until it fires, so the
                              sidebar cannot be used to read ahead. */}
                          {isAnswered || isActive ? question.prompt : 'Question locked'}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">
                          {formatDuration(question.timestampSeconds)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/learn"
      className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
    >
      <ChevronLeftIcon width={16} height={16} />
      Back to my learning
    </Link>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;

  const label =
    state === 'saving' ? 'Saving…' : state === 'saved' ? 'Progress saved' : 'Save failed';
  const tone =
    state === 'error' ? 'text-red-600' : state === 'saved' ? 'text-emerald-600' : 'text-slate-400';

  return <span className={`text-xs ${tone}`}>{label}</span>;
}
