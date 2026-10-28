import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SessionGate } from '@/components/SessionGate';
import { Toaster } from '@/components/ui/Toaster';
import { AppLayout, type NavItem } from '@/layouts/AppLayout';
import { DashboardIcon, LibraryIcon, ReportIcon, VideoIcon } from '@/components/Icons';
import { LoginPage } from '@/pages/LoginPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { VideoListPage } from '@/pages/admin/VideoListPage';
import { VideoFormPage } from '@/pages/admin/VideoFormPage';
import { VideoDetailPage } from '@/pages/admin/VideoDetailPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { VideoReportPage } from '@/pages/admin/VideoReportPage';
import { MyVideosPage } from '@/pages/learner/MyVideosPage';
import { VideoPlayerPage } from '@/pages/learner/VideoPlayerPage';

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <DashboardIcon width={18} height={18} />, end: true },
  { to: '/admin/videos', label: 'Videos', icon: <VideoIcon width={18} height={18} /> },
  { to: '/admin/reports', label: 'Reports', icon: <ReportIcon width={18} height={18} /> },
];

const LEARNER_NAV: NavItem[] = [
  { to: '/learn', label: 'My learning', icon: <LibraryIcon width={18} height={18} />, end: true },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout navItems={ADMIN_NAV} roleLabel="Admin">
      {children}
    </AppLayout>
  );
}

function LearnerShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout navItems={LEARNER_NAV} roleLabel="Learner">
      {children}
    </AppLayout>
  );
}

/** Sends a signed-in user to their own home, and everyone else to login. */
function RootRedirect() {
  const { token, user } = useAppSelector((state) => state.auth);
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/learn'} replace />;
}

export default function App() {
  return (
    <BrowserRouter
      // Opt in to the v7 behaviours now, so the console stays clean and the
      // upgrade is a version bump rather than a behaviour change.
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <SessionGate>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allow="admin" />}>
            <Route
              path="/admin"
              element={
                <AdminShell>
                  <AdminDashboard />
                </AdminShell>
              }
            />
            <Route
              path="/admin/videos"
              element={
                <AdminShell>
                  <VideoListPage />
                </AdminShell>
              }
            />
            <Route
              path="/admin/videos/new"
              element={
                <AdminShell>
                  <VideoFormPage />
                </AdminShell>
              }
            />
            <Route
              path="/admin/videos/:videoId"
              element={
                <AdminShell>
                  <VideoDetailPage />
                </AdminShell>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminShell>
                  <ReportsPage />
                </AdminShell>
              }
            />
            <Route
              path="/admin/reports/:videoId"
              element={
                <AdminShell>
                  <VideoReportPage />
                </AdminShell>
              }
            />
          </Route>

          <Route element={<ProtectedRoute allow="learner" />}>
            <Route
              path="/learn"
              element={
                <LearnerShell>
                  <MyVideosPage />
                </LearnerShell>
              }
            />
            <Route
              path="/learn/:videoId"
              element={
                <LearnerShell>
                  <VideoPlayerPage />
                </LearnerShell>
              }
            />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SessionGate>

      <Toaster />
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-slate-200">404</p>
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">That page does not exist or has moved.</p>
      <a href="/" className="mt-2 text-sm font-medium text-brand-600 hover:underline">
        Go back home
      </a>
    </div>
  );
}
