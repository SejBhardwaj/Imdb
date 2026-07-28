/**
 * MovieDetailsClient Component (Client Island)
 * 
 * Interactive movie details with tabs, videos, and credits.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Star, Calendar, Clock, DollarSign, Users, Film } from 'lucide-react';
import type { MovieDetails, MovieCredits, MovieVideo } from '@/lib/data/types/movie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface MovieDetailsClientProps {
  movie: MovieDetails;
  credits?: MovieCredits;
  videos?: MovieVideo[];
  imageBaseUrl?: string;
}

export function MovieDetailsClient({
  movie,
  credits,
  videos,
  imageBaseUrl = 'https://image.tmdb.org/t/p/',
}: MovieDetailsClientProps) {
  const [selectedVideo, setSelectedVideo] = useState<MovieVideo | null>(
    videos?.find((v) => v.type === 'Trailer' && v.official) || videos?.[0] || null
  );

  const backdropUrl = movie.backdropPath
    ? `${imageBaseUrl}w1280${movie.backdropPath}`
    : null;

  const posterUrl = movie.posterPath ? `${imageBaseUrl}w500${movie.posterPath}` : null;

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';
  const budget = movie.budget ? `$${(movie.budget / 1000000).toFixed(0)}M` : 'N/A';
  const revenue = movie.revenue ? `$${(movie.revenue / 1000000).toFixed(0)}M` : 'N/A';

  const director = credits?.crew.find((c) => c.job === 'Director');
  const topCast = credits?.cast.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative">
        {/* Backdrop */}
        {backdropUrl && (
          <div className="relative h-[50vh] w-full overflow-hidden rounded-lg">
            <Image
              src={backdropUrl}
              alt={movie.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        {/* Content Overlay */}
        <div className={backdropUrl ? 'absolute bottom-0 left-0 right-0 p-6' : 'p-6'}>
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Poster */}
            {posterUrl && (
              <div className="flex-shrink-0">
                <div className="relative h-[300px] w-[200px] overflow-hidden rounded-lg shadow-2xl">
                  <Image src={posterUrl} alt={movie.title} fill className="object-cover" />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold">{movie.title}</h1>

              {movie.tagline && (
                <p className="mt-2 text-lg italic text-muted-foreground">{movie.tagline}</p>
              )}

              {/* Metadata */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {/* Rating */}
                {movie.voteAverage > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{movie.voteAverage.toFixed(1)}</span>
                    <span className="text-muted-foreground">({movie.voteCount} votes)</span>
                  </div>
                )}

                {/* Year */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{year}</span>
                </div>

                {/* Runtime */}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{runtime}</span>
                </div>
              </div>

              {/* Genres */}
              <div className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              {/* Overview */}
              <p className="mt-4 text-sm leading-relaxed">{movie.overview}</p>

              {/* Director */}
              {director && (
                <div className="mt-4">
                  <span className="text-sm font-semibold">Director:</span>{' '}
                  <span className="text-sm text-muted-foreground">{director.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="cast">Cast & Crew</TabsTrigger>
          {videos && videos.length > 0 && <TabsTrigger value="videos">Videos</TabsTrigger>}
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movie Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* Status */}
              <div>
                <div className="text-sm font-semibold">Status</div>
                <div className="text-sm text-muted-foreground">{movie.status}</div>
              </div>

              {/* Original Language */}
              <div>
                <div className="text-sm font-semibold">Original Language</div>
                <div className="text-sm text-muted-foreground uppercase">
                  {movie.originalLanguage}
                </div>
              </div>

              {/* Budget */}
              {movie.budget > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </div>
                  <div className="text-sm text-muted-foreground">{budget}</div>
                </div>
              )}

              {/* Revenue */}
              {movie.revenue > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <DollarSign className="h-4 w-4" />
                    Revenue
                  </div>
                  <div className="text-sm text-muted-foreground">{revenue}</div>
                </div>
              )}

              {/* Production Companies */}
              {movie.productionCompanies.length > 0 && (
                <div className="sm:col-span-2">
                  <div className="text-sm font-semibold">Production Companies</div>
                  <div className="text-sm text-muted-foreground">
                    {movie.productionCompanies.map((c) => c.name).join(', ')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cast & Crew Tab */}
        <TabsContent value="cast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topCast.map((cast) => (
                  <div key={cast.id} className="flex items-center gap-3">
                    <Avatar>
                      {cast.profilePath ? (
                        <AvatarImage
                          src={`${imageBaseUrl}w185${cast.profilePath}`}
                          alt={cast.name}
                        />
                      ) : (
                        <AvatarFallback>{cast.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-sm font-semibold">{cast.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{cast.character}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        {videos && videos.length > 0 && (
          <TabsContent value="videos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Videos & Trailers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Video */}
                {selectedVideo && selectedVideo.site === 'YouTube' && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedVideo.key}`}
                      title={selectedVideo.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                )}

                {/* Video List */}
                <div className="space-y-2">
                  {videos.map((video) => (
                    <Button
                      key={video.id}
                      variant={selectedVideo?.id === video.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      <span className="truncate">{video.name}</span>
                      {video.official && (
                        <Badge variant="secondary" className="ml-2">
                          Official
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
