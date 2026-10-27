import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useDeleteVideoMutation,
  useGetVideoQuery,
  useSetVideoStatusMutation,
  useUpdateVideoMutation,
} from '@/features/videos/videosApi';
import { useDeleteQuestionMutation } from '@/features/questions/questionsApi';
import { useAppDispatch } from '@/app/hooks';
import { toastShown } from '@/features/ui/toastSlice';
import { PageHeader } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { QuestionTypeBadge, VideoStatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';
import {
  ChevronLeftIcon,
  EditIcon,
  PlusIcon,
  QuestionIcon,
  ReportIcon,
  TrashIcon,
} from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration } from '@/lib/format';
import type { Question } from '@/types';
import { QuestionForm } from './QuestionForm';
import { AssignLearnersPanel } from './AssignLearnersPanel';

type Tab = 'questions' | 'assignments' | 'settings';

export function VideoDetailPage() {
  const { videoId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [tab, setTab] = useState<Tab>('questions');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isQuestionFormOpen, setQuestionFormOpen] = useState(false);
  const [questionPendingDelete, setQuestionPendingDelete] = useState<Question | null>(null);
  const [isDeleteVideoOpen, setDeleteVideoOpen] = useState(false);

  const { data: video, isLoading, isError, error, refetch } = useGetVideoQuery(videoId);
  const [setStatus, statusState] = useSetVideoStatusMutation();
  const [deleteQuestion, deleteQuestionState] = useDeleteQuestionMutation();
  const [deleteVideo, deleteVideoState] = useDeleteVideoMutation();

  if (isLoading) return <LoadingState label="Loading video…" />;
  if (isError || !video) {
    return <ErrorState message={getErrorMessage(error, 'Video not found.')} onRetry={refetch} />;
  }

  const questions = [...(video.questions ?? [])].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

  const handleToggleStatus = async () => {
    try {
      await setStatus({ id: videoId, publish: video.status !== 'published' }).unwrap();
      dispatch(
        toastShown(
          video.status === 'published'
            ? 'Video unpublished. Learners can no longer see it.'
            : 'Video published. Assigned learners can now watch it.',
        ),
      );
    } catch (err) {
      // Publishing is blocked when the data is incomplete — surface exactly why.
      dispatch(toastShown(getErrorMessage(err, 'Could not change the status.'), 'error'));
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionPendingDelete) return;
    try {
      await deleteQuestion({ id: questionPendingDelete._id, videoId }).unwrap();
      dispatch(toastShown('Question deleted.'));
      setQuestionPendingDelete(null);
    } catch (err) {
      dispatch(toastShown(getErrorMessage(err, 'Could not delete the question.'), 'error'));
    }
  };

  const handleDeleteVideo = async () => {
    try {
      await deleteVideo(videoId).unwrap();
      dispatch(toastShown('Video deleted.'));
      navigate('/admin/videos');
    } catch (err) {
      dispatch(toastShown(getErrorMessage(err, 'Could not delete the video.'), 'error'));
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'questions', label: 'Questions', count: questions.length },
    { id: 'assignments', label: 'Assignments' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <>
      <PageHeader
        title={video.title}
        description={video.description || 'No description'}
        backLink={
          <Link
            to="/admin/videos"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeftIcon width={16} height={16} />
            Back to videos
          </Link>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/reports/${videoId}`}>
              <Button variant="secondary" leftIcon={<ReportIcon width={16} height={16} />}>
                Report
              </Button>
            </Link>
            <Button
              variant={video.status === 'published' ? 'secondary' : 'primary'}
              onClick={handleToggleStatus}
              isLoading={statusState.isLoading}
            >
              {video.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-2">
            <VideoStatusBadge status={video.status} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
            {video.durationSeconds ? formatDuration(video.durationSeconds) : 'Not set'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
            {questions.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total points</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
            {questions.reduce((sum, q) => sum + q.points, 0)}
          </p>
        </Card>
      </div>

      <div className="mb-5 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'questions' && (
        <Card>
          <CardHeader
            title="Timeline questions"
            description="Each question pauses the video at its timestamp."
            action={
              <Button
                size="sm"
                leftIcon={<PlusIcon width={15} height={15} />}
                onClick={() => {
                  setEditingQuestion(null);
                  setQuestionFormOpen(true);
                }}
              >
                Add question
              </Button>
            }
          />
          <CardBody className={questions.length ? 'p-0' : undefined}>
            {!questions.length ? (
              <EmptyState
                icon={<QuestionIcon />}
                title="No questions yet"
                message="Add a question at a timestamp to make this video interactive."
                action={
                  <Button
                    size="sm"
                    leftIcon={<PlusIcon width={15} height={15} />}
                    onClick={() => {
                      setEditingQuestion(null);
                      setQuestionFormOpen(true);
                    }}
                  >
                    Add question
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {questions.map((question) => (
                  <li key={question._id} className="flex gap-4 px-5 py-4">
                    <div className="w-14 shrink-0 text-center">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-700">
                        {formatDuration(question.timestampSeconds)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <QuestionTypeBadge type={question.type} />
                        <span className="text-xs text-slate-400">
                          {question.points} point{question.points === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-slate-900">
                        {question.prompt}
                      </p>

                      {question.type === 'short_answer' ? (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Accepts: {question.acceptedAnswers.join(', ')}
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {question.options.map((option) => {
                            const isCorrect = question.correctOptionKeys.includes(option.key);
                            return (
                              <li
                                key={option.key}
                                className={`flex items-center gap-2 text-xs ${
                                  isCorrect ? 'font-medium text-emerald-700' : 'text-slate-500'
                                }`}
                              >
                                <span className="w-4 uppercase">{option.key}.</span>
                                <span>{option.text}</span>
                                {isCorrect && <span className="text-emerald-600">✓</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setQuestionFormOpen(true);
                        }}
                        aria-label="Edit question"
                        className="h-8 w-8 rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <EditIcon width={15} height={15} className="mx-auto" />
                      </button>
                      <button
                        onClick={() => setQuestionPendingDelete(question)}
                        aria-label="Delete question"
                        className="h-8 w-8 rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <TrashIcon width={15} height={15} className="mx-auto" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'assignments' && (
        <Card>
          <CardBody>
            <AssignLearnersPanel videoId={videoId} />
          </CardBody>
        </Card>
      )}

      {tab === 'settings' && <VideoSettings video={video} />}

      <QuestionForm
        isOpen={isQuestionFormOpen}
        onClose={() => {
          setQuestionFormOpen(false);
          setEditingQuestion(null);
        }}
        videoId={videoId}
        videoDuration={video.durationSeconds}
        existing={editingQuestion}
      />

      <ConfirmDialog
        isOpen={Boolean(questionPendingDelete)}
        title="Delete question"
        message="This also deletes every learner answer to it. This cannot be undone."
        confirmLabel="Delete question"
        isLoading={deleteQuestionState.isLoading}
        onConfirm={handleDeleteQuestion}
        onCancel={() => setQuestionPendingDelete(null)}
      />

      <ConfirmDialog
        isOpen={isDeleteVideoOpen}
        title="Delete video"
        message="This deletes the video along with its questions, assignments, learner progress and answers. This cannot be undone."
        confirmLabel="Delete video"
        isLoading={deleteVideoState.isLoading}
        onConfirm={handleDeleteVideo}
        onCancel={() => setDeleteVideoOpen(false)}
      />

      {tab === 'settings' && (
        <Card className="mt-6 border-red-200">
          <CardHeader title="Danger zone" description="Deleting a video cannot be undone." />
          <CardBody>
            <Button variant="danger" onClick={() => setDeleteVideoOpen(true)}>
              Delete this video
            </Button>
          </CardBody>
        </Card>
      )}
    </>
  );
}

/** Inline editor for the video's own fields. */
function VideoSettings({ video }: { video: { _id: string; title: string; description: string; videoUrl: string; thumbnailUrl: string; durationSeconds: number } }) {
  const dispatch = useAppDispatch();
  const [updateVideo, { isLoading }] = useUpdateVideoMutation();

  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnailUrl);
  const [durationSeconds, setDurationSeconds] = useState(String(video.durationSeconds));

  const handleSave = async () => {
    try {
      await updateVideo({
        id: video._id,
        body: {
          title: title.trim(),
          description: description.trim(),
          videoUrl: videoUrl.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          durationSeconds: Number(durationSeconds) || 0,
        },
      }).unwrap();
      dispatch(toastShown('Video updated.'));
    } catch (err) {
      dispatch(toastShown(getErrorMessage(err, 'Could not save changes.'), 'error'));
    }
  };

  return (
    <Card>
      <CardHeader title="Video details" />
      <CardBody className="max-w-2xl space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input label="Video URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <Input
          label="Thumbnail URL"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
        <Input
          label="Duration (seconds)"
          type="number"
          min={0}
          value={durationSeconds}
          onChange={(e) => setDurationSeconds(e.target.value)}
          hint="Required before the video can be published."
        />
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button onClick={handleSave} isLoading={isLoading}>
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
