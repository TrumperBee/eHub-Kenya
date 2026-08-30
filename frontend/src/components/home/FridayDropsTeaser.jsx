import { Link } from 'react-router-dom';
import { Flame, BadgePercent, ShieldCheck, ArrowRight, CalendarDays } from 'lucide-react';
import { formatFridayLabel, getCurrentDropWeek } from '../../utils/fridayUtils';
import CountdownTimer from '../drops/CountdownTimer';

export default function FridayDropsTeaser() {
  const week = getCurrentDropWeek();

  return (
    <section className="py-16 md:py-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #001E7A 0%, #003BFF 60%, #001E7A 100%)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(255,241,0,0.15)', color: '#FFF100', border: '1px solid rgba(255,241,0,0.5)' }}>
              <Flame size={14} style={{ color: '#C8102E' }} /> Every Friday 12:00 EAT
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold uppercase leading-tight" style={{ color: '#FFFFFF' }}>
              FRIDAY <span style={{ color: '#FFF100' }}>DROPS</span>
            </h2>
            <p className="text-white/75 text-base mt-3 max-w-md">
              Verified sellers slash prices on their best accounts every week.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3 text-sm" style={{ color: '#FFFFFF' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF100', color: '#111111' }}>
                  <BadgePercent size={16} />
                </span>
                Up to 50% OFF curated accounts
              </li>
              <li className="flex items-center gap-3 text-sm" style={{ color: '#FFFFFF' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF100', color: '#111111' }}>
                  <ShieldCheck size={16} />
                </span>
                Every drop reviewed &amp; approved by our team
              </li>
              <li className="flex items-center gap-3 text-sm" style={{ color: '#FFFFFF' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF100', color: '#111111' }}>
                  <CalendarDays size={16} />
                </span>
                Next drop: {formatFridayLabel(week.fridayISO)}
              </li>
            </ul>

            <Link
              to="/friday-drops"
              className="mt-8 inline-flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide px-8 py-4 rounded-xl transition-all duration-200 active:scale-95"
              style={{ background: '#FFF100', color: '#111111' }}
            >
              View Friday Drops <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-3xl p-8 text-center" style={{ background: 'rgba(0,30,122,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <CountdownTimer compact />
          </div>
        </div>
      </div>
    </section>
  );
}