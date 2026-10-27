import { api } from '@/app/api';
import type { LearnerResponseReport, ReportOverview, VideoReport } from '@/types';

export const reportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query<ReportOverview, void>({
      query: () => '/reports/overview',
      providesTags: ['Report'],
    }),

    getVideoReport: builder.query<VideoReport, string>({
      query: (videoId) => `/reports/videos/${videoId}`,
      providesTags: ['Report'],
    }),

    getLearnerReport: builder.query<
      LearnerResponseReport,
      { videoId: string; learnerId: string }
    >({
      query: ({ videoId, learnerId }) => `/reports/videos/${videoId}/learners/${learnerId}`,
      providesTags: ['Report'],
    }),
  }),
});

export const { useGetOverviewQuery, useGetVideoReportQuery, useGetLearnerReportQuery } = reportsApi;
