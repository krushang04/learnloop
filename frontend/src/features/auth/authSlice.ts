import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

const TOKEN_KEY = 'learnloop.token';
const USER_KEY = 'learnloop.user';

export interface AuthState {
  token: string | null;
  user: User | null;
  /** True until the stored session has been re-verified against the API. */
  isRestoring: boolean;
  /** Set when a 401 ends the session, so the login screen can explain why. */
  expiredMessage: string | null;
}

/**
 * Seeds state from localStorage so a refresh does not flash the login screen.
 * The token is still re-verified by an `auth/me` call on mount — this is only
 * an optimistic starting point.
 */
function readStoredSession(): Pick<AuthState, 'token' | 'user'> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    return { token, user: rawUser ? (JSON.parse(rawUser) as User) : null };
  } catch {
    // Private browsing or disabled storage: fall back to a logged-out session.
    return { token: null, user: null };
  }
}

const stored = readStoredSession();

const initialState: AuthState = {
  token: stored.token,
  user: stored.user,
  isRestoring: Boolean(stored.token),
  expiredMessage: null,
};

function persist(token: string | null, user: User | null) {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Storage unavailable — the session still works for this tab.
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<{ accessToken: string; user: User }>) {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      state.isRestoring = false;
      state.expiredMessage = null;
      persist(action.payload.accessToken, action.payload.user);
    },

    /** Session verified on mount — refreshes the cached user record. */
    sessionRestored(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isRestoring = false;
      persist(state.token, action.payload);
    },

    sessionExpired(state) {
      state.token = null;
      state.user = null;
      state.isRestoring = false;
      state.expiredMessage = 'Your session has expired. Please sign in again.';
      persist(null, null);
    },

    loggedOut(state) {
      state.token = null;
      state.user = null;
      state.isRestoring = false;
      state.expiredMessage = null;
      persist(null, null);
    },

    restoreFinished(state) {
      state.isRestoring = false;
    },

    expiredMessageCleared(state) {
      state.expiredMessage = null;
    },
  },
});

export const {
  credentialsReceived,
  sessionRestored,
  sessionExpired,
  loggedOut,
  restoreFinished,
  expiredMessageCleared,
} = authSlice.actions;

export default authSlice.reducer;
