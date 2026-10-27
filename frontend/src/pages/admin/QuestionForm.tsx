import { FormEvent, useEffect, useState } from 'react';
import {
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  type QuestionPayload,
} from '@/features/questions/questionsApi';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TrashIcon, PlusIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDuration } from '@/lib/format';
import type { Question, QuestionType } from '@/types';

const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

interface DraftOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

const emptyOptions = (): DraftOption[] => [
  { key: 'a', text: '', isCorrect: false },
  { key: 'b', text: '', isCorrect: false },
];

/**
 * Create/edit form for a timestamp question. Correctness is captured inline on
 * each option, which avoids a second "which one is right?" control that can
 * fall out of sync with the option list.
 */
export function QuestionForm({
  isOpen,
  onClose,
  videoId,
  videoDuration,
  existing,
  defaultTimestamp,
}: {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoDuration: number;
  existing?: Question | null;
  defaultTimestamp?: number;
}) {
  const [type, setType] = useState<QuestionType>('single_choice');
  const [prompt, setPrompt] = useState('');
  const [timestamp, setTimestamp] = useState('0');
  const [options, setOptions] = useState<DraftOption[]>(emptyOptions);
  const [acceptedAnswers, setAcceptedAnswers] = useState('');
  const [points, setPoints] = useState('1');
  const [explanation, setExplanation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [createQuestion, createState] = useCreateQuestionMutation();
  const [updateQuestion, updateState] = useUpdateQuestionMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  // Reset the form whenever the dialog opens, so an edit never leaks into the
  // next "add question" and vice versa.
  useEffect(() => {
    if (!isOpen) return;

    if (existing) {
      setType(existing.type);
      setPrompt(existing.prompt);
      setTimestamp(String(existing.timestampSeconds));
      setOptions(
        existing.options.length
          ? existing.options.map((option) => ({
              key: option.key,
              text: option.text,
              isCorrect: existing.correctOptionKeys.includes(option.key),
            }))
          : emptyOptions(),
      );
      setAcceptedAnswers(existing.acceptedAnswers.join(', '));
      setPoints(String(existing.points));
      setExplanation(existing.explanation);
    } else {
      setType('single_choice');
      setPrompt('');
      setTimestamp(String(defaultTimestamp ?? 0));
      setOptions(emptyOptions());
      setAcceptedAnswers('');
      setPoints('1');
      setExplanation('');
    }
    setFormError(null);
  }, [isOpen, existing, defaultTimestamp]);

  const isChoice = type !== 'short_answer';

  /** Single choice allows exactly one correct option, so picking one clears the rest. */
  const toggleCorrect = (key: string) => {
    setOptions((current) =>
      current.map((option) => {
        if (type === 'single_choice') {
          return { ...option, isCorrect: option.key === key };
        }
        return option.key === key ? { ...option, isCorrect: !option.isCorrect } : option;
      }),
    );
  };

  const addOption = () => {
    setOptions((current) => {
      if (current.length >= OPTION_KEYS.length) return current;
      const used = new Set(current.map((o) => o.key));
      const nextKey = OPTION_KEYS.find((key) => !used.has(key))!;
      return [...current, { key: nextKey, text: '', isCorrect: false }];
    });
  };

  const removeOption = (key: string) => {
    setOptions((current) =>
      current.length <= 2 ? current : current.filter((option) => option.key !== key),
    );
  };

  /** Mirrors the API's per-type rules so the user sees the problem before a round trip. */
  const validate = (): string | null => {
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || seconds < 0) return 'Enter a valid timestamp.';
    if (videoDuration > 0 && seconds > videoDuration) {
      return `The timestamp must be within the video (max ${formatDuration(videoDuration)}).`;
    }
    if (prompt.trim().length < 3) return 'The question text must be at least 3 characters.';

    if (type === 'short_answer') {
      const answers = acceptedAnswers.split(',').map((a) => a.trim()).filter(Boolean);
      if (!answers.length) return 'Add at least one accepted answer.';
      return null;
    }

    const filled = options.filter((option) => option.text.trim());
    if (filled.length < 2) return 'A choice question needs at least two options with text.';

    const correct = filled.filter((option) => option.isCorrect);
    if (!correct.length) return 'Mark at least one option as correct.';
    if (type === 'single_choice' && correct.length !== 1) {
      return 'A single-choice question must have exactly one correct option.';
    }
    if (type === 'multiple_choice' && correct.length < 2) {
      return 'A multiple-choice question needs at least two correct options. Use single choice otherwise.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    const filled = options.filter((option) => option.text.trim());
    const body: QuestionPayload = {
      timestampSeconds: Number(timestamp),
      type,
      prompt: prompt.trim(),
      points: Number(points) || 1,
      explanation: explanation.trim(),
      ...(isChoice
        ? {
            options: filled.map((option) => ({ key: option.key, text: option.text.trim() })),
            correctOptionKeys: filled.filter((o) => o.isCorrect).map((o) => o.key),
            acceptedAnswers: [],
          }
        : {
            options: [],
            correctOptionKeys: [],
            acceptedAnswers: acceptedAnswers
              .split(',')
              .map((answer) => answer.trim())
              .filter(Boolean),
          }),
    };

    try {
      if (existing) {
        await updateQuestion({ id: existing._id, videoId, body }).unwrap();
      } else {
        await createQuestion({ videoId, body }).unwrap();
      }
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Could not save the question.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? 'Edit question' : 'Add question'}
      description="The video pauses at this timestamp until the learner answers."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving} type="submit">
            {existing ? 'Save changes' : 'Add question'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Timestamp (seconds)"
            type="number"
            min={0}
            max={videoDuration || undefined}
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            required
            hint={
              videoDuration
                ? `Video is ${formatDuration(videoDuration)} long`
                : 'Completion length not set yet'
            }
          />

          <Select
            label="Question type"
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
          >
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
          </Select>
        </div>

        <Textarea
          label="Question"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What does an HS code identify?"
          rows={2}
          required
        />

        {isChoice ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Options
                <span className="ml-2 font-normal text-slate-500">
                  {type === 'single_choice'
                    ? '— select the one correct answer'
                    : '— select every correct answer'}
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addOption}
                disabled={options.length >= OPTION_KEYS.length}
                leftIcon={<PlusIcon width={14} height={14} />}
              >
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option) => (
                <div
                  key={option.key}
                  className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                    option.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type={type === 'single_choice' ? 'radio' : 'checkbox'}
                    name="correct-option"
                    checked={option.isCorrect}
                    onChange={() => toggleCorrect(option.key)}
                    className="ml-1 h-4 w-4 shrink-0 accent-emerald-600"
                    aria-label={`Mark option ${option.key.toUpperCase()} as correct`}
                  />
                  <span className="w-5 shrink-0 text-center text-xs font-semibold uppercase text-slate-400">
                    {option.key}
                  </span>
                  <input
                    value={option.text}
                    onChange={(e) =>
                      setOptions((current) =>
                        current.map((o) =>
                          o.key === option.key ? { ...o, text: e.target.value } : o,
                        ),
                      )
                    }
                    placeholder={`Option ${option.key.toUpperCase()}`}
                    className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(option.key)}
                    disabled={options.length <= 2}
                    aria-label={`Remove option ${option.key.toUpperCase()}`}
                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Input
            label="Accepted answers"
            value={acceptedAnswers}
            onChange={(e) => setAcceptedAnswers(e.target.value)}
            placeholder="Harmonized System, HS"
            required
            hint="Comma separated. Matched ignoring case and surrounding spaces."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-[120px,1fr]">
          <Input
            label="Points"
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
          <Input
            label="Explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Shown to the learner after they answer"
          />
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
            {formError}
          </div>
        )}
      </form>
    </Modal>
  );
}
