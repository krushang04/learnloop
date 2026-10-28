import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useMeQuery } from '@/features/auth/authApi';
import { restoreFinished, sessionRestored } from '@/features/auth/authSlice';

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
      dispatch(restoreFinished());
    }
  }, [isSuccess, isError, data, dispatch]);

  useEffect(() => {
    if (!token && isRestoring) dispatch(restoreFinished());
  }, [token, isRestoring, dispatch]);

  return <>{children}</>;
}
