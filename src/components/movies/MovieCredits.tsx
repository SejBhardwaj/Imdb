/**
 * Movie Credits - Server Component
 * 
 * Displays cast and crew
 */

import Image from 'next/image';
import Link from 'next/link';
import { User } from 'lucide-react';

interface MovieCreditsProps {
  credits: {
    cast: any[];
    crew: any[];
  };
}

export default function MovieCredits({ credits }: MovieCreditsProps) {
  const cast = credits.cast?.slice(0, 12) || [];
  const directors = credits.crew?.filter(c => c.job === 'Director') || [];
  const writers = credits.crew?.filter(c => 
    c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story'
  ).slice(0, 3) || [];

  return (
    <div className="space-y-8">
      {/* Directors & Writers */}
      {(directors.length > 0 || writers.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Directors */}
          {directors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Director{directors.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {directors.map((person) => (
                  <Link
                    key={person.id}
                    href={`/actors/${person.id}`}
                    className="block text-gray-300 hover:text-white transition-colors"
                  >
                    {person.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Writers */}
          {writers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Writer{writers.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {writers.map((person, index) => (
                  <Link
                    key={`${person.id}-${index}`}
                    href={`/actors/${person.id}`}
                    className="block text-gray-300 hover:text-white transition-colors"
                  >
                    {person.name}
                    {person.job && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({person.job})
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Top Cast</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {cast.map((person) => (
              <Link
                key={person.id}
                href={`/actors/${person.id}`}
                className="group"
              >
                <div className="space-y-2">
                  {/* Photo */}
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5">
                    {person.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Name & Character */}
                  <div className="text-sm">
                    <p className="font-semibold group-hover:text-red-500 transition-colors line-clamp-1">
                      {person.name}
                    </p>
                    {person.character && (
                      <p className="text-gray-400 line-clamp-1">
                        {person.character}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View Full Cast Link */}
          {credits.cast.length > 12 && (
            <div className="mt-6">
              <Link
                href={`#`}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                View Full Cast & Crew →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
