import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, X, Plus, AlertTriangle, PauseCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getListingById, updateListing } from '../../services/listingsService';
import { uploadListingImages } from '../../services/paymentService';
import TierBadge from '../../components/listings/TierBadge';
import toast from 'react-hot-toast';

const TIER_OPTIONS = ['bronze', 'silver', 'gold', 'legendary'];
const TIER_STRENGTH_DESC = {
  bronze: 'Squad Strength: 3100 – 3179',
  silver: 'Squad Strength: 3180 – 3199',
  gold: 'Squad Strength: 3200 – 3249',
  legendary: 'Squad Strength: 3250 and above',
};

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
    title: '', tier: '',
    goldCoins: '', gp: '',
    featuredPlayers: [], existingPhotos: [],
    description: '', price: '', status: 'active',
  });

  useEffect(() => {
    if (!id) return;
    getListingById(id).then((listing) => {
      if (!listing) { toast.error('Listing not found'); navigate('/transfer-room'); return; }
      if (listing.sellerId !== userProfile?.uid) { toast.error('Not your listing'); navigate('/transfer-room'); return; }
      setForm({
        title: listing.title || '',
        tier: listing.tier || '',
        goldCoins: listing.goldCoins?.toString() || '',
        gp: listing.gp?.toString() || '',
        featuredPlayers: listing.featuredPlayers || [],
        existingPhotos: listing.photos || [],
        description: listing.description || '',
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
    if (form.description.length < 30) errs.description = 'Description min 30 characters';
    if (form.description.length > 1000) errs.description = 'Description max 1000 characters';
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
        console.error('Upload error:', err);
        toast.error(err.message || 'Image upload failed');
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
        tier: form.tier,
        price: Number(form.price),
        photos: photoUrls,
        goldCoins: Number(form.goldCoins) || 0,
        gp: Number(form.gp) || 0,
        featuredPlayers: form.featuredPlayers,
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
    return <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
    </div>;
  }

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold text-konami-text mb-8">Edit Listing</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-konami-text">Listing Status</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={togglePause} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  form.status === 'active' ? 'bg-green-400/10 text-green-500' : 'bg-yellow-400/10 text-yellow-600'
                }`}>
                  <PauseCircle size={14} />
                  {form.status === 'active' ? 'Active — Click to Pause' : 'Paused — Click to Activate'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Account Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-konami-text-muted mb-1.5">Title <span className="text-konami-text-muted">({form.title.length}/80)</span></label>
                <input type="text" value={form.title} onChange={update('title')} className="input-field" maxLength={80} />
                {errors.title && <p className="text-xs text-konami-blue mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm text-konami-text-muted mb-2">Tier</label>
                <div className="flex gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, tier: t }))}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        form.tier === t ? 'border-konami-blue bg-konami-blue/10' : 'border-konami-mid-gray hover:border-konami-blue/50'
                      }`}>
                      <TierBadge tier={t} size="lg" />
                      <p className="text-[11px] mt-1" style={{color:'#6B7280'}}>{TIER_STRENGTH_DESC[t]}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs italic mt-2" style={{ color: '#6B7280' }}>
                  Select the tier that matches your squad's overall strength rating. You can find your squad strength in eFootball → Squad → Overall.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Account Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Gold Coins', key: 'goldCoins' },
                { label: 'GP / Game Points', key: 'gp' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-konami-text-muted mb-1.5">{field.label}</label>
                  <input type="number" value={form[field.key]} onChange={update(field.key)} className="input-field" min="0" />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Featured Players ({form.featuredPlayers.length}/20)</h2>
            <div className="flex gap-2 mb-3">
              <input type="text" value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); } }}
                className="input-field flex-1" placeholder="Type player name and press Enter" />
              <button type="button" onClick={handleAddPlayer} className="btn-primary py-3"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.featuredPlayers.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-konami-light-gray border border-konami-mid-gray rounded-md px-2 py-1 text-xs text-konami-text-dim">
                  {name}
                  <button type="button" onClick={() => setForm(p => ({ ...p, featuredPlayers: p.featuredPlayers.filter((_, j) => j !== i) }))} className="text-konami-text-muted hover:text-konami-blue"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Photos ({(form.existingPhotos?.length || 0) + newPhotos.length}/5)</h2>
            <div onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); const total = (form.existingPhotos?.length || 0) + newPhotos.length; const remaining = 5 - total; setNewPhotos(prev => [...prev, ...files.slice(0, remaining)]); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-konami-mid-gray hover:border-konami-blue rounded-xl p-8 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-konami-text-muted" />
              <p className="text-sm text-konami-text-dim">Add more photos</p>
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {(form.existingPhotos || []).map((url, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-konami-light-gray">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingPhoto(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-konami-blue"><X size={12} /></button>
                </div>
              ))}
              {newPhotos.map((file, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-konami-light-gray">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewPhoto(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-konami-blue"><X size={12} /></button>
                </div>
              ))}
            </div>
            {uploadProgress && <p className="text-sm text-konami-text-dim mt-2">Uploading images...</p>}
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Description</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-konami-text-muted mb-1.5">DESCRIPTION</label>
                <textarea value={form.description} onChange={update('description')} className="input-field min-h-[120px] resize-y" rows={4} placeholder="e.g. This is a high-rated squad with multiple Legendary players. I have been using this account for 2 seasons.

Guarantee: This account's email has never been changed before. I guarantee delivery within 3 hours of payment." />
                {errors.description && <p className="text-xs text-konami-blue mt-1">{errors.description}</p>}
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Describe your account. You may also include a guarantee statement (e.g. 'Email never previously changed', 'Delivered within 2 hours'). A guarantee builds buyer trust and increases sales.
                </p>
                <p className="text-xs italic mt-1" style={{ color: '#6B7280' }}>
                  Including a guarantee is optional but highly recommended.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-heading text-lg font-bold text-konami-text mb-4">Pricing</h2>
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Price (KES)</label>
              <input type="number" value={form.price} onChange={update('price')} className="input-field max-w-xs" min="100" />
              {errors.price && <p className="text-xs text-konami-blue mt-1">{errors.price}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-secondary flex items-center gap-2 text-konami-red border-konami-red/30 hover:bg-konami-red/10">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-white border border-konami-mid-gray rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-konami-red" />
                <h3 className="font-heading text-lg font-bold text-konami-text">Delete Listing?</h3>
              </div>
              <p className="text-sm text-konami-text-dim mb-6">This will remove the listing from the marketplace. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} className="btn-primary flex-1 bg-konami-red hover:bg-konami-red-hover">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
