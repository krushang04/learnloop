import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLoginMutation, useRegisterMutation } from '@/features/auth/authApi';
import { credentialsReceived, expiredMessageCleared } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/baseQuery';

type Mode = 'login' | 'register';

/** Shown as one-click fills so a reviewer never has to type a password. */
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@learnloop.dev', password: 'Admin@123' },
  { label: 'Learner', email: 'asha@learnloop.dev', password: 'Learner@123' },
];

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, expiredMessage } = useAppSelector((state) => state.auth);

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const isSubmitting = loginState.isLoading || registerState.isLoading;

  // Clear the "session expired" notice as soon as the user starts over.
  useEffect(() => {
    return () => {
      if (expiredMessage) dispatch(expiredMessageCleared());
    };
  }, [expiredMessage, dispatch]);

  if (token && user) {
    const from = (location.state as { from?: string } | null)?.from;
    const home = user.role === 'admin' ? '/admin' : '/learn';
    return <Navigate to={from && from !== '/login' ? from : home} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    try {
      const result =
        mode === 'login'
          ? await login({ email, password }).unwrap()
          : await register({ name, email, password }).unwrap();

      dispatch(credentialsReceived(result));
      navigate(result.user.role === 'admin' ? '/admin' : '/learn', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setMode('login');
    setEmail(account.email);
    setPassword(account.password);
    setFormError(null);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            L
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">LearnLoop</h1>
          <p className="mt-1 text-sm text-slate-500">
            Video learning with questions that appear as you watch
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
            {(['login', 'register'] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setFormError(null);
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {value === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {expiredMessage && (
            <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
              {expiredMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Asha Menon"
                autoComplete="name"
                required
                minLength={2}
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              hint={
                mode === 'register'
                  ? 'At least 8 characters, including a letter and a number.'
                  : undefined
              }
            />

            {formError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
              >
                {formError}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                Demo accounts
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="block text-sm font-medium text-slate-900">
                      {account.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          New accounts are created as learners. Admin access comes from the seeded account.
        </p>
      </div>
    </div>
  );
}
