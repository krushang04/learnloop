import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RootState } from '@/app/store';
import { sessionExpired } from '@/features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    if (result.error.status === 401) {
      const state = api.getState() as RootState;
      if (state.auth.token) api.dispatch(sessionExpired());
    }
    return result;
  }

  const envelope = result.data as { data?: unknown; meta?: unknown } | undefined;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.meta !== undefined
      ? { data: { items: envelope.data, meta: envelope.meta } }
      : { data: envelope.data };
  }

  return result;
};

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;

  const maybe = error as FetchBaseQueryError;
  if (typeof maybe === 'object' && 'status' in maybe) {
    if (maybe.status === 'FETCH_ERROR') {
      return 'Cannot reach the server. Check that the API is running.';
    }
    const body = maybe.data as ApiError | undefined;
    if (body?.errors) {
      const details = Object.values(body.errors).flat();
      if (details.length) return details.join('. ');
    }
    if (body?.message) return body.message;
  }
  return fallback;
}
