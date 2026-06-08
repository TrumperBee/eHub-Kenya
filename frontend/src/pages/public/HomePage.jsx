import { Link } from 'react-router-dom';
import HeroSection from '../../components/home/HeroSection';
import StatsBar from '../../components/home/StatsBar';
import FeaturedListings from '../../components/home/FeaturedListings';
import HowItWorksSection from '../../components/home/HowItWorksSection';
import TrustBadges from '../../components/home/TrustBadges';

export default function HomePage() {
  return (
    <div className="animate-page-in">
      <HeroSection />

      <StatsBar />

      <section className="relative h-[200px] overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,59,255,0.75)' }} />
        <p className="relative z-10 font-heading text-2xl md:text-3xl font-extrabold text-white text-center px-4">
          THE BIGGEST eFOOTBALL COMMUNITY IN KENYA
        </p>
      </section>

      <FeaturedListings />
      <HowItWorksSection />
      <TrustBadges />

      <section className="py-16" style={{ background: '#003BFF' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white uppercase mb-4">
            READY TO FIND YOUR DREAM SQUAD?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Browse hundreds of verified eFootball accounts
          </p>
          <Link to="/browse" className="btn-primary text-base !px-12 !py-5">
            Browse All Accounts
          </Link>
        </div>
      </section>
    </div>
  );
}
