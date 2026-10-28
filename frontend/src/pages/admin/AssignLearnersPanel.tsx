import { useMemo, useState } from 'react';
import {
  useAssignVideoMutation,
  useListAssignmentsQuery,
  useListLearnersQuery,
  useUnassignVideoMutation,
} from '@/features/assignments/assignmentsApi';
import { useAppDispatch } from '@/app/hooks';
import { toastShown } from '@/features/ui/toastSlice';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { UsersIcon, PlusIcon, CloseIcon } from '@/components/Icons';
import { getErrorMessage } from '@/lib/baseQuery';
import { formatDate } from '@/lib/format';

export function AssignLearnersPanel({ videoId }: { videoId: string }) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const dispatch = useAppDispatch();
  const assignments = useListAssignmentsQuery(videoId);
  const learners = useListLearnersQuery({}, { skip: !isPickerOpen });
  const [assignVideo, assignState] = useAssignVideoMutation();
  const [unassignVideo] = useUnassignVideoMutation();

  const assignedIds = useMemo(
    () => new Set((assignments.data ?? []).map((a) => a.learnerId?._id).filter(Boolean)),
    [assignments.data],
  );

  const availableLearners = useMemo(() => {
    const all = learners.data?.items ?? [];
    const term = search.trim().toLowerCase();
    return all.filter(
      (learner) =>
        !term ||
        learner.name.toLowerCase().includes(term) ||
        learner.email.toLowerCase().includes(term),
    );
  }, [learners.data, search]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selected.size) return;

    try {
      const result = await assignVideo({
        videoId,
        learnerIds: [...selected],
      }).unwrap();

      dispatch(
        toastShown(
          result.alreadyAssigned
            ? `Assigned to ${result.newlyAssigned} learner(s). ${result.alreadyAssigned} already had it.`
            : `Assigned to ${result.newlyAssigned} learner(s).`,
        ),
      );
      setSelected(new Set());
      setPickerOpen(false);
    } catch (error) {
      dispatch(toastShown(getErrorMessage(error, 'Could not assign the video.'), 'error'));
    }
  };

  const handleUnassign = async (learnerId: string, name: string) => {
    try {
      await unassignVideo({ videoId, learnerId }).unwrap();
      dispatch(toastShown(`Removed ${name} from this video.`));
    } catch (error) {
      dispatch(toastShown(getErrorMessage(error, 'Could not remove the learner.'), 'error'));
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {assignments.data?.length ?? 0} learner
          {assignments.data?.length === 1 ? '' : 's'} assigned
        </p>
        <Button
          size="sm"
          onClick={() => setPickerOpen(true)}
          leftIcon={<PlusIcon width={15} height={15} />}
        >
          Assign learners
        </Button>
      </div>

      {assignments.isLoading ? (
        <LoadingState label="Loading assignments…" />
      ) : assignments.isError ? (
        <ErrorState
          message={getErrorMessage(assignments.error)}
          onRetry={assignments.refetch}
        />
      ) : !assignments.data?.length ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No learners assigned"
          message="Assign this video so it appears in a learner's list. Only published videos are visible to them."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {assignments.data.map((assignment) => (
            <li key={assignment._id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {assignment.learnerId?.name
                  ?.split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {assignment.learnerId?.name}
                </p>
                <p className="truncate text-xs text-slate-500">{assignment.learnerId?.email}</p>
              </div>
              <span className="hidden text-xs text-slate-400 sm:block">
                {formatDate(assignment.createdAt)}
              </span>
              <button
                onClick={() =>
                  handleUnassign(assignment.learnerId._id, assignment.learnerId.name)
                }
                aria-label={`Unassign ${assignment.learnerId?.name}`}
                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <CloseIcon width={15} height={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Assign learners"
        description="Learners who already have this video are shown as assigned."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              isLoading={assignState.isLoading}
              disabled={!selected.size}
            >
              Assign {selected.size > 0 && `(${selected.size})`}
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search learners…"
          className="mb-3"
        />

        {learners.isLoading ? (
          <LoadingState label="Loading learners…" />
        ) : learners.isError ? (
          <ErrorState message={getErrorMessage(learners.error)} onRetry={learners.refetch} />
        ) : !availableLearners.length ? (
          <EmptyState
            icon={<UsersIcon />}
            title={search ? 'No learners match' : 'No learners yet'}
            message={
              search
                ? 'Try a different name or email.'
                : 'Learners appear here once they sign up.'
            }
          />
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {availableLearners.map((learner) => {
              const isAssigned = assignedIds.has(learner._id);
              const isChecked = selected.has(learner._id);

              return (
                <li key={learner._id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isAssigned ? 'cursor-default opacity-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAssigned}
                      onChange={() => toggle(learner._id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{learner.name}</p>
                      <p className="truncate text-xs text-slate-500">{learner.email}</p>
                    </div>
                    {isAssigned && (
                      <span className="shrink-0 text-xs text-slate-400">Assigned</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
