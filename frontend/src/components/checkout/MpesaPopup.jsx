import { useState } from 'react';
import { formatKES } from '../../utils/formatters';

function validatePhone(value) {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return { valid: true, formatted: '254' + cleaned.slice(1) };
  if (cleaned.startsWith('254') && cleaned.length === 12) return { valid: true, formatted: cleaned };
  if (cleaned.length > 0 && cleaned.length <= 9 && !cleaned.startsWith('0') && !cleaned.startsWith('254')) return { valid: true, formatted: '254' + cleaned };
  if (cleaned.length === 0) return { valid: false, formatted: '' };
  return { valid: false, formatted: cleaned };
}

export default function MpesaPopup({ amount, onSubmit, loading }) {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setPhone(val);
    if (val && !validatePhone(val).valid) {
      setPhoneError('Enter a valid Safaricom number (e.g., 0712345678)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = () => {
    const validation = validatePhone(phone);
    if (!validation.valid || phone.length < 9) {
      setPhoneError('Enter a valid Safaricom number (e.g., 0712345678)');
      return;
    }
    onSubmit(validation.formatted);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: '#003BFF' }}>
        <p className="text-xs text-white/60 text-center mb-1">Amount</p>
        <p className="font-heading text-3xl font-extrabold text-center" style={{ color: '#FFF100' }}>{formatKES(amount)}</p>
      </div>

      <div>
        <label className="block text-xs font-heading font-bold uppercase tracking-wider mb-1.5" style={{ color: '#003BFF' }}>
          M-Pesa Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="e.g. 0712345678"
          maxLength={12}
          className="w-full px-4 py-3 bg-white border rounded-xl text-sm transition-all duration-200 input-field"
          style={{
            borderColor: phoneError ? '#C8102E' : '#E0E0E0',
          }}
          disabled={loading}
        />
        {phoneError && (
          <p className="text-xs mt-1" style={{ color: '#C8102E' }}>{phoneError}</p>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: '#4CAF50' }}>Lipa Na M-Pesa</p>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-bold min-h-[48px]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending M-Pesa Request...
          </span>
        ) : (
          'Send M-Pesa Request'
        )}
      </button>

      <p className="text-xs text-center" style={{ color: '#6B7280' }}>🔒 Secured by Escrow</p>
    </div>
  );
}
