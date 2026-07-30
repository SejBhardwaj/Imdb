'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Calendar, 
  MapPin, 
  Award,
  Film,
  Tv,
  Instagram,
  Twitter,
  Facebook,
  ExternalLink
} from 'lucide-react';
import { getImageUrl } from '@/config/tmdb';
import { 
  TMDBPersonDetails, 
  TMDBPersonCredits, 
  TMDBImages, 
  TMDBExternalIds,
  TMDBMovieCredit,
  TMDBTVCredit
} from '@/types/tmdb';
import { useIsFavorite, useAddToFavorites, useRemoveFromFavorites } from '@/hooks/useFirestore';
import { useAddToRecentlyViewed } from '@/hooks/useFirestore';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface ActorProfileProps {
  actor: TMDBPersonDetails;
  movieCredits: TMDBPersonCredits;
  tvCredits: TMDBPersonCredits;
  images: TMDBImages;
  externalIds: TMDBExternalIds;
}

type FilterType = 'all' | 'movies' | 'tv';
type SortType = 'date' | 'popularity' | 'rating';

export default function ActorProfile({
  actor,
  movieCredits,
  tvCredits,
  images,
  externalIds,
}: ActorProfileProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');
  const [showFullBio, setShowFullBio] = useState(false);

  // Firestore hooks
  const { data: isFavorite } = useIsFavorite(actor.id, 'actor');
  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();
  const addToRecentlyViewed = useAddToRecentlyViewed();

  // Track recently viewed
  useEffect(() => {
    if (user) {
      addToRecentlyViewed.mutate({ id: actor.id, type: 'person' });
    }
  }, [actor.id, user]);

  // Toggle favorite
  const toggleFavorite = () => {
    if (!user) {
      alert('Please sign in to add favorites');
      return;
    }

    if (isFavorite) {
      removeFromFavorites.mutate({ type: 'actor', id: actor.id });
    } else {
      addToFavorites.mutate({ type: 'actor', id: actor.id });
    }
  };

  // Combine and filter credits
  const allCredits = useMemo(() => {
    const combined: (TMDBMovieCredit | TMDBTVCredit)[] = [];
    
    if (filter === 'all' || filter === 'movies') {
      combined.push(...movieCredits.cast);
    }
    
    if (filter === 'all' || filter === 'tv') {
      combined.push(...tvCredits.cast);
    }

    // Sort credits
    return combined.sort((a, b) => {
      if (sort === 'date') {
        const dateA = 'release_date' in a ? a.release_date : a.first_air_date;
        const dateB = 'release_date' in b ? b.release_date : b.first_air_date;
        return new Date(dateB || '').getTime() - new Date(dateA || '').getTime();
      } else if (sort === 'popularity') {
        return (b.popularity || 0) - (a.popularity || 0);
      } else {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
    });
  }, [filter, sort, movieCredits, tvCredits]);

  const age = actor.birthday
    ? Math.floor((new Date().getTime() - new Date(actor.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[500px]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          {images.profiles && images.profiles[0] ? (
            <Image
              src={getImageUrl(images.profiles[0].file_path, 'original')}
              alt={actor.name}
              fill
              className="object-cover object-top opacity-30"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-gray-900 to-[#080808]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-end pb-12">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            {/* Profile Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-64 h-96 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
            >
              {actor.profile_path ? (
                <Image
                  src={getImageUrl(actor.profile_path, 'w500')}
                  alt={actor.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-500 text-6xl">{actor.name[0]}</span>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-end">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-6xl font-bold mb-4"
              >
                {actor.name}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-4 mb-6 text-gray-300"
              >
                {actor.known_for_department && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E50914]/20 border border-[#E50914]/30">
                    <Award size={16} className="text-[#E50914]" />
                    <span className="text-sm font-medium">{actor.known_for_department}</span>
                  </div>
                )}
                
                {actor.birthday && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span className="text-sm">
                      {new Date(actor.birthday).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {age && ` (${age} years old)`}
                    </span>
                  </div>
                )}

                {actor.place_of_birth && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span className="text-sm">{actor.place_of_birth}</span>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                    isFavorite
                      ? 'bg-[#E50914] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Favorited' : 'Add to Favorites'}
                </button>

                <button className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                  <Share2 size={18} />
                </button>

                {/* Social Links */}
                {externalIds.instagram_id && (
                  <a
                    href={`https://instagram.com/${externalIds.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <Instagram size={18} />
                  </a>
                )}

                {externalIds.twitter_id && (
                  <a
                    href={`https://twitter.com/${externalIds.twitter_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <Twitter size={18} />
                  </a>
                )}

                {externalIds.facebook_id && (
                  <a
                    href={`https://facebook.com/${externalIds.facebook_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <Facebook size={18} />
                  </a>
                )}

                {actor.homepage && (
                  <a
                    href={actor.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Biography */}
      {actor.biography && (
        <section className="max-w-7xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold mb-6">Biography</h2>
          <div className="relative">
            <p
              className={`text-gray-300 leading-relaxed ${
                !showFullBio && actor.biography.length > 500 ? 'line-clamp-6' : ''
              }`}
            >
              {actor.biography}
            </p>
            {actor.biography.length > 500 && (
              <button
                onClick={() => setShowFullBio(!showFullBio)}
                className="mt-4 text-[#E50914] hover:text-[#ff1a1a] font-medium"
              >
                {showFullBio ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Filmography */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Filmography</h2>
          
          <div className="flex items-center gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'all' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('movies')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  filter === 'movies' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Film size={16} />
                Movies
              </button>
              <button
                onClick={() => setFilter('tv')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  filter === 'tv' ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Tv size={16} />
                TV
              </button>
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#E50914]"
            >
              <option value="date">Latest First</option>
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Credits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <AnimatePresence mode="popLayout">
            {allCredits.map((credit) => (
              <motion.div
                key={credit.credit_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3">
                  {credit.poster_path ? (
                    <Image
                      src={getImageUrl(credit.poster_path, 'w342')}
                      alt={'title' in credit ? credit.title : credit.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Film size={32} className="text-gray-600" />
                    </div>
                  )}
                  
                  {/* Rating Badge */}
                  {credit.vote_average > 0 && (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-xs font-medium">{credit.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                  {'title' in credit ? credit.title : credit.name}
                </h3>
                
                {credit.character && (
                  <p className="text-xs text-gray-400 line-clamp-1">as {credit.character}</p>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  {'release_date' in credit && credit.release_date
                    ? new Date(credit.release_date).getFullYear()
                    : 'first_air_date' in credit && credit.first_air_date
                    ? new Date(credit.first_air_date).getFullYear()
                    : 'TBA'}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
