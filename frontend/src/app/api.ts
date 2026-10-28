import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from '@/lib/baseQuery';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Me', 'Video', 'Question', 'Assignment', 'Learner', 'MyAssignment', 'Report'],

  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
