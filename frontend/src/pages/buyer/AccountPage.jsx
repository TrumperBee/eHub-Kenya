import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, collection, query, where, orderBy, limit, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { auth } from '../../services/firebase';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { updateUserDocument } from '../../services/authService';
import { validateUsernameFormat, isUsernameTaken, generateSuggestions, checkUsername } from '../../utils/usernameUtils';
import { formatDate, formatKES } from '../../utils/formatters';
import { ORDER_STATUS } from '../../utils/constants';
import toast from 'react-hot-toast';
import {
  User, Lock, Bell, ShoppingBag, Settings, LogOut, Camera, CheckCircle,
  Store, Calendar, Clock, AlertTriangle, X, Loader2, HelpCircle, MessageCircle,
  ChevronRight, Eye, Shield, Check, UserCheck, Package, Star, Save,
} from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'purchases', label: 'Purchase History', icon: ShoppingBag },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'signout', label: 'Sign Out', icon: LogOut },
];

const DEFAULT_NOTIF_PREFS = {
  orderUpdates: true,
  newMessages: true,
  paymentUpdates: true,
  sellerApprovals: true,
  marketing: false,
};

const ORDER_FILTERS = ['all', 'active', 'completed', 'disputed'];

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];

export default function AccountPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [usernameVal, setUsernameVal] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [usernameError, setUsernameError] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const debounceRef = useRef(null);

  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [changingPhoto, setChangingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const initials = (userProfile?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setUsernameVal(userProfile.username || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setNotifPrefs(userProfile.notificationPrefs || DEFAULT_NOTIF_PREFS);
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'notifications' && currentUser) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      getDocs(q).then(snap => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === 'purchases' && currentUser) {
      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      getDocs(q).then(snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsernameVal(value);
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
    if (!value) { setUsernameChecking(false); return; }

    if (value === userProfile?.username) {
      setUsernameAvailable(value);
      setUsernameChecking(false);
      setUsernameTaken(false);
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

  const handleSaveProfile = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }
    if (usernameChecking) { toast.error('Please wait for username check'); return; }
    if (usernameError) { toast.error(usernameError); return; }
    if (usernameTaken) { toast.error('Username is taken'); return; }
    setSaving(true);
    try {
      await updateUserDocument(currentUser.uid, {
        displayName: displayName.trim(),
        username: usernameVal.toLowerCase(),
        phoneNumber: phoneNumber.trim() || null,
      });
      await updateProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.error('Image upload is not configured');
      return;
    }
    setChangingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const photoURL = data.secure_url;
      await updateUserDocument(currentUser.uid, { photoURL });
      await updateProfile(currentUser, { photoURL });
      toast.success('Photo updated');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setChangingPhoto(false);
    }
  };

  const handleNotifToggle = async (key, value) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    if (currentUser) {
      await updateUserDocument(currentUser.uid, { notificationPrefs: updated });
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error('Enter current password'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (err.code === 'auth/wrong-password') toast.error('Current password is incorrect');
      else toast.error(err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail !== currentUser.email) return;
    setDeleting(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      await currentUser.delete();
      toast.success('Account deleted');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'active') return ['pending_payment', 'payment_confirmed', 'in_transfer'].includes(o.status);
    if (orderFilter === 'completed') return o.status === 'completed';
    if (orderFilter === 'disputed') return o.status === 'disputed';
    return true;
  });

  const strength = getPasswordStrength(newPassword);
  const isEmailUser = currentUser?.providerData?.some(p => p.providerId === 'password');

  const sidebarTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const isSignOut = tab.id === 'signout';
    return (
      <button
        key={tab.id}
        onClick={() => {
          if (tab.id === 'signout') { logout(); navigate('/'); return; }
          setActiveTab(tab.id);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all text-left ${
          isActive
            ? 'bg-blue-50 text-[#003BFF] font-bold'
            : isSignOut ? 'text-red-500 hover:bg-red-50' : 'text-[#6B7280] hover:bg-gray-50'
        }`}
      >
        <Icon size={18} />
        {tab.label}
      </button>
    );
  };

  const mobileTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const isSignOut = tab.id === 'signout';
    return (
      <button
        key={tab.id}
        onClick={() => {
          if (tab.id === 'signout') { logout(); navigate('/'); return; }
          setActiveTab(tab.id);
        }}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-lg transition-all ${
          isActive ? 'bg-[#003BFF] text-white' : isSignOut ? 'text-red-500' : 'text-[#6B7280]'
        }`}
      >
        <Icon size={14} />
        {tab.label}
      </button>
    );
  };

  return (
    <div className="pt-[68px] min-h-screen bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <div className="hidden md:flex flex-col w-60 shrink-0">
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[#003BFF] flex items-center justify-center text-white text-xl font-heading font-bold mx-auto mb-3">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initials}
            </div>
            <h2 className="font-heading text-lg font-bold" style={{ color: '#111111' }}>
              {userProfile?.displayName || 'User'}
            </h2>
            {userProfile?.username && (
              <p className="text-sm" style={{ color: '#6B7280' }}>@{userProfile.username}</p>
            )}
            <span className={`inline-block mt-2 text-xs font-heading font-bold uppercase px-2.5 py-0.5 rounded-full ${
              userProfile?.role === 'seller' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {userProfile?.role || 'Buyer'}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-2 shadow-sm space-y-0.5">
            {TABS.map(sidebarTab)}
          </div>
        </div>

        <div className="md:hidden flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4">
          {TABS.map(mobileTab)}
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="w-24 h-24 rounded-full bg-[#003BFF] flex items-center justify-center text-white text-3xl font-heading font-bold mx-auto mb-3 relative">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : initials}
                  {changingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#003BFF' }}
                  disabled={changingPhoto}
                >
                  <Camera size={14} className="inline mr-1" />
                  Change Photo
                </button>
                <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>JPG or PNG · Max 2MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>DISPLAY NAME</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="input-field"
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>This is your full name shown on orders and reviews.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>USERNAME</label>
                  <input
                    type="text"
                    value={usernameVal}
                    onChange={handleUsernameChange}
                    className={`input-field ${usernameError || usernameTaken ? '!border-red-500' : ''} ${usernameAvailable ? '!border-green-500' : ''}`}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Your unique identifier. Shown on reviews and public pages.</p>
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
                      <Check size={14} style={{ color: '#10B981' }} />
                      <span className="text-xs" style={{ color: '#10B981' }}>{usernameVal} is available</span>
                    </div>
                  )}
                  {usernameTaken && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <X size={16} className="text-red-500" />
                        </div>
                        <div>
                          <p className="font-heading font-bold text-red-700 text-sm uppercase tracking-wide">Username Taken</p>
                          <p className="text-red-600 text-sm mt-1">
                            <strong>@{usernameVal}</strong> is already in use.
                            Try one of these instead:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {generateSuggestions(usernameVal).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setUsernameVal(s);
                                  setUsernameTaken(false);
                                  setUsernameChecking(true);
                                  setTimeout(async () => {
                                    const result = await checkUsername(s);
                                    setUsernameChecking(false);
                                    if (result.valid) { setUsernameAvailable(s); setUsernameTaken(false); }
                                    else if (result.error === 'taken') { setUsernameTaken(s); setUsernameAvailable(null); }
                                    else { setUsernameError(result.error); }
                                  }, 100);
                                }}
                                className="px-3 py-1 bg-white border border-[#003BFF] rounded-full text-[#003BFF] text-xs font-heading font-bold hover:bg-[#003BFF] hover:text-white transition-colors"
                              >
                                @{s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>EMAIL</label>
                  <input
                    type="text"
                    value={currentUser?.email || ''}
                    className="input-field opacity-60 cursor-not-allowed"
                    readOnly
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Email cannot be changed after registration.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>PHONE NUMBER (SAFARICOM)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="input-field"
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Used for M-Pesa payments when you purchase accounts.</p>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving || usernameChecking}
                  className="w-full font-heading font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  style={{
                    background: '#FFF100',
                    color: '#003BFF',
                    opacity: saving || usernameChecking ? 0.5 : 1,
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save />}
                  {saving ? 'SAVING...' : 'SAVE PROFILE'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: userProfile?.role === 'seller' ? <Store size={18} /> : <User size={18} />,
                    label: 'Account Type',
                    value: (userProfile?.role || 'Buyer').charAt(0).toUpperCase() + (userProfile?.role || 'Buyer').slice(1),
                  },
                  {
                    icon: <Calendar size={18} />,
                    label: 'Member Since',
                    value: userProfile?.createdAt ? formatDate(userProfile.createdAt) : '-',
                  },
                  {
                    icon: <ShoppingBag size={18} />,
                    label: 'Total Purchases',
                    value: String(userProfile?.totalPurchases || 0),
                  },
                  {
                    icon: userProfile?.sellerApproved ? <CheckCircle size={18} /> : <Clock size={18} />,
                    label: 'Seller Status',
                    value: userProfile?.sellerApproved ? 'Active Seller' : userProfile?.sellerApplicationPending ? 'Application Pending' : 'Not a Seller',
                    extra: !userProfile?.sellerApproved && !userProfile?.sellerApplicationPending ? (
                      <Link to="/apply-seller" className="text-xs font-heading font-bold hover:underline" style={{ color: '#003BFF' }}>Apply Now →</Link>
                    ) : null,
                  },
                ].map((tile, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2" style={{ color: '#003BFF' }}>
                      {tile.icon}
                    </div>
                    <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#6B7280' }}>{tile.label}</p>
                    <p className="font-heading font-bold" style={{ color: '#111111' }}>{tile.value}</p>
                    {tile.extra && <div className="mt-1">{tile.extra}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              {isEmailUser ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-heading font-bold uppercase text-sm" style={{ color: '#003BFF' }}>Change Password</h3>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#374151' }}>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#374151' }}>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="input-field"
                    />
                    {newPassword && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(strength / 4) * 100}%`, background: strengthColors[strength] }} />
                        </div>
                        <p className="text-xs mt-1" style={{ color: strengthColors[strength] || '#9CA3AF' }}>
                          {strengthLabels[strength] || ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#374151' }}>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                    className="btn-blue"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Password management is handled by Google. Please visit your Google account settings to change your password.
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-heading font-bold uppercase text-sm" style={{ color: '#003BFF' }}>Account Activity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>Login method</span>
                    <span style={{ color: '#111111' }}>
                      {isEmailUser ? 'Email/Password' : 'Google Account'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>Account created</span>
                    <span style={{ color: '#111111' }}>{userProfile?.createdAt ? formatDate(userProfile.createdAt) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>Last signed in</span>
                    <span style={{ color: '#111111' }}>
                      {currentUser?.metadata?.lastSignInTime ? formatDate(currentUser.metadata.lastSignInTime) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm"
                style={{ border: '1px solid #FCA5A5', borderLeft: '4px solid #C8102E' }}>
                <h3 className="font-heading font-bold uppercase text-sm mb-3" style={{ color: '#C8102E' }}>Danger Zone</h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                  style={{ borderColor: '#C8102E', color: '#C8102E' }}
                >
                  Delete My Account
                </button>
              </div>

              {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(0,20,80,0.75)' }}
                  onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
                  <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                    <div className="h-1" style={{ background: '#C8102E' }} />
                    <div className="p-6 space-y-4">
                      <h2 className="font-heading font-extrabold text-lg" style={{ color: '#111111' }}>Are you sure?</h2>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        This permanently deletes your account and all your data. This cannot be undone. Any active orders will be affected.
                      </p>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: '#374151' }}>
                          Type your email to confirm: <strong>{currentUser?.email}</strong>
                        </label>
                        <input
                          type="email"
                          value={deleteEmail}
                          onChange={e => setDeleteEmail(e.target.value)}
                          className="input-field"
                          placeholder={currentUser?.email || ''}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                          style={{ border: '1px solid #E0E0E0', color: '#6B7280' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteEmail !== currentUser?.email || deleting}
                          className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                          style={{ background: deleteEmail === currentUser?.email && !deleting ? '#C8102E' : '#E5E7EB' }}
                        >
                          {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
                          {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold uppercase text-sm mb-4" style={{ color: '#003BFF' }}>Notification Preferences</h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Control what you get notified about.</p>
                <div className="space-y-3">
                  {[
                    { key: 'orderUpdates', label: 'Order Updates', desc: 'When your order status changes' },
                    { key: 'newMessages', label: 'New Messages', desc: 'When you receive a chat message' },
                    { key: 'paymentUpdates', label: 'Payment Updates', desc: 'When payments are confirmed/released' },
                    { key: 'sellerApprovals', label: 'Seller Approvals', desc: 'When your seller application is reviewed' },
                    { key: 'marketing', label: 'Marketing', desc: 'Platform news and announcements' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#111111' }}>{item.label}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleNotifToggle(item.key, !notifPrefs[item.key])}
                        className={`w-12 h-6 rounded-full transition-colors relative ${notifPrefs[item.key] ? 'bg-[#003BFF]' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold uppercase text-sm" style={{ color: '#003BFF' }}>Recent Notifications</h3>
                  <button
                    onClick={async () => {
                      const batch = writeBatch(db);
                      notifications.forEach(n => {
                        if (!n.read) batch.update(doc(db, 'notifications', n.id), { read: true, readAt: new Date().toISOString() });
                      });
                      await batch.commit();
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      toast.success('Marked all as read');
                    }}
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#003BFF' }}
                  >
                    Mark all as read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: '#9CA3AF' }}>No notifications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50"
                        style={!n.read ? { background: 'rgba(0,59,255,0.04)' } : {}}>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          {n.type === 'order' ? <ShoppingBag size={14} style={{ color: '#003BFF' }} /> :
                           n.type === 'payment' ? <Shield size={14} style={{ color: '#003BFF' }} /> :
                           <Bell size={14} style={{ color: '#003BFF' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#111111' }}>{n.title}</p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>{n.message}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{formatDate(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#003BFF] shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading text-2xl font-extrabold mb-1" style={{ color: '#111111' }}>My Purchases</h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>All accounts you have bought</p>
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {ORDER_FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase transition-colors ${
                        orderFilter === f ? 'bg-[#003BFF] text-white' : 'bg-gray-100 text-[#6B7280]'
                      }`}
                    >
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="text-center py-10">
                    <Package size={48} className="mx-auto mb-3" style={{ color: '#003BFF' }} />
                    <p className="font-heading font-bold text-lg" style={{ color: '#111111' }}>No purchases yet</p>
                    <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Browse accounts to find your dream squad</p>
                    <Link to="/browse" className="btn-primary inline-block">
                      Browse Accounts
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map(order => {
                      const statusConfig = ORDER_STATUS[order.status] || {};
                      return (
                        <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium" style={{ color: '#111111' }}>{order.listingTitle || 'Account'}</p>
                            <p className="text-xs" style={{ color: '#6B7280' }}>{order.sellerDisplayName || 'Seller'}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="font-heading font-bold text-sm" style={{ color: '#003BFF' }}>
                              {order.amount ? formatKES(order.amount) : '-'}
                            </span>
                            <span className={`text-xs font-heading font-bold uppercase ${statusConfig.color || 'text-gray-500'}`}>
                              {statusConfig.label || order.status}
                            </span>
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="text-xs font-medium hover:underline flex items-center gap-1"
                              style={{ color: '#003BFF' }}
                            >
                              View <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold uppercase text-sm mb-4" style={{ color: '#003BFF' }}>Display</h3>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#111111' }}>Dark Mode</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Switch to dark theme</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      Coming Soon
                    </span>
                    <button disabled className="w-12 h-6 rounded-full bg-gray-200 relative cursor-not-allowed opacity-50">
                      <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold uppercase text-sm mb-4" style={{ color: '#003BFF' }}>Language</h3>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#111111' }}>App Language</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>More languages coming soon</p>
                  </div>
                  <select disabled className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
                    <option>English</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold uppercase text-sm mb-4" style={{ color: '#003BFF' }}>About</h3>
                <div className="space-y-2 text-sm">
                  <p style={{ color: '#6B7280' }}>eFootball Hub Kenya v1.0.0</p>
                  <p style={{ color: '#9CA3AF' }}>Not affiliated with Konami Digital Entertainment</p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link to="/how-it-works" className="text-xs font-medium hover:underline" style={{ color: '#003BFF' }}>How It Works</Link>
                    <Link to="/faq" className="text-xs font-medium hover:underline" style={{ color: '#003BFF' }}>FAQ</Link>
                    <a href="mailto:support@efootballhub.co.ke" className="text-xs font-medium hover:underline" style={{ color: '#003BFF' }}>Contact Support</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
