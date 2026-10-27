import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { QuestionTypeBadge } from '@/components/ui/Badge';
import { CheckIcon, CloseIcon } from '@/components/Icons';
import { formatDuration } from '@/lib/format';
import type { LearnerQuestion } from '@/types';

interface Props {
  question: LearnerQuestion;
  isSubmitting: boolean;
  error: string | null;
  result: { isCorrect: boolean; explanation: string } | null;
  onSubmit: (answer: { selectedOptionKeys?: string[]; answerText?: string }) => void;
  onContinue: () => void;
}

/**
 * The blocking quiz card shown over the paused video. It has no dismiss
 * control on purpose: the video stays paused until the question is answered,
 * which is what makes "all questions answered" a meaningful completion rule.
 */
export function QuestionOverlay({
  question,
  isSubmitting,
  error,
  result,
  onSubmit,
  onContinue,
}: Props) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState('');

  // Clear the previous question's input when a new one appears.
  useEffect(() => {
    setSelectedKeys([]);
    setAnswerText('');
  }, [question.id]);

  const isChoice = question.type !== 'short_answer';

  const toggleOption = (key: string) => {
    if (result) return;
    setSelectedKeys((current) => {
      if (question.type === 'single_choice') return [key];
      return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    });
  };

  const canSubmit = isChoice ? selectedKeys.length > 0 : answerText.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting || result) return;
    onSubmit(isChoice ? { selectedOptionKeys: selectedKeys } : { answerText: answerText.trim() });
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl animate-slide-up">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <QuestionTypeBadge type={question.type} />
          <span className="text-xs text-slate-500">
            Paused at {formatDuration(question.timestampSeconds)}
          </span>
          <span className="ml-auto text-xs font-medium text-slate-400">
            {question.points} point{question.points === 1 ? '' : 's'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <h3 className="text-base font-semibold text-slate-900">{question.prompt}</h3>
          {question.type === 'multiple_choice' && (
            <p className="mt-1 text-xs text-slate-500">Select every answer that applies.</p>
          )}

          <div className="mt-4 space-y-2">
            {isChoice ? (
              question.options.map((option) => {
                const isSelected = selectedKeys.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => toggleOption(option.key)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-900'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    } ${result ? 'cursor-default opacity-80' : ''}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-semibold ${
                        question.type === 'single_choice' ? 'rounded-full' : 'rounded'
                      } ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-slate-300 text-slate-400'
                      }`}
                    >
                      {isSelected ? '✓' : option.key.toUpperCase()}
                    </span>
                    <span className="flex-1">{option.text}</span>
                  </button>
                );
              })
            ) : (
              <input
                autoFocus
                value={answerText}
                disabled={Boolean(result)}
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="Type your answer…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50"
              />
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
            >
              {error}
            </div>
          )}

          {result && (
            <div
              className={`mt-4 rounded-lg p-3 ring-1 ring-inset ${
                result.isCorrect
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : 'bg-red-50 text-red-900 ring-red-200'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                {result.isCorrect ? (
                  <CheckIcon width={16} height={16} />
                ) : (
                  <CloseIcon width={16} height={16} />
                )}
                {result.isCorrect ? 'Correct' : 'Not quite'}
              </p>
              {result.explanation && (
                <p className="mt-1.5 text-sm opacity-90">{result.explanation}</p>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            {result ? (
              <Button type="button" onClick={onContinue}>
                Continue watching
              </Button>
            ) : (
              <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
                Submit answer
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
