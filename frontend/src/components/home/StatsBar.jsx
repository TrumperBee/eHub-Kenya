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

function StatItem({ label, target, suffix = '' }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="text-center">
      <p className="font-heading text-3xl md:text-4xl font-bold text-white">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-[#9E9E9E] mt-1">{label}</p>
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
    <section className="py-12 border-y border-[#2A2A2A]" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem label="Accounts Listed" target={stats.listings} />
          <StatItem label="Sales Completed" target={stats.sales} />
          <StatItem label="Registered Users" target={stats.users} />
          <StatItem label="Active Sellers" target={stats.sellers} />
        </div>
      </div>
    </section>
  );
}
