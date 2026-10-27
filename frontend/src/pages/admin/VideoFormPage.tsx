import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateVideoMutation } from '@/features/videos/videosApi';
import { useAppDispatch } from '@/app/hooks';
import { toastShown } from '@/features/ui/toastSlice';
import { PageHeader } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { CheckIcon, ChevronLeftIcon } from '@/components/Icons';
import { Spinner } from '@/components/ui/Spinner';
import { useVideoDuration } from '@/hooks/useVideoDuration';
import { formatDuration } from '@/lib/format';
import { getErrorMessage } from '@/lib/baseQuery';

/**
 * Creates a video. Questions and assignments are added afterwards on the detail
 * page — a video has to exist before anything can hang off it.
 */
export function VideoFormPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [tags, setTags] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  // Set once the admin edits the duration by hand, so a later probe result
  // cannot overwrite a deliberate override.
  const [isDurationManual, setDurationManual] = useState(false);

  const [createVideo, { isLoading }] = useCreateVideoMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Reads the real length out of the file header as soon as a URL is pasted.
  const probe = useVideoDuration(videoUrl);

  useEffect(() => {
    if (probe.status === 'ready' && probe.seconds && !isDurationManual) {
      setDurationSeconds(String(probe.seconds));
    }
  }, [probe.status, probe.seconds, isDurationManual]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    try {
      const created = await createVideo({
        title: title.trim(),
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }).unwrap();

      dispatch(toastShown('Video created. Add questions next.'));
      navigate(`/admin/videos/${created._id}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Could not create the video.'));
    }
  };

  return (
    <>
      <PageHeader
        title="New video"
        description="Add the source URL now; you can place questions on the timeline next."
        backLink={
          <Link
            to="/admin/videos"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeftIcon width={16} height={16} />
            Back to videos
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introduction to Trade Compliance"
              required
              minLength={3}
              maxLength={200}
            />

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will a learner take away from this video?"
              rows={3}
              maxLength={2000}
            />

            <Input
              label="Video URL"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://cdn.example.com/lesson.mp4"
              required
              hint="A direct link to an MP4 file."
            />

            <Input
              label="Thumbnail URL"
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://cdn.example.com/lesson.jpg"
            />

            {/* The completion length comes from the URL, so it reports itself here rather
                than sitting as an empty box the admin has to wonder about. The
                input only appears when detection cannot answer, or when someone
                deliberately asks to set it by hand. */}
            {probe.status === 'probing' && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Reading the duration from this video…
              </p>
            )}

            {probe.status === 'ready' && !isDurationManual && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <CheckIcon width={16} height={16} />
                <span>
                  Completion length:{' '}
                  <strong className="font-semibold">
                    {formatDuration(Number(durationSeconds) || 0)}
                  </strong>{' '}
                  <span className="text-emerald-700">· detected from the video</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDurationManual(true)}
                  className="ml-auto font-medium text-emerald-900 underline underline-offset-2 hover:no-underline"
                >
                  Set manually
                </button>
              </div>
            )}

            {(probe.status === 'error' || isDurationManual) && (
              <Input
                label="Completion length (seconds)"
                type="number"
                min={0}
                value={durationSeconds}
                onChange={(e) => {
                  setDurationManual(true);
                  setDurationSeconds(e.target.value);
                }}
                placeholder="e.g. 600"
                required
                error={probe.status === 'error' ? (probe.error ?? undefined) : undefined}
                hint={
                  probe.status === 'error'
                    ? undefined
                    : 'Learners must watch 95% of this to complete the video.'
                }
              />
            )}

            <Input
              label="Tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="compliance, onboarding"
              hint="Comma separated."
            />

            {formError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
              >
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
              <Link to="/admin/videos">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading}>
                Create video
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
