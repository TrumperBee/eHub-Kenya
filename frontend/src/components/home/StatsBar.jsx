import { useEffect, useRef, useState } from 'react';
import { subscribeToStats } from '../../services/statsService';

function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const animate = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return { count, ref };
}

function StatItem({ label, target }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="text-center min-w-0">
      <p className="font-heading text-[32px] md:text-[40px] font-extrabold leading-none" style={{ color: '#003BFF' }}>
        {count.toLocaleString()}
      </p>
      <p className="font-heading text-[11px] md:text-[12px] font-bold uppercase tracking-[0.08em] mt-2" style={{ color: '#001E7A' }}>
        {label}
      </p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="animate-pulse text-center">
      <div className="h-[40px] w-20 bg-blue-200 rounded-lg mx-auto mb-2" />
      <div className="h-4 w-24 bg-blue-100 rounded mx-auto" />
    </div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const unsub = subscribeToStats((data) => {
      setStats(data);
    });
    return unsub;
  }, []);

  const items = stats
    ? [
        { label: 'Available Accounts', value: stats.totalAccountsListed },
        { label: 'Sales Completed', value: stats.totalSalesCompleted },
        { label: 'Registered Sellers', value: stats.registeredSellers },
        { label: 'Transactions', value: stats.transactionsProcessed },
        { label: 'Total Users', value: stats.totalUsers },
      ]
    : [];

  return (
    <section className="py-10 md:py-12" style={{ background: '#FFF100' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-8">
          {!stats ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            items.map((item) => (
              <StatItem key={item.label} label={item.label} target={item.value || 0} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}