import React, { FormEvent, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, KeyRound, Mail, UserCheck, AlertCircle, ShieldCheck } from 'lucide-react';

function Login() {
  const { login, loginAsGuest, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/practice';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (isConfigured && !password.trim()) {
      setError('Password is required for Supabase Cloud Authentication.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected login error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    loginAsGuest();
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Terminal Header Card */}
        <div className="p-6 sm:p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-[var(--accent)] mx-auto shadow-sm">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Candidate Terminal Login
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Sign in to sync your exam drills, benchmark metrics, and Socratic chat history.
            </p>

            {/* Status indicator */}
            <div className="pt-2 flex justify-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                  isConfigured
                    ? 'border-[var(--positive)]/30 bg-[var(--positive)]/10 text-[var(--positive)]'
                    : 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{isConfigured ? 'Supabase Cloud Auth Active' : 'Offline / Local Database Mode'}</span>
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg border border-[var(--error)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--error)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@prepmind.ai"
                className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Password</span>
                </span>
                {!isConfigured && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono lowercase">
                    (optional in local mode)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isConfigured ? '••••••••' : 'Password (optional in local mode)'}
                className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]"
              />
              <div className="flex justify-end pt-0.5">
                <Link
                  to="/reset-password"
                  className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-2 min-h-[40px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border)]"></div>
            <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-[var(--text-muted)]">or</span>
            <div className="flex-grow border-t border-[var(--border)]"></div>
          </div>

          {/* 1-Click Guest Access */}
          <button
            type="button"
            onClick={handleGuestAccess}
            className="w-full py-2.5 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[40px]"
          >
            <UserCheck className="w-4 h-4 text-[var(--positive)]" />
            <span>Continue as Guest (Instant Access)</span>
          </button>

          <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[var(--accent)] hover:underline font-semibold font-mono">
              Create Candidate Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
