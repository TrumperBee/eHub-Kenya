import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createListing } from '../../services/listingsService';
import { uploadListingImages } from '../../services/paymentService';
import TierBadge from '../../components/listings/TierBadge';
import PlayerBadge from '../../components/listings/PlayerBadge';
import toast from 'react-hot-toast';

const TIER_OPTIONS = ['bronze', 'silver', 'gold', 'legendary'];
const PLATFORM_OPTIONS = ['android', 'ios', 'both'];
const LINK_TYPE_OPTIONS = [
  { value: 'google', label: 'Linked to Google' },
  { value: 'apple', label: 'Linked to Apple' },
  { value: 'konami_only', label: 'Konami ID Only' },
];

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    tier: '',
    platform: '',
    fiveStarCount: '',
    goldCoins: '',
    gp: '',
    epicLegendaryCount: '',
    konamiLinkType: '',
    featuredPlayers: [],
    photos: [],
    description: '',
    guaranteeStatement: '',
    price: '',
  });

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleAddPlayer = () => {
    const name = playerInput.trim();
    if (!name) return;
    if (form.featuredPlayers.length >= 20) { toast.error('Max 20 players'); return; }
    if (form.featuredPlayers.includes(name)) { toast.error('Player already added'); return; }
    setForm(p => ({ ...p, featuredPlayers: [...p.featuredPlayers, name] }));
    setPlayerInput('');
  };

  const handleRemovePlayer = (index) => {
    setForm(p => ({ ...p, featuredPlayers: p.featuredPlayers.filter((_, i) => i !== index) }));
  };

  const handlePlayerKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - form.photos.length;
    const toAdd = files.slice(0, remaining);
    setForm(p => ({ ...p, photos: [...p.photos, ...toAdd] }));
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    const remaining = 5 - form.photos.length;
    const toAdd = files.slice(0, remaining);
    setForm(p => ({ ...p, photos: [...p.photos, ...toAdd] }));
  };

  const removePhoto = (index) => {
    setForm(p => ({ ...p, photos: p.photos.filter((_, i) => i !== index) }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title || form.title.length > 80) errs.title = 'Title is required (max 80 chars)';
    if (!form.tier) errs.tier = 'Select a tier';
    if (!form.platform) errs.platform = 'Select a platform';
    if (form.description.length < 50) errs.description = 'Description must be at least 50 characters';
    if (form.description.length > 1000) errs.description = 'Description max 1000 characters';
    if (!form.guaranteeStatement) errs.guaranteeStatement = 'Guarantee statement is required';
    const price = Number(form.price);
    if (!price || price < 100) errs.price = 'Price must be at least KES 100';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors'); return; }
    setSubmitting(true);

    let photoUrls = [];
    if (form.photos.length > 0) {
      setUploadProgress(true);
      try {
        const result = await uploadListingImages(form.photos);
        photoUrls = result.urls;
      } catch (err) {
        toast.error('Image upload failed. Try again.');
        setSubmitting(false);
        setUploadProgress(false);
        return;
      }
      setUploadProgress(false);
    }

    try {
      await createListing({
        sellerId: userProfile.uid,
        sellerDisplayName: userProfile.sellerDisplayName || userProfile.displayName,
        sellerRating: userProfile.sellerRating || 0,
        title: form.title,
        description: form.description,
        platform: form.platform,
        tier: form.tier,
        price: Number(form.price),
        photos: photoUrls,
        fiveStarCount: Number(form.fiveStarCount) || 0,
        goldCoins: Number(form.goldCoins) || 0,
        gp: Number(form.gp) || 0,
        epicLegendaryCount: Number(form.epicLegendaryCount) || 0,
        featuredPlayers: form.featuredPlayers,
        konamiLinkType: form.konamiLinkType,
        guaranteeStatement: form.guaranteeStatement,
      });
      toast.success('Listing published successfully!');
      navigate('/transfer-room');
    } catch (err) {
      toast.error(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="section-heading mb-8">Create Listing</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Account Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Title <span className="text-[#5C5C5C]">({form.title.length}/80)</span></label>
                <input type="text" value={form.title} onChange={update('title')} className="input-field" maxLength={80} placeholder="e.g. Endgame 104+ Legends Squad" />
                {errors.title && <p className="text-xs text-[#BF0021] mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm text-[#9E9E9E] mb-2">Tier</label>
                <div className="flex gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, tier: t }))}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        form.tier === t ? 'border-[#BF0021] bg-[#BF0021]/10' : 'border-[#2A2A2A] hover:border-[#BF0021]/50'
                      }`}
                    >
                      <TierBadge tier={t} size="lg" />
                    </button>
                  ))}
                </div>
                {errors.tier && <p className="text-xs text-[#BF0021] mt-1">{errors.tier}</p>}
              </div>

              <div>
                <label className="block text-sm text-[#9E9E9E] mb-2">Platform</label>
                <div className="flex gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`flex-1 p-3 rounded-lg border-2 text-center capitalize text-sm font-medium transition-all ${
                        form.platform === p ? 'border-[#BF0021] bg-[#BF0021]/10 text-white' : 'border-[#2A2A2A] text-[#9E9E9E] hover:border-[#BF0021]/50'
                      }`}
                    >
                      {p === 'both' ? 'Both' : p}
                    </button>
                  ))}
                </div>
                {errors.platform && <p className="text-xs text-[#BF0021] mt-1">{errors.platform}</p>}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Account Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '5-Star Player Count', key: 'fiveStarCount' },
                { label: 'Gold Coins', key: 'goldCoins' },
                { label: 'GP / Game Points', key: 'gp' },
                { label: 'Epic/Legendary Count', key: 'epicLegendaryCount' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-[#9E9E9E] mb-1.5">{field.label}</label>
                  <input type="number" value={form[field.key]} onChange={update(field.key)} className="input-field" min="0" />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm text-[#9E9E9E] mb-2">Konami Account Link Type</label>
              <div className="flex gap-2">
                {LINK_TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, konamiLinkType: opt.value }))}
                    className={`flex-1 p-3 rounded-lg border-2 text-center text-sm transition-all ${
                      form.konamiLinkType === opt.value ? 'border-[#BF0021] bg-[#BF0021]/10 text-white' : 'border-[#2A2A2A] text-[#9E9E9E] hover:border-[#BF0021]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Featured Players <span className="text-sm text-[#5C5C5C]">({form.featuredPlayers.length}/20)</span></h2>
            <div className="flex items-center gap-2 mb-3">
              <input type="text" value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyDown={handlePlayerKeyDown}
                className="input-field flex-1" placeholder="Type player name and press Enter (e.g. Messi 108)" />
              <button type="button" onClick={handleAddPlayer} className="btn-primary py-3"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {form.featuredPlayers.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-[#242424] border border-[#2A2A2A] rounded-md px-2 py-1 text-xs text-[#9E9E9E]">
                  {name}
                  <button type="button" onClick={() => handleRemovePlayer(i)} className="text-[#5C5C5C] hover:text-[#BF0021]"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Photos <span className="text-sm text-[#5C5C5C]">({form.photos.length}/5)</span></h2>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-[#2A2A2A] hover:border-[#BF0021] rounded-xl p-8 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-[#5C5C5C]" />
              <p className="text-sm text-[#9E9E9E]">Drag & drop photos here, or click to browse</p>
              <p className="text-xs text-[#5C5C5C] mt-1">JPEG, PNG, WebP — Max 5MB each</p>
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            </div>

            {form.photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {form.photos.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#242424]">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-[#BF0021]">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadProgress && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#9E9E9E]">
                <div className="w-4 h-4 border-2 border-[#BF0021]/30 border-t-[#BF0021] rounded-full animate-spin" />
                Uploading images...
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Description & Guarantee</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Description <span className="text-[#5C5C5C]">({form.description.length}/1000)</span></label>
                <textarea value={form.description} onChange={update('description')} className="input-field min-h-[120px] resize-y" rows={4} placeholder="Describe what this account offers. Include key details about the squad..." />
                {errors.description && <p className="text-xs text-[#BF0021] mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Guarantee Statement</label>
                <input type="text" value={form.guaranteeStatement} onChange={update('guaranteeStatement')} className="input-field" placeholder="e.g. Email never previously changed, fresh account" />
                {errors.guaranteeStatement && <p className="text-xs text-[#BF0021] mt-1">{errors.guaranteeStatement}</p>}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Pricing</h2>
            <div>
              <label className="block text-sm text-[#9E9E9E] mb-1.5">Price (KES)</label>
              <input type="number" value={form.price} onChange={update('price')} className="input-field max-w-xs" min="100" placeholder="e.g. 5000" />
              {errors.price && <p className="text-xs text-[#BF0021] mt-1">{errors.price}</p>}
              <p className="text-xs text-[#5C5C5C] mt-2">0.5% M-Pesa fee on each sale (max KES 200)</p>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4">
            {submitting ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing...</>
            ) : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
