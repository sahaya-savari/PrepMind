import React, { FormEvent, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

function ResetPassword() {
  const { resetPassword, updatePassword, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Check if URL contains recovery token, code, or hash from Supabase email link
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (
      (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) ||
      (search && (search.includes('code=') || search.includes('type=recovery')))
    ) {
      setIsRecoveryMode(true);
    }

    if (supabase?.auth?.onAuthStateChange) {
      const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
      });
      return () => {
        sub?.subscription?.unsubscribe?.();
      };
    }
  }, []);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your account email address.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await resetPassword(email.trim());
      if (res.success) {
        setSuccess('Password recovery email dispatched. Please check your inbox for instructions.');
      } else {
        setError(res.error || 'Failed to dispatch recovery email. Please check your email address.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected recovery error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Password update error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="p-6 sm:p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-[var(--accent)] mx-auto shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {isRecoveryMode ? 'Set New Password' : 'Reset Account Password'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {isRecoveryMode
                ? 'Enter your new secure password below to regain full terminal access.'
                : 'Enter your registered email address and we will dispatch a password recovery link.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg border border-[var(--error)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--error)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-lg border border-[var(--positive)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--positive)] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {!isRecoveryMode ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Account Email</span>
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Dispatching Link...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Confirm New Password</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidate Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
