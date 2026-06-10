import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Zap, Shield, MessageCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateUsernameFormat, isUsernameTaken, generateSuggestions, checkUsername } from '../../utils/usernameUtils';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const debounceRef = useRef(null);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm(prev => ({ ...prev, username: value }));
    setUsernameTaken(false);
    setUsernameAvailable(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameError(formatError);
      setUsernameChecking(false);
      return;
    }
    setUsernameError(null);

    if (!value) {
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    debounceRef.current = setTimeout(async () => {
      const result = await checkUsername(value);
      setUsernameChecking(false);
      if (result.valid) {
        setUsernameAvailable(value);
        setUsernameTaken(false);
      } else if (result.error === 'taken') {
        setUsernameTaken(value);
        setUsernameAvailable(null);
      } else {
        setUsernameError(result.error);
      }
    }, 600);
  };

  const validate = () => {
    if (!form.displayName || !form.username || !form.email || !form.password || !form.confirmPassword) {
      return 'Please fill in all fields';
    }
    if (form.displayName.length < 2) return 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email address';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (usernameError) return usernameError;
    if (usernameChecking) return 'Please wait, checking username availability...';
    if (usernameTaken) return 'Username is already taken';
    return null;
  };

  const canSubmit = form.displayName && form.username && form.email && form.password && form.confirmPassword
    && !usernameError && !usernameChecking && !usernameTaken && form.username.length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      const validationError = validate();
      if (validationError) { setError(validationError); return; }
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName, form.username);
      navigate('/account');
    } catch (err) {
      const code = err.code || '';
      const msg = err.message.replace('Firebase: ', '').trim();
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in instead.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/password sign-in is not enabled. Check Firebase Console.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters including a number or symbol.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError(msg || 'Registration failed. Check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result?.isNew) {
        navigate('/setup-username');
      } else {
        navigate('/account');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim() || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          <p className="text-white/80 text-sm mb-8">Join the #1 marketplace for verified eFootball accounts in Kenya.</p>
          <div className="space-y-4">
            {[
              { icon: <Lock size={18} />, text: 'Secure M-Pesa payments' },
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
            <h1 className="font-heading text-2xl font-extrabold" style={{ color: '#111111' }}>Create Account</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Start buying and selling today</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Full name"
                value={form.displayName}
                onChange={update('displayName')}
                className="input-field"
                autoComplete="name"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Username (e.g. victork254)"
                value={form.username}
                onChange={handleUsernameChange}
                className={`input-field ${usernameError || usernameTaken ? '!border-red-500' : ''} ${usernameAvailable ? '!border-green-500' : ''}`}
                autoComplete="off"
              />
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                Only lowercase letters, numbers, and underscores. No spaces.
              </p>

              {usernameChecking && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 size={14} className="animate-spin" style={{ color: '#003BFF' }} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>Checking availability...</span>
                </div>
              )}

              {usernameError && !usernameChecking && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{usernameError}</p>
              )}

              {usernameAvailable && (
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle size={14} style={{ color: '#10B981' }} />
                  <span className="text-xs" style={{ color: '#10B981' }}>{form.username} is available</span>
                </div>
              )}

              {usernameTaken && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in-up">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <X size={16} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-red-700 text-sm uppercase tracking-wide">
                        Username Taken
                      </p>
                      <p className="text-red-600 text-sm mt-1">
                        <strong>@{form.username}</strong> is already in use.
                        Try one of these instead:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {generateSuggestions(form.username).map(suggestion => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, username: suggestion }));
                              setUsernameTaken(false);
                              setUsernameChecking(true);
                              setTimeout(async () => {
                                const result = await checkUsername(suggestion);
                                setUsernameChecking(false);
                                if (result.valid) {
                                  setUsernameAvailable(suggestion);
                                  setUsernameTaken(false);
                                } else if (result.error === 'taken') {
                                  setUsernameTaken(suggestion);
                                  setUsernameAvailable(null);
                                } else {
                                  setUsernameError(result.error);
                                }
                              }, 100);
                            }}
                            className="px-3 py-1 bg-white border border-[#003BFF] rounded-full text-[#003BFF] text-xs font-heading font-bold hover:bg-[#003BFF] hover:text-white transition-colors"
                          >
                            @{suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={update('email')}
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={form.password}
                onChange={update('password')}
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2" style={{ color: '#6B7280' }}>or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: '#111111' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <p className="mt-6 text-center text-sm" style={{ color: '#6B7280' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#003BFF' }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
