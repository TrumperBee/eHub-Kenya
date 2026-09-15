import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, Shield, Zap, Lock, MessageCircle, AlertTriangle } from 'lucide-react';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../services/firebase';
import PasswordInput from '../../components/common/PasswordInput';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setResetting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      navigate('/reset-password', { replace: true });
      setDone(true);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new one.');
      } else if (code === 'auth/invalid-action-code') {
        setError('This reset link is invalid or has already been used. Please request a new one.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact support.');
      } else if (code === 'auth/weak-password') {
        setError('New password is too weak. Use at least 8 characters.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please request a new link and try again.');
      }
    } finally {
      setResetting(false);
    }
  };

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #003BFF, #001E7A)' }}>
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <h1 className="font-heading text-xl font-extrabold" style={{ color: '#111111' }}>
            INVALID RESET LINK
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              to="/forgot-password"
              className="flex-1 py-3 rounded-xl bg-konami-blue text-white font-heading font-bold uppercase tracking-wide text-sm hover:bg-konami-blue-hover transition-all"
            >
              Request New Link
            </Link>
            <Link
              to="/login"
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid #E0E0E0', color: '#6B7280' }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative md:w-1/2 min-h-[40vh] md:min-h-screen flex items-center justify-center p-8 md:p-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1920&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#003BFF]/90 to-[#001E7A]/95" />
        <div className="relative z-10 text-center md:text-left max-w-md">
          <img src="/logo.png" alt="eFootball Hub Kenya" className="h-16 w-auto mb-4 mx-auto md:mx-0" />
          <p className="text-white/80 text-sm mb-8">Choose a strong, unique password and keep your account secure.</p>
          <div className="space-y-4">
            {[
              { icon: <Lock size={18} />, text: 'Secure Paystack payments' },
              { icon: <Zap size={18} />, text: 'Instant account delivery' },
              { icon: <Shield size={18} />, text: 'Escrow protection on every order' },
              { icon: <MessageCircle size={18} />, text: 'Real-time chat with sellers' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90 text-sm">
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white min-h-screen">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="eFootball Hub Kenya" className="h-10 w-auto mb-2 mx-auto md:hidden" />
            <h1 className="font-heading text-2xl font-extrabold text-konami-text">Set New Password</h1>
            <p className="text-konami-text-muted text-sm mt-1">Create a new password for your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 space-y-2">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} /> Password updated
                </p>
                <p>Your password has been reset. You can now sign in with your new password.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl bg-konami-blue text-white font-heading font-bold uppercase tracking-wide text-sm hover:bg-konami-blue-hover transition-all"
              >
                Continue to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  autoFocus
                />
                {password && password.length < 8 && (
                  <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                    At least 8 characters required
                  </p>
                )}
              </div>
              <div>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={resetting || !password || !confirmPassword}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <KeyRound size={18} />
                )}
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
              <p className="text-center text-xs text-konami-text-muted">
                Remember your password?{' '}
                <Link to="/login" className="text-konami-blue hover:text-konami-blue-hover font-semibold transition-colors">
                  Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}