import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitSellerApplication, getSellerApplication } from '../services/usersService';

export default function SellerApplicationPage() {
  const { currentUser, userProfile } = useAuth();
  const [application, setApplication] = useState(null);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ desiredSellerName: '', bio: '', whatsappNumber: '', agreed: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    getSellerApplication(currentUser.uid).then((app) => {
      setApplication(app);
      setChecking(false);
    });
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
        <p className="text-konami-text-dim">Please log in to apply.</p>
      </div>
    );
  }

  if (userProfile?.sellerApproved) {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="font-heading text-2xl font-bold text-konami-text mb-2">You're Already a Seller!</h2>
          <p className="text-konami-text-muted mb-6">Visit your Transfer Room to manage listings.</p>
          <Link to="/transfer-room" className="btn-primary inline-block">Go to Transfer Room</Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
      </div>
    );
  }

  if (application?.status === 'pending') {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <Clock size={48} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="font-heading text-2xl font-bold text-konami-text mb-2">Application Under Review</h2>
          <p className="text-konami-text-muted mb-4">Your seller application is being reviewed by our team. You'll be notified once a decision is made.</p>
          <span className="inline-flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 text-sm text-yellow-700">
            <Clock size={14} /> Pending Review
          </span>
        </div>
      </div>
    );
  }

  if (application?.status === 'rejected') {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-konami-red" />
          <h2 className="font-heading text-2xl font-bold text-konami-text mb-2">Application Not Approved</h2>
          {application.rejectionReason && (
            <p className="text-konami-text-muted mb-4">Reason: {application.rejectionReason}</p>
          )}
          <p className="text-konami-text-muted text-sm mb-6">You can submit a new application at any time.</p>
          <button onClick={() => { setApplication(null); setSubmitted(false); }} className="btn-primary">
            Apply Again
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="font-heading text-2xl font-bold text-konami-text mb-2">Application Submitted!</h2>
          <p className="text-konami-text-muted">Our team will review your application. You'll be notified once approved.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.desiredSellerName || !form.bio || !form.whatsappNumber) {
      setError('Please fill in all fields');
      return;
    }
    if (!form.agreed) {
      setError('You must agree to the seller terms');
      return;
    }
    setSubmitting(true);
    try {
      await submitSellerApplication(currentUser.uid, {
        email: currentUser.email,
        displayName: userProfile?.displayName || currentUser.displayName,
        desiredSellerName: form.desiredSellerName,
        bio: form.bio,
        whatsappNumber: form.whatsappNumber,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={24} className="text-konami-blue" />
          <h1 className="font-heading text-3xl font-extrabold text-konami-text">Become a Seller</h1>
        </div>
        <p className="text-konami-text-muted mb-8">
          List your eFootball accounts and start selling on Kenya's #1 marketplace.
        </p>

        <div className="card p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-konami-red">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Desired Seller Name</label>
              <input
                type="text"
                placeholder="What buyers will see"
                value={form.desiredSellerName}
                onChange={(e) => setForm((p) => ({ ...p, desiredSellerName: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">Bio / About You</label>
              <textarea
                placeholder="Tell buyers about yourself and your accounts"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                className="input-field min-h-[100px] resize-y"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm text-konami-text-muted mb-1.5">WhatsApp Number</label>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={form.whatsappNumber}
                onChange={(e) => setForm((p) => ({ ...p, whatsappNumber: e.target.value }))}
                className="input-field"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => setForm((p) => ({ ...p, agreed: e.target.checked }))}
                className="mt-1 accent-konami-blue"
              />
              <span className="text-sm text-konami-text-muted">
                I agree to deliver accounts within 24 hours and not to scam buyers
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
