import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Zap, Shield, MessageCircle, ArrowLeft } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      const resetUrl = `${window.location.origin}/reset-password`;
      await sendPasswordResetEmail(auth, trimmed, {
        url: resetUrl,
        handleCodeInApp: true,
      });
      setSent(true);
      setEmail(trimmed);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/unauthorized-continue-uri') {
        setError('Password reset is not configured for this domain yet. Contact support.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

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
          <p className="text-white/80 text-sm mb-8">We will never share your email. Reset links expire quickly for your security.</p>
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
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-konami-text-muted hover:text-konami-text transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>

          <div className="text-center mb-8">
            <img src="/logo.png" alt="eFootball Hub Kenya" className="h-10 w-auto mb-2 mx-auto md:hidden" />
            <h1 className="font-heading text-2xl font-extrabold text-konami-text">Forgot Password?</h1>
            <p className="text-konami-text-muted text-sm mt-1">
              Enter your email and we will send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 space-y-2">
                <p className="flex items-center gap-2 font-semibold">
                  <Mail size={16} /> Reset link sent
                </p>
                <p>
                  If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                  Check your inbox and spam folder, then click the link to choose a new password.
                </p>
                <p className="text-green-700/80 text-xs">
                  The link expires after a short time. If it expires, request a new one.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setError(''); }}
                className="w-full text-center text-sm text-konami-blue hover:text-konami-blue-hover font-semibold transition-colors"
              >
                Send another link
              </button>
              <Link
                to="/login"
                className="block w-full text-center py-3 rounded-xl bg-konami-blue text-white font-heading font-bold uppercase tracking-wide text-sm hover:bg-konami-blue-hover transition-all"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-konami-text-muted" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {sending ? 'Sending...' : 'Send Reset Link'}
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