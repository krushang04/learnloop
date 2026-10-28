import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

const TOKEN_KEY = 'learnloop.token';
const USER_KEY = 'learnloop.user';

export interface AuthState {
  token: string | null;
  user: User | null;

  isRestoring: boolean;

  expiredMessage: string | null;
}

function readStoredSession(): Pick<AuthState, 'token' | 'user'> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    return { token, user: rawUser ? (JSON.parse(rawUser) as User) : null };
  } catch {
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
    return;
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
