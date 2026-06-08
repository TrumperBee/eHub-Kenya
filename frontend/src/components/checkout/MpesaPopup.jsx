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
      <div className="text-center">
        <p className="text-xs text-[#9E9E9E] mb-1">Amount</p>
        <p className="font-heading text-3xl font-bold text-white">{formatKES(amount)}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#9E9E9E] mb-1.5">
          M-Pesa Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="e.g. 0712345678"
          maxLength={12}
          className={`w-full px-4 py-3 bg-[#242424] border ${phoneError ? 'border-red-400' : 'border-[#2A2A2A]'} rounded-xl text-white text-sm outline-none focus:border-[#BF0021] transition-colors`}
          disabled={loading}
        />
        {phoneError && (
          <p className="text-xs text-red-400 mt-1">{phoneError}</p>
        )}
        <p className="text-xs text-[#5C5C5C] mt-1">Enter your Safaricom number e.g. 0712345678</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
