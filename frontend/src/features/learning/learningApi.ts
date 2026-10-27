import { api } from '@/app/api';
import type { AssignedVideo, GradedAnswer, PlayerPayload, Progress, ProgressStatus } from '@/types';

export const learningApi = api.injectEndpoints({
  endpoints: (builder) => ({
    myAssignments: builder.query<
      {
        items: AssignedVideo[];
        summary: { total: number; completed: number; inProgress: number; notStarted: number };
      },
      { search?: string; status?: ProgressStatus | '' }
    >({
      query: (params) => {
        const clean = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
        );
        return { url: '/me/assignments', params: clean };
      },
      providesTags: ['MyAssignment'],
    }),

    getPlayerPayload: builder.query<PlayerPayload, string>({
      query: (videoId) => `/me/assignments/${videoId}`,
      providesTags: (_r, _e, videoId) => [{ type: 'MyAssignment', id: videoId }],
    }),

    /**
     * Playback autosave. Deliberately does NOT invalidate the player payload —
     * refetching it mid-playback would remount the <video> element and lose the
     * playhead. The list is refreshed when the learner navigates away instead.
     */
    saveProgress: builder.mutation<
      Progress,
      { videoId: string; positionSeconds: number; durationSeconds?: number }
    >({
      query: ({ videoId, ...body }) => ({
        url: `/me/assignments/${videoId}/progress`,
        method: 'PUT',
        body,
      }),
    }),

    submitAnswer: builder.mutation<
      { result: GradedAnswer; progress: Progress },
      {
        videoId: string;
        questionId: string;
        selectedOptionKeys?: string[];
        answerText?: string;
      }
    >({
      query: ({ videoId, questionId, ...body }) => ({
        url: `/me/assignments/${videoId}/questions/${questionId}/answer`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useMyAssignmentsQuery,
  useGetPlayerPayloadQuery,
  useSaveProgressMutation,
  useSubmitAnswerMutation,
} = learningApi;
