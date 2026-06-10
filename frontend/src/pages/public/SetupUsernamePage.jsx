import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateUsernameFormat, checkUsername, generateSuggestions } from '../../utils/usernameUtils';
import { updateUserDocument } from '../../services/authService';

export default function SetupUsernamePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
    setUsernameTaken(false);
    setUsernameAvailable(null);
    setError('');

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

  const canSubmit = username.length >= 3 && !usernameError && !usernameChecking && !usernameTaken;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !currentUser) return;
    setSaving(true);
    setError('');
    try {
      await updateUserDocument(currentUser.uid, { username: username.toLowerCase() });
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Failed to save username. Try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #003BFF, #001E7A)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="eFootball Hub Kenya" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-extrabold" style={{ color: '#111111' }}>ONE LAST STEP</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Choose your username. This is how the community will know you.
          </p>
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
              placeholder="Username (e.g. victork254)"
              value={username}
              onChange={handleUsernameChange}
              className={`input-field ${usernameError || usernameTaken ? '!border-red-500' : ''} ${usernameAvailable ? '!border-green-500' : ''}`}
              autoComplete="off"
              autoFocus
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
                <span className="text-xs" style={{ color: '#10B981' }}>{username} is available</span>
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
                      <strong>@{username}</strong> is already in use.
                      Try one of these instead:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {generateSuggestions(username).map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setUsername(suggestion);
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

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="w-full font-heading font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            style={{
              background: canSubmit && !saving ? '#FFF100' : '#E5E7EB',
              color: canSubmit && !saving ? '#003BFF' : '#9CA3AF',
            }}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#003BFF]/30 border-t-[#003BFF] rounded-full animate-spin" />
            ) : null}
            {saving ? 'Saving...' : 'Continue \u2192'}
          </button>
        </form>
      </div>
    </div>
  );
}
