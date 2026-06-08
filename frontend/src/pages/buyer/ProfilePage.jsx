import { useState, useEffect } from 'react';
import { User, Save, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { currentUser, userProfile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim(), phoneNumber: phoneNumber.trim() || null });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User size={24} className="text-konami-blue" />
          <h1 className="font-heading text-3xl font-extrabold text-konami-text">My Profile</h1>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 pb-6 border-b border-konami-mid-gray mb-6">
            <div className="w-16 h-16 rounded-full bg-konami-blue flex items-center justify-center text-white text-xl font-bold font-heading">
              {(userProfile?.displayName || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-konami-text">{userProfile?.displayName || 'User'}</h2>
              <p className="text-sm text-konami-text-muted">{currentUser?.email}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Email</label>
              <div className="flex items-center gap-2 input-field opacity-60 cursor-not-allowed">
                <Mail size={16} className="text-konami-text-muted" />
                <span className="text-konami-text">{currentUser?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Phone Number (Safaricom)</label>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
              />
              <p className="text-xs text-konami-text-muted mt-1">Used for M-Pesa payments</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-konami-text mb-4">Account Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-konami-text-muted">Account type</span>
              <span className="text-konami-text capitalize">{userProfile?.role || 'Buyer'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-konami-text-muted">Seller status</span>
              <span className={userProfile?.sellerApproved ? 'text-green-500' : 'text-konami-text-muted'}>
                {userProfile?.sellerApproved ? 'Approved' : 'Not a seller'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-konami-text-muted">Member since</span>
              <span className="text-konami-text">{userProfile?.createdAt ? formatDate(userProfile.createdAt) : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
