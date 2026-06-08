import { Link } from 'react-router-dom';
import HeroSection from '../../components/home/HeroSection';
import StatsBar from '../../components/home/StatsBar';
import FeaturedListings from '../../components/home/FeaturedListings';
import HowItWorksSection from '../../components/home/HowItWorksSection';
import TrustBadges from '../../components/home/TrustBadges';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <FeaturedListings />
      <HowItWorksSection />
      <TrustBadges />

      <section style={{ backgroundColor: '#BF0021' }} className="py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-4">
            Start Browsing Now
          </h2>
          <p className="text-white/80 mb-6">
            Find your perfect eFootball account and buy with confidence.
          </p>
          <Link
            to="/browse"
            className="inline-block bg-white text-[#BF0021] font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Browse Accounts
          </Link>
        </div>
      </section>
    </>
  );
}
