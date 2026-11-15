import { MessageCircle, Wrench } from 'lucide-react';
import {
  MAINTENANCE_WHATSAPP_NUMBER,
  MAINTENANCE_WHATSAPP_URL,
  resolveMaintenanceMessage,
} from '../../utils/maintenance';

// Fullscreen takeover shown while settings/maintenanceMode.enabled === true.
// Deliberately no navigation and no storefront links — only the WhatsApp line.
export default function MaintenancePage({ message }) {
  return (
    <div className="w-full max-w-screen overflow-x-hidden min-h-screen flex flex-col bg-[#001450] animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex items-baseline gap-1.5 mb-10">
          <span className="font-heading text-2xl font-extrabold uppercase tracking-wide text-white">eHub</span>
          <span className="font-heading text-2xl font-extrabold uppercase tracking-wide text-[#FFF100]">Market</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-[#FFF100]/10 border border-[#FFF100]/30 flex items-center justify-center mb-6">
          <Wrench size={30} className="text-[#FFF100]" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
          We&apos;ll be right back
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-white/70">
          {resolveMaintenanceMessage(message)}
        </p>
      </div>

      <div className="pb-8 px-6 text-center">
        <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">
          Expected back shortly &middot;{' '}
          <a
            href={MAINTENANCE_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#FFF100] hover:underline"
          >
            <MessageCircle size={13} aria-hidden="true" />
            Follow updates on WhatsApp: {MAINTENANCE_WHATSAPP_NUMBER}
          </a>
        </p>
      </div>
    </div>
  );
}
