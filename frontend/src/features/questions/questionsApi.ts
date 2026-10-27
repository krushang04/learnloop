import { api } from '@/app/api';
import type { Question, QuestionType } from '@/types';

export interface QuestionPayload {
  timestampSeconds: number;
  type: QuestionType;
  prompt: string;
  options?: { key: string; text: string }[];
  correctOptionKeys?: string[];
  acceptedAnswers?: string[];
  points?: number;
  explanation?: string;
}

export const questionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listQuestions: builder.query<Question[], string>({
      query: (videoId) => `/videos/${videoId}/questions`,
      providesTags: (_r, _e, videoId) => [{ type: 'Question', id: videoId }],
    }),

    createQuestion: builder.mutation<Question, { videoId: string; body: QuestionPayload }>({
      query: ({ videoId, body }) => ({
        url: `/videos/${videoId}/questions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { videoId }) => [
        { type: 'Question', id: videoId },
        { type: 'Video', id: videoId },
        { type: 'Video', id: 'LIST' },
      ],
    }),

    updateQuestion: builder.mutation<
      Question,
      { id: string; videoId: string; body: Partial<QuestionPayload> }
    >({
      query: ({ id, body }) => ({ url: `/questions/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { videoId }) => [
        { type: 'Question', id: videoId },
        { type: 'Video', id: videoId },
      ],
    }),

    deleteQuestion: builder.mutation<void, { id: string; videoId: string }>({
      query: ({ id }) => ({ url: `/questions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { videoId }) => [
        { type: 'Question', id: videoId },
        { type: 'Video', id: videoId },
        { type: 'Video', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} = questionsApi;
