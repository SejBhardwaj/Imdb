'use client';

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import TrendingMoviesSection from '@/components/data/TrendingMoviesSection';
import PopularMoviesSection from '@/components/data/PopularMoviesSection';
import FeaturedMovie from '@/components/FeaturedMovie';
import TopRatedMoviesSection from '@/components/data/TopRatedMoviesSection';
import UpcomingMoviesSection from '@/components/data/UpcomingMoviesSection';
import TVShows from '@/components/TVShows';
import ActorSpotlight from '@/components/ActorSpotlight';
import Footer from '@/components/Footer';

// Disable static generation for this page (uses client-side data fetching)
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="relative bg-[rgb(var(--color-background))] min-h-screen">
      <Navbar />
      <HeroSection />

      {/* Trending Today - Real TMDb Data */}
      <TrendingMoviesSection />

      {/* Popular Movies - Real TMDb Data */}
      <PopularMoviesSection />

      {/* Featured Collection */}
      <FeaturedMovie />

      {/* Top Rated - Real TMDb Data */}
      <TopRatedMoviesSection />

      {/* Popular TV Shows */}
      <TVShows />

      {/* Actor Spotlight */}
      <ActorSpotlight />

      {/* Upcoming Releases - Real TMDb Data */}
      <UpcomingMoviesSection />

      <Footer />
    </main>
  );
}
