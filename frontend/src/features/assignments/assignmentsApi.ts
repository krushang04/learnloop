import { api } from '@/app/api';
import type { Assignment, LearnerSummary, PaginationMeta } from '@/types';

export const assignmentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listLearners: builder.query<
      { items: LearnerSummary[]; meta: PaginationMeta },
      { search?: string; limit?: number }
    >({
      query: ({ search, limit = 100 }) => ({
        url: '/users/learners',
        params: search ? { search, limit } : { limit },
      }),
      providesTags: ['Learner'],
    }),

    listAssignments: builder.query<Assignment[], string>({
      query: (videoId) => `/videos/${videoId}/assignments`,
      providesTags: (_r, _e, videoId) => [{ type: 'Assignment', id: videoId }],
    }),

    assignVideo: builder.mutation<
      { requested: number; newlyAssigned: number; alreadyAssigned: number },
      { videoId: string; learnerIds: string[] }
    >({
      query: ({ videoId, learnerIds }) => ({
        url: `/videos/${videoId}/assignments`,
        method: 'POST',
        body: { learnerIds },
      }),
      invalidatesTags: (_r, _e, { videoId }) => [
        { type: 'Assignment', id: videoId },
        'Report',
      ],
    }),

    unassignVideo: builder.mutation<void, { videoId: string; learnerId: string }>({
      query: ({ videoId, learnerId }) => ({
        url: `/videos/${videoId}/assignments/${learnerId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { videoId }) => [
        { type: 'Assignment', id: videoId },
        'Report',
      ],
    }),
  }),
});

export const {
  useListLearnersQuery,
  useListAssignmentsQuery,
  useAssignVideoMutation,
  useUnassignVideoMutation,
} = assignmentsApi;
