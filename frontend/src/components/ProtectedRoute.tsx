import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { LoadingState } from '@/components/ui/States';
import type { UserRole } from '@/types';

export function ProtectedRoute({ allow }: { allow: UserRole }) {
  const { token, user, isRestoring } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== allow) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/learn'} replace />;
  }

  return <Outlet />;
}
