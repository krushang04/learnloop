import { api } from '@/app/api';
import type { PaginationMeta, Video, VideoDetail, VideoStatus } from '@/types';

export interface VideoListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VideoStatus | '';
  tag?: string;
}

export interface VideoPayload {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  durationSeconds?: number;
  tags?: string[];
}

export const videosApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listVideos: builder.query<{ items: Video[]; meta: PaginationMeta }, VideoListParams>({
      query: (params) => {
        // Empty strings would become `?status=` and fail the enum validator.
        const clean = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
        );
        return { url: '/videos', params: clean };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((v) => ({ type: 'Video' as const, id: v._id })),
              { type: 'Video' as const, id: 'LIST' },
            ]
          : [{ type: 'Video' as const, id: 'LIST' }],
    }),

    getVideo: builder.query<VideoDetail, string>({
      query: (id) => `/videos/${id}`,
      providesTags: (_r, _e, id) => [
        { type: 'Video', id },
        { type: 'Question', id },
      ],
    }),

    createVideo: builder.mutation<Video, VideoPayload>({
      query: (body) => ({ url: '/videos', method: 'POST', body }),
      invalidatesTags: [{ type: 'Video', id: 'LIST' }, 'Report'],
    }),

    updateVideo: builder.mutation<Video, { id: string; body: Partial<VideoPayload> }>({
      query: ({ id, body }) => ({ url: `/videos/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Video', id }, { type: 'Video', id: 'LIST' }],
    }),

    setVideoStatus: builder.mutation<Video, { id: string; publish: boolean }>({
      query: ({ id, publish }) => ({
        url: `/videos/${id}/${publish ? 'publish' : 'unpublish'}`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Video', id },
        { type: 'Video', id: 'LIST' },
        'Report',
      ],
    }),

    deleteVideo: builder.mutation<void, string>({
      query: (id) => ({ url: `/videos/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Video', id: 'LIST' }, 'Report'],
    }),
  }),
});

export const {
  useListVideosQuery,
  useGetVideoQuery,
  useCreateVideoMutation,
  useUpdateVideoMutation,
  useSetVideoStatusMutation,
  useDeleteVideoMutation,
} = videosApi;
