import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tmdbApi } from '@/lib/tmdb/api';
import { getImageUrl } from '@/config/tmdb';
import ActorProfile from '@/components/actors/ActorProfile';
import { TMDBPersonDetails } from '@/types/tmdb';

interface ActorPageProps {
  params: {
    id: string;
  };
}

// Enable ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-static';

// Generate metadata for SEO
export async function generateMetadata({ params }: ActorPageProps): Promise<Metadata> {
  try {
    const actorId = parseInt(params.id);
    const actor = await tmdbApi.people.getDetails(actorId);

    return {
      title: `${actor.name} - IMDB`,
      description: actor.biography || `View ${actor.name}'s profile, filmography, and biography.`,
      openGraph: {
        title: actor.name,
        description: actor.biography?.substring(0, 200) || `View ${actor.name}'s profile`,
        images: actor.profile_path ? [getImageUrl(actor.profile_path, 'w500')] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: actor.name,
        description: actor.biography?.substring(0, 200) || `View ${actor.name}'s profile`,
        images: actor.profile_path ? [getImageUrl(actor.profile_path, 'w500')] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Actor Not Found - IMDB',
    };
  }
}

// Generate JSON-LD structured data for SEO
function generatePersonSchema(actor: TMDBPersonDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: actor.name,
    description: actor.biography,
    birthDate: actor.birthday,
    deathDate: actor.deathday,
    birthPlace: actor.place_of_birth,
    image: actor.profile_path ? getImageUrl(actor.profile_path, 'original') : undefined,
    url: actor.homepage || undefined,
    sameAs: [
      actor.imdb_id ? `https://www.imdb.com/name/${actor.imdb_id}` : null,
    ].filter(Boolean),
    jobTitle: actor.known_for_department,
  };
}

export default async function ActorPage({ params }: ActorPageProps) {
  try {
    const actorId = parseInt(params.id);
    
    if (isNaN(actorId)) {
      notFound();
    }

    // Fetch all actor data in parallel
    const [actor, movieCredits, tvCredits, images, externalIds] = await Promise.all([
      tmdbApi.people.getDetails(actorId),
      tmdbApi.people.getMovieCredits(actorId),
      tmdbApi.people.getTVCredits(actorId),
      tmdbApi.people.getImages(actorId),
      tmdbApi.people.getExternalIds(actorId),
    ]);

    // Generate structured data
    const personSchema = generatePersonSchema(actor);

    return (
      <>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />

        {/* Actor Profile Component */}
        <ActorProfile
          actor={actor}
          movieCredits={movieCredits}
          tvCredits={tvCredits}
          images={images}
          externalIds={externalIds}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching actor data:', error);
    notFound();
  }
}
