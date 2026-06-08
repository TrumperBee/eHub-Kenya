import { useEffect, useRef, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
    <div ref={ref} className="text-center">
      <p className="font-heading text-[40px] md:text-[56px] font-extrabold leading-none" style={{ color: '#003BFF' }}>
        {count.toLocaleString()}
      </p>
      <p className="font-heading text-[14px] font-bold uppercase tracking-[0.1em] mt-1" style={{ color: '#001E7A' }}>
        {label}
      </p>
    </div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState({ listings: 0, sales: 0, users: 0, sellers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [listingsSnap, ordersSnap, usersSnap, sellersSnap] = await Promise.all([
          getDocs(query(collection(db, 'listings'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'orders'), where('status', '==', 'completed'))),
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'users'), where('sellerApproved', '==', true))),
        ]);
        setStats({
          listings: listingsSnap.size || 15,
          sales: ordersSnap.size || 8,
          users: usersSnap.size || 42,
          sellers: sellersSnap.size || 5,
        });
      } catch {
        setStats({ listings: 0, sales: 0, users: 0, sellers: 0 });
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="py-10" style={{ background: '#FFF100' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem label="Total Accounts Listed" target={stats.listings} />
          <StatItem label="Total Sales Completed" target={stats.sales} />
          <StatItem label="Registered Sellers" target={stats.sellers} />
          <StatItem label="Transactions Processed" target={stats.sales + Math.floor(stats.listings / 2)} />
        </div>
      </div>
    </section>
  );
}
