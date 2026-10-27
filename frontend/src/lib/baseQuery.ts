import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RootState } from '@/app/store';
import { sessionExpired } from '@/features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/** The error shape the API's exception filter returns. */
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

/**
 * Unwraps the API's `{ success, data, meta }` envelope so components receive
 * the payload directly, and turns a 401 into a single global logout instead of
 * every screen having to handle an expired token on its own.
 */
export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    // 401 means the token is gone or expired. Anything else (403, 404, 422)
    // is a legitimate response the screen should render.
    if (result.error.status === 401) {
      const state = api.getState() as RootState;
      if (state.auth.token) api.dispatch(sessionExpired());
    }
    return result;
  }

  const envelope = result.data as { data?: unknown; meta?: unknown } | undefined;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    // Pagination meta is preserved by nesting it next to the items, since
    // RTK Query only passes the single `data` value through to the hook.
    return envelope.meta !== undefined
      ? { data: { items: envelope.data, meta: envelope.meta } }
      : { data: envelope.data };
  }

  return result;
};

/** Pulls a human-readable message out of whatever RTK Query handed back. */
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
