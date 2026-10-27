import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from '@/lib/baseQuery';

/**
 * One API slice for the whole app. Features inject their own endpoints into it
 * (see `*Api.ts` files), which keeps the cache and the tag graph unified while
 * letting each feature own its queries.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Me', 'Video', 'Question', 'Assignment', 'Learner', 'MyAssignment', 'Report'],
  // Progress and reports change as learners watch; refetching on focus keeps an
  // admin's dashboard honest without a manual reload.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
