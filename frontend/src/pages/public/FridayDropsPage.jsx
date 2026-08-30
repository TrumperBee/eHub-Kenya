import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, BadgePercent, Users, CalendarDays, Zap } from 'lucide-react';
import { subscribeToActiveDrops, incrementDropViews } from '../../services/fridayDropsService';
import { getCurrentDropWeek, formatFridayLabel } from '../../utils/fridayUtils';
import { useAuth } from '../../context/AuthContext';
import DropCard from '../../components/drops/DropCard';
import CountdownTimer from '../../components/drops/CountdownTimer';

export default function FridayDropsPage() {
  const { currentUser } = useAuth();
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const unsub = subscribeToActiveDrops(
      (items) => {
        setDrops(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const week = getCurrentDropWeek();
  const liveDrops = drops
    .filter((d) => d.year === week.year && Number(d.weekNum) === week.weekNum)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));

  return (
    <div className="animate-page-in">
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #001E7A 0%, #003BFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 text-center">
          <p className="inline-flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(255,241,0,0.15)', color: '#FFF100', border: '1px solid rgba(255,241,0,0.5)' }}>
            <Flame size={14} style={{ color: '#C8102E' }} /> Weekly Deals
          </p>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold uppercase" style={{ color: '#FFFFFF' }}>
            Friday <span style={{ color: '#FFF100' }}>Drops</span>
          </h1>
          <p className="text-white/75 text-base md:text-lg mt-3 max-w-2xl mx-auto">
            Every Friday 12:00 EAT, verified sellers slash prices on their best accounts.
          </p>

          <div className="mt-8 flex justify-center pb-2">
            <CountdownTimer onLive={setLive} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: '#FFF100' }}>
              <BadgePercent size={16} /> Up to 50% OFF
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: '#FFF100' }}>
              <ShieldCheck size={16} /> Verified Sellers Only
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: '#FFF100' }}>
              <CalendarDays size={16} /> {formatFridayLabel(week.fridayISO)}
            </span>
          </div>
        </div>
      </section>

      <section className="py-14" style={{ background: '#F5F5F5' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold uppercase" style={{ color: '#111111' }}>
              {live ? 'LIVE THIS FRIDAY' : `DROPPING ${formatFridayLabel(week.fridayISO).toUpperCase()}`}
            </h2>
            <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
              Hand-picked discounts refreshed every Friday
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-transparent border-t-[#003BFF] rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
            </div>
          ) : liveDrops.length === 0 ? (
            <div className="max-w-xl mx-auto rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px dashed #003BFF' }}>
              <Flame size={40} className="mx-auto mb-4" style={{ color: '#C8102E' }} />
              <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>NO DROPS THIS FRIDAY YET</h3>
              <p className="text-sm max-w-md mx-auto" style={{ color: '#6B7280' }}>
                Sellers are submitting their best deals. Check back at 12:00 EAT on Friday, or browse the full marketplace now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveDrops.map((drop) => (
                <DropCard key={drop.id} drop={drop} onView={currentUser ? () => incrementDropViews(drop.id) : undefined} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-14" style={{ background: '#001E7A' }}>
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold uppercase text-center mb-10" style={{ color: '#FFF100' }}>
            How Friday Drops Work
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <BadgePercent size={28} />, title: 'Deals Go Live Friday', text: 'At 12:00 EAT every Friday, approved deals unlock across the marketplace.' },
              { icon: <Users size={28} />, title: 'Verified Sellers Only', text: 'Every drop is submitted by an approved seller and reviewed by our team.' },
              { icon: <ShieldCheck size={28} />, title: 'Protected by eHub Hub', text: 'Checkout is secured end-to-end with M-Pesa and our buyer protection.' },
            ].map((step, i) => (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: '#FFF100', color: '#111111' }}>
                  {step.icon}
                </div>
                <h3 className="font-heading text-base font-extrabold uppercase mb-2" style={{ color: '#FFFFFF' }}>{step.title}</h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12" style={{ background: '#FFF100' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold uppercase mb-2" style={{ color: '#111111' }}>
            Missed the drop window?
          </h2>
          <p className="text-base mb-6" style={{ color: '#374151' }}>
            Full marketplace is open 24/7. <span className="inline-flex items-center gap-1 font-semibold"><Zap size={16} /> Grab any account anytime.</span>
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center font-heading text-sm font-bold uppercase tracking-wide px-10 py-4 rounded-xl transition-all duration-200 active:scale-95"
            style={{ background: '#003BFF', color: '#FFFFFF' }}
          >
            Browse All Accounts
          </Link>
        </div>
      </section>
    </div>
  );
}