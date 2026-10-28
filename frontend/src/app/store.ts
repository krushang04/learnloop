import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import authReducer from '@/features/auth/authSlice';
import playerReducer from '@/features/learning/playerSlice';
import toastReducer from '@/features/ui/toastSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,

    auth: authReducer,
    player: playerReducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
