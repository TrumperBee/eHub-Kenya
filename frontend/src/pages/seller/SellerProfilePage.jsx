import { useState, useEffect } from 'react';
import { User, Save, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SellerProfilePage() {
  const { userProfile, updateProfile } = useAuth();
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [sellerBio, setSellerBio] = useState('');
  const [sellerWhatsapp, setSellerWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setSellerDisplayName(userProfile.sellerDisplayName || '');
      setSellerBio(userProfile.sellerBio || '');
      setSellerWhatsapp(userProfile.sellerWhatsapp || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!sellerDisplayName.trim()) {
      toast.error('Seller display name is required');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        sellerDisplayName: sellerDisplayName.trim(),
        sellerBio: sellerBio.trim(),
        sellerWhatsapp: sellerWhatsapp.trim() || null,
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const fullStars = Math.floor(userProfile?.sellerRating || 0);
  const hasHalf = (userProfile?.sellerRating || 0) % 1 >= 0.5;

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User size={24} className="text-konami-blue" />
          <h1 className="font-heading text-3xl font-extrabold text-konami-text">Seller Profile</h1>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Public Profile</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Seller Display Name</label>
              <input type="text" value={sellerDisplayName} onChange={(e) => setSellerDisplayName(e.target.value)} className="input-field" placeholder="What buyers will see on your listings" />
            </div>
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Bio</label>
              <textarea value={sellerBio} onChange={(e) => setSellerBio(e.target.value)} className="input-field min-h-[100px] resize-y" rows={4} placeholder="Tell buyers about yourself and your accounts" />
            </div>
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">WhatsApp Number</label>
              <input type="tel" value={sellerWhatsapp} onChange={(e) => setSellerWhatsapp(e.target.value)} className="input-field" placeholder="e.g. 0712345678" />
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-konami-text-muted">Rating</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => {
                    let fill = 'none';
                    if (star <= fullStars) fill = '#D4AF37';
                    else if (star === fullStars + 1 && hasHalf) fill = '#D4AF37';
                    return (
                      <Star key={star} size={16} fill={fill} color={fill !== 'none' ? '#D4AF37' : '#E0E0E0'} />
                    );
                  })}
                </div>
                <span className="text-sm text-konami-text">{userProfile?.sellerRating?.toFixed(1) || '0.0'}</span>
                <span className="text-xs text-konami-text-muted">({userProfile?.sellerTotalRatings || 0} reviews)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-konami-text-muted">Total Sales</span>
              <span className="text-sm font-semibold text-konami-text">{userProfile?.totalSales || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-konami-text-muted">Total Purchases</span>
              <span className="text-sm font-semibold text-konami-text">{userProfile?.totalPurchases || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
