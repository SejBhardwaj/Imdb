import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MovieCarousel from '@/components/MovieCarousel';
import FeaturedMovie from '@/components/FeaturedMovie';
import MoviesSection from '@/components/MoviesSection';
import TopRated from '@/components/TopRated';
import TVShows from '@/components/TVShows';
import ActorSpotlight from '@/components/ActorSpotlight';
import Footer from '@/components/Footer';
import { TRENDING_MOVIES, UPCOMING_MOVIES } from '@/lib/mockData';
import { Flame, Clapperboard, Calendar, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative bg-[#080808] min-h-screen">
      <Navbar />
      <HeroSection />

      {/* Trending Today */}
      <MovieCarousel
        id="trending"
        title="Trending Today"
        icon={<Flame size={20} />}
        accent
        movies={TRENDING_MOVIES}
      />

      {/* Discover Movies with genre filter */}
      <MoviesSection />

      {/* Featured Collection */}
      <FeaturedMovie />

      {/* Top Rated */}
      <TopRated />

      {/* Popular TV Shows */}
      <TVShows />

      {/* Actor Spotlight */}
      <ActorSpotlight />

      {/* Upcoming Releases */}
      <MovieCarousel
        title="Upcoming Releases"
        icon={<Calendar size={20} />}
        movies={UPCOMING_MOVIES}
      />

      <Footer />
    </main>
  );
}
