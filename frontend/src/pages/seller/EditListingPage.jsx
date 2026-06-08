import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, X, Plus, AlertTriangle, PauseCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getListingById, updateListing } from '../../services/listingsService';
import { uploadListingImages } from '../../services/paymentService';
import TierBadge from '../../components/listings/TierBadge';
import toast from 'react-hot-toast';

const TIER_OPTIONS = ['bronze', 'silver', 'gold', 'legendary'];
const PLATFORM_OPTIONS = ['android', 'ios', 'both'];
const LINK_TYPE_OPTIONS = [
  { value: 'google', label: 'Linked to Google' },
  { value: 'apple', label: 'Linked to Apple' },
  { value: 'konami_only', label: 'Konami ID Only' },
];

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPhotos, setNewPhotos] = useState([]);

  const [form, setForm] = useState({
    title: '', tier: '', platform: '',
    fiveStarCount: '', goldCoins: '', gp: '', epicLegendaryCount: '',
    konamiLinkType: '', featuredPlayers: [], existingPhotos: [],
    description: '', guaranteeStatement: '', price: '', status: 'active',
  });

  useEffect(() => {
    if (!id) return;
    getListingById(id).then((listing) => {
      if (!listing) { toast.error('Listing not found'); navigate('/transfer-room'); return; }
      if (listing.sellerId !== userProfile?.uid) { toast.error('Not your listing'); navigate('/transfer-room'); return; }
      setForm({
        title: listing.title || '',
        tier: listing.tier || '',
        platform: listing.platform || '',
        fiveStarCount: listing.fiveStarCount?.toString() || '',
        goldCoins: listing.goldCoins?.toString() || '',
        gp: listing.gp?.toString() || '',
        epicLegendaryCount: listing.epicLegendaryCount?.toString() || '',
        konamiLinkType: listing.konamiLinkType || '',
        featuredPlayers: listing.featuredPlayers || [],
        existingPhotos: listing.photos || [],
        description: listing.description || '',
        guaranteeStatement: listing.guaranteeStatement || '',
        price: listing.price?.toString() || '',
        status: listing.status || 'active',
      });
      setLoading(false);
    });
  }, [id, userProfile]);

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleAddPlayer = () => {
    const name = playerInput.trim();
    if (!name) return;
    if (form.featuredPlayers.length >= 20) { toast.error('Max 20 players'); return; }
    setForm(p => ({ ...p, featuredPlayers: [...p.featuredPlayers, name] }));
    setPlayerInput('');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const total = form.existingPhotos.length + newPhotos.length;
    const remaining = 5 - total;
    setNewPhotos(prev => [...prev, ...files.slice(0, remaining)]);
    if (e.target) e.target.value = '';
  };

  const removeExistingPhoto = (index) => {
    setForm(p => ({ ...p, existingPhotos: p.existingPhotos.filter((_, i) => i !== index) }));
  };

  const removeNewPhoto = (index) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs = {};
    if (!form.title || form.title.length > 80) errs.title = 'Title is required (max 80 chars)';
    if (!form.tier) errs.tier = 'Select a tier';
    if (!form.platform) errs.platform = 'Select a platform';
    if (form.description.length < 50) errs.description = 'Description min 50 characters';
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

    let photoUrls = [...form.existingPhotos];
    if (newPhotos.length > 0) {
      setUploadProgress(true);
      try {
        const result = await uploadListingImages(newPhotos);
        photoUrls = [...photoUrls, ...result.urls];
      } catch (err) {
        toast.error('Image upload failed');
        setSubmitting(false);
        setUploadProgress(false);
        return;
      }
      setUploadProgress(false);
    }

    try {
      await updateListing(id, {
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
        status: form.status,
      });
      toast.success('Listing updated!');
      navigate('/transfer-room');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePause = () => {
    const newStatus = form.status === 'active' ? 'paused' : 'active';
    setForm(p => ({ ...p, status: newStatus }));
  };

  const handleDelete = async () => {
    try {
      await updateListing(id, { status: 'removed' });
      toast.success('Listing removed');
      navigate('/transfer-room');
    } catch (err) {
      toast.error('Failed to remove listing');
    }
  };

  if (loading) {
    return <div className="pt-16 min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
    </div>;
  }

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="section-heading mb-8">Edit Listing</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-white">Listing Status</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={togglePause} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  form.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'
                }`}>
                  <PauseCircle size={14} />
                  {form.status === 'active' ? 'Active — Click to Pause' : 'Paused — Click to Activate'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Account Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Title <span className="text-[#5C5C5C]">({form.title.length}/80)</span></label>
                <input type="text" value={form.title} onChange={update('title')} className="input-field" maxLength={80} />
                {errors.title && <p className="text-xs text-[#BF0021] mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-2">Tier</label>
                <div className="flex gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, tier: t }))}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        form.tier === t ? 'border-[#BF0021] bg-[#BF0021]/10' : 'border-[#2A2A2A] hover:border-[#BF0021]/50'
                      }`}>
                      <TierBadge tier={t} size="lg" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-2">Platform</label>
                <div className="flex gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`flex-1 p-3 rounded-lg border-2 text-center capitalize text-sm font-medium transition-all ${
                        form.platform === p ? 'border-[#BF0021] bg-[#BF0021]/10 text-white' : 'border-[#2A2A2A] text-[#9E9E9E]'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
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
              <label className="block text-sm text-[#9E9E9E] mb-2">Konami Link Type</label>
              <div className="flex gap-2">
                {LINK_TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, konamiLinkType: opt.value }))}
                    className={`flex-1 p-3 rounded-lg border-2 text-center text-sm transition-all ${
                      form.konamiLinkType === opt.value ? 'border-[#BF0021] bg-[#BF0021]/10 text-white' : 'border-[#2A2A2A] text-[#9E9E9E]'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Featured Players ({form.featuredPlayers.length}/20)</h2>
            <div className="flex gap-2 mb-3">
              <input type="text" value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); } }}
                className="input-field flex-1" placeholder="Type player name and press Enter" />
              <button type="button" onClick={handleAddPlayer} className="btn-primary py-3"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.featuredPlayers.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-[#242424] border border-[#2A2A2A] rounded-md px-2 py-1 text-xs text-[#9E9E9E]">
                  {name}
                  <button type="button" onClick={() => setForm(p => ({ ...p, featuredPlayers: p.featuredPlayers.filter((_, j) => j !== i) }))} className="text-[#5C5C5C] hover:text-[#BF0021]"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Photos ({(form.existingPhotos?.length || 0) + newPhotos.length}/5)</h2>
            <div onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); const total = (form.existingPhotos?.length || 0) + newPhotos.length; const remaining = 5 - total; setNewPhotos(prev => [...prev, ...files.slice(0, remaining)]); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-[#2A2A2A] hover:border-[#BF0021] rounded-xl p-8 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-[#5C5C5C]" />
              <p className="text-sm text-[#9E9E9E]">Add more photos</p>
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {(form.existingPhotos || []).map((url, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-[#242424]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingPhoto(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-[#BF0021]"><X size={12} /></button>
                </div>
              ))}
              {newPhotos.map((file, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-[#242424]">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewPhoto(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-[#BF0021]"><X size={12} /></button>
                </div>
              ))}
            </div>
            {uploadProgress && <p className="text-sm text-[#9E9E9E] mt-2">Uploading images...</p>}
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Description & Guarantee</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Description <span className="text-[#5C5C5C]">({form.description.length}/1000)</span></label>
                <textarea value={form.description} onChange={update('description')} className="input-field min-h-[120px] resize-y" rows={4} />
                {errors.description && <p className="text-xs text-[#BF0021] mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="block text-sm text-[#9E9E9E] mb-1.5">Guarantee Statement</label>
                <input type="text" value={form.guaranteeStatement} onChange={update('guaranteeStatement')} className="input-field" />
                {errors.guaranteeStatement && <p className="text-xs text-[#BF0021] mt-1">{errors.guaranteeStatement}</p>}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-white mb-4">Pricing</h2>
            <div>
              <label className="block text-sm text-[#9E9E9E] mb-1.5">Price (KES)</label>
              <input type="number" value={form.price} onChange={update('price')} className="input-field max-w-xs" min="100" />
              {errors.price && <p className="text-xs text-[#BF0021] mt-1">{errors.price}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-secondary flex items-center gap-2 text-[#BF0021] border-[#BF0021]/30 hover:bg-[#BF0021]/10">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-red-400" />
                <h3 className="font-heading text-lg font-bold text-white">Delete Listing?</h3>
              </div>
              <p className="text-sm text-[#9E9E9E] mb-6">This will remove the listing from the marketplace. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} className="btn-primary flex-1" style={{ backgroundColor: '#BF0021' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
