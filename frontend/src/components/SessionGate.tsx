import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useMeQuery } from '@/features/auth/authApi';
import { restoreFinished, sessionRestored } from '@/features/auth/authSlice';

/**
 * Verifies a token restored from localStorage against the API once on mount.
 * Until this resolves, ProtectedRoute holds the UI, so a stale or revoked
 * token never renders a half-authenticated screen.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, isRestoring } = useAppSelector((state) => state.auth);

  const { data, isError, isSuccess } = useMeQuery(undefined, {
    skip: !token || !isRestoring,
  });

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(sessionRestored(data));
    } else if (isError) {
      // A 401 already triggered sessionExpired in the base query; any other
      // failure (server down) just ends the restore so the app can render.
      dispatch(restoreFinished());
    }
  }, [isSuccess, isError, data, dispatch]);

  useEffect(() => {
    if (!token && isRestoring) dispatch(restoreFinished());
  }, [token, isRestoring, dispatch]);

  return <>{children}</>;
}
