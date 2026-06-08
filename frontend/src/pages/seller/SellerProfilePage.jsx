import { useState, useEffect } from 'react';
import { User, Save, Star, AlertTriangle, Mail, Calendar, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserDocument } from '../../services/authService';
import toast from 'react-hot-toast';

const SAFARICOM_REGEX = /^(?:254|\+254|0)?[17]\d{8}$/;

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-8" />
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileError({ onRetry }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
        <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your profile</p>
        <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
        <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
          RETRY
        </button>
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  const { userProfile, currentUser, updateProfile } = useAuth();
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [sellerBio, setSellerBio] = useState('');
  const [sellerWhatsapp, setSellerWhatsapp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setSellerDisplayName(userProfile.sellerDisplayName || '');
      setSellerBio(userProfile.sellerBio || '');
      setSellerWhatsapp(userProfile.sellerWhatsapp || '');
      setPhoneNumber(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  const validateSafaricom = (num) => {
    if (!num || !num.trim()) return true;
    return SAFARICOM_REGEX.test(num.trim());
  };

  const handleSave = async () => {
    const name = sellerDisplayName.trim();
    if (!name || name.length < 3) {
      toast.error('Seller display name must be at least 3 characters');
      return;
    }
    if (phoneNumber.trim() && !validateSafaricom(phoneNumber)) {
      toast.error('Please enter a valid Safaricom number (e.g. 0712345678)');
      return;
    }
    setSaving(true);
    try {
      await updateUserDocument(userProfile.uid, {
        sellerDisplayName: name,
        sellerBio: sellerBio.trim() || null,
        sellerWhatsapp: sellerWhatsapp.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      });
      await updateProfile({
        sellerDisplayName: name,
        sellerBio: sellerBio.trim(),
        sellerWhatsapp: sellerWhatsapp.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const fullStars = Math.floor(userProfile?.sellerRating || 0);
  const hasHalf = (userProfile?.sellerRating || 0) % 1 >= 0.5;
  const totalRatings = userProfile?.sellerTotalRatings || 0;

  const formatMemberDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (!userProfile) return <ProfileSkeleton />;

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <User size={24} style={{ color: '#003BFF' }} />
          <h1 className="font-heading text-2xl font-extrabold" style={{ color: '#111' }}>MY SELLER PROFILE</h1>
        </div>

        <div className="rounded-xl p-4 mb-6" style={{ background: '#FFF9E6', borderLeft: '4px solid #FFF100' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
            Your seller profile is what buyers see when they view your listings. A complete profile with a good display name builds trust and increases sales. Your rating is calculated automatically from buyer reviews after each sale.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 className="font-heading text-sm font-bold uppercase mb-5" style={{ color: '#003BFF' }}>Public Identity</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Seller Display Name <span className="text-xs font-normal lowercase" style={{ color: '#9CA3AF' }}>({sellerDisplayName.length}/30)</span></label>
              <input
                type="text"
                value={sellerDisplayName}
                onChange={(e) => setSellerDisplayName(e.target.value)}
                className="input-field"
                maxLength={30}
                placeholder="e.g. EliteSquadsKE, SquadMasterKE"
              />
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Choose a name that sounds professional.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Seller Bio <span className="text-xs font-normal lowercase" style={{ color: '#9CA3AF' }}>({sellerBio.length}/200)</span></label>
              <textarea
                value={sellerBio}
                onChange={(e) => setSellerBio(e.target.value)}
                className="input-field min-h-[100px] resize-y"
                maxLength={200}
                rows={4}
                placeholder="e.g. Experienced eFootball seller with 50+ successful transfers. Fast delivery within 2 hours. All accounts guaranteed."
              />
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Tell buyers about yourself. How long have you been playing eFootball? Why should they trust you?</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 className="font-heading text-sm font-bold uppercase mb-5" style={{ color: '#003BFF' }}>Contact</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>WhatsApp Number</label>
              <input
                type="tel"
                value={sellerWhatsapp}
                onChange={(e) => setSellerWhatsapp(e.target.value)}
                className="input-field"
                placeholder="e.g. 0712345678"
              />
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Optional — some buyers prefer WhatsApp for updates. This is only shared after they place an order.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>M-Pesa Number (for receiving payouts)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
                placeholder="e.g. 0712345678"
              />
              <p className="text-xs mt-1" style={{ color: '#C8102E' }}>
                ⚠️ This is the number that receives your sale payments. Double-check it is correct — wrong number means lost earnings.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 className="font-heading text-sm font-bold uppercase mb-4" style={{ color: '#003BFF' }}>Your Seller Rating</h2>
          {totalRatings === 0 ? (
            <div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={20} color="#D1D5DB" />
                ))}
              </div>
              <p className="text-sm" style={{ color: '#6B7280' }}>No ratings yet. Complete your first sale to earn your first review.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-heading text-3xl font-extrabold" style={{ color: '#003BFF' }}>{userProfile.sellerRating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => {
                    let fill = 'none';
                    if (star <= fullStars) fill = '#D4AF37';
                    else if (star === fullStars + 1 && hasHalf) fill = '#D4AF37';
                    return (
                      <Star key={star} size={20} fill={fill} color={fill !== 'none' ? '#D4AF37' : '#E0E0E0'} />
                    );
                  })}
                </div>
                <span className="text-sm" style={{ color: '#6B7280' }}>Based on {totalRatings} review{totalRatings !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 className="font-heading text-sm font-bold uppercase mb-4" style={{ color: '#003BFF' }}>Account Info</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={16} style={{ color: '#6B7280' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#111' }}>{currentUser?.email}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>This is your login email. Not visible to buyers.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} style={{ color: '#6B7280' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#111' }}>Member since {formatMemberDate(userProfile.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShoppingBag size={16} style={{ color: '#6B7280' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#111' }}>{userProfile.totalSales || 0} total sale{userProfile.totalSales !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={{ background: '#FFF100', color: '#111' }}
        >
          {saving ? (
            <><div className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-700 rounded-full animate-spin" /> SAVING...</>
          ) : (
            <><Save size={16} /> SAVE PROFILE CHANGES</>
          )}
        </button>
      </div>
    </div>
  );
}
