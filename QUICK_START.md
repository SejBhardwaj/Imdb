# ⚡ Quick Start Guide

**Get up and running in 5 minutes!**

---

## 🚀 Setup (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Get TMDb API Key (FREE)
# Visit: https://www.themoviedb.org/settings/api
# Create account → Settings → API → Request API Key

# 3. Create .env.local
echo "TMDB_API_KEY=your_key_here" > .env.local

# 4. Run development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

---

## 💻 Usage Examples (3 minutes)

### 1. Fetch a Movie (Server Component)

```typescript
// app/movies/[id]/page.tsx
import { getMovieAction } from '@/lib/data/serverActions';

export default async function MoviePage({ params }) {
  const movie = await getMovieAction(parseInt(params.id));
  
  return (
    <div>
      <h1>{movie.title}</h1>
      <p>{movie.overview}</p>
      <p>Rating: {movie.vote_average}/10</p>
    </div>
  );
}
```

### 2. Popular Movies List (Client Component)

```typescript
// components/PopularMovies.tsx
'use client';

import { usePopularMovies } from '@/hooks/useMovies';
import { getPopularMoviesAction } from '@/lib/data/serverActions';

export function PopularMovies() {
  const { data, isLoading } = usePopularMovies(getPopularMoviesAction);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {data?.results.map((movie) => (
        <div key={movie.id}>
          <h3>{movie.title}</h3>
          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        </div>
      ))}
    </div>
  );
}
```

### 3. Search Movies

```typescript
'use client';

import { useSearchMovies } from '@/hooks/useMovieSearch';
import { searchMoviesAction } from '@/lib/data/serverActions';

export function MovieSearch() {
  const { query, setQuery, results, isLoading } = useSearchMovies(searchMoviesAction, 300);
  
  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies..."
      />
      {isLoading && <span>Searching...</span>}
      <div>
        {results.map((movie) => (
          <div key={movie.id}>{movie.title}</div>
        ))}
      </div>
    </>
  );
}
```

### 4. Infinite Scroll

```typescript
'use client';

import { useInfinitePopularMovies } from '@/hooks/useMovies';
import { getPopularMoviesAction } from '@/lib/data/serverActions';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function InfiniteMovies() {
  const { data, fetchNextPage, hasNextPage } = useInfinitePopularMovies(getPopularMoviesAction);
  const { ref, inView } = useInView();
  
  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage]);
  
  return (
    <>
      {data?.pages.flatMap(p => p.results).map((movie) => (
        <div key={movie.id}>{movie.title}</div>
      ))}
      {hasNextPage && <div ref={ref}>Loading more...</div>}
    </>
  );
}
```

---

## 🎯 Available Hooks

### Movie Data
- `useMovie(id)` - Single movie details
- `usePopularMovies()` - Popular movies
- `useTopRatedMovies()` - Top-rated movies
- `useNowPlayingMovies()` - Now playing
- `useUpcomingMovies()` - Upcoming movies
- `useSearchMovies(query)` - Search with debouncing
- `useMovieCredits(id)` - Cast & crew
- `useMovieVideos(id)` - Trailers & videos

### Infinite Scroll
- `useInfinitePopularMovies()` - Infinite popular
- `useInfiniteTopRatedMovies()` - Infinite top-rated
- `useInfiniteMovieSearch(query)` - Infinite search

### Prefetching
- `usePrefetchMovie()` - Prefetch on hover

---

## 📦 Server Actions

```typescript
import {
  getMovieAction,
  getPopularMoviesAction,
  searchMoviesAction,
  getMovieCreditsAction,
  getMovieVideosAction,
  getRecommendationsAction,
  getSimilarMoviesAction,
} from '@/lib/data/serverActions';
```

---

## 🎨 Ready-Made Components

```typescript
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieGrid } from '@/components/movies/MovieGrid';
import { MovieDetailsClient } from '@/components/movies/MovieDetailsClient';
import { MovieErrorFallback } from '@/components/movies/MovieErrorFallback';
```

---

## 🔥 Pro Tips

### 1. Prefetch on Hover (Instant Navigation)
```typescript
import { usePrefetchMovie } from '@/hooks/useMovie';
import { getMovieAction } from '@/lib/data/serverActions';

const prefetch = usePrefetchMovie(getMovieAction);

<Link 
  href={`/movies/${id}`}
  onMouseEnter={() => prefetch(id)}
>
  Movie Link
</Link>
```

### 2. Error Handling
```typescript
const { data, error, isLoading } = useMovie(id);

if (isLoading) return <Skeleton />;
if (error) return <MovieErrorFallback error={error} />;
return <div>{data.title}</div>;
```

### 3. Search with Filters
```typescript
import { useMovieSearchWithFilters } from '@/hooks/useMovieSearch';

const { data } = useMovieSearchWithFilters(
  'action',
  { year: 2024, minRating: 7.0 },
  searchMoviesWithFiltersAction
);
```

---

## 🎬 Example Pages

### Movie Details Page
```typescript
// app/movies/[id]/page.tsx
import { getMovieAction, getMovieCreditsAction } from '@/lib/data/serverActions';

export default async function MoviePage({ params }) {
  const [movie, credits] = await Promise.all([
    getMovieAction(parseInt(params.id)),
    getMovieCreditsAction(parseInt(params.id)),
  ]);
  
  return (
    <div>
      <h1>{movie.title}</h1>
      <p>{movie.overview}</p>
      
      <h2>Cast</h2>
      {credits.cast.slice(0, 5).map(actor => (
        <div key={actor.id}>{actor.name}</div>
      ))}
    </div>
  );
}
```

### Search Page
```typescript
// app/search/page.tsx
'use client';

import { useSearchMovies } from '@/hooks/useMovieSearch';
import { searchMoviesAction } from '@/lib/data/serverActions';
import { MovieCard } from '@/components/movies/MovieCard';

export default function SearchPage() {
  const { query, setQuery, results, isLoading } = useSearchMovies(searchMoviesAction);
  
  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies..."
        className="w-full p-4 text-lg border rounded"
      />
      
      {isLoading && <p>Searching...</p>}
      
      <div className="grid grid-cols-4 gap-4 mt-8">
        {results.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
```

### Browse Page
```typescript
// app/browse/page.tsx
'use client';

import { useInfinitePopularMovies } from '@/hooks/useMovies';
import { getPopularMoviesAction } from '@/lib/data/serverActions';
import { MovieGrid } from '@/components/movies/MovieGrid';

export default function BrowsePage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useInfinitePopularMovies(getPopularMoviesAction);
  
  const movies = data?.pages.flatMap(page => page.results) || [];
  
  return (
    <div>
      <h1>Browse Movies</h1>
      <MovieGrid 
        movies={movies}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
```

---

## 🐛 Common Issues

### "TMDB_API_KEY is required"
**Fix**: Add your API key to `.env.local`:
```bash
TMDB_API_KEY=your_actual_api_key_here
```

### Rate Limit Errors
**Fix**: System automatically handles with:
- Token bucket (4 req/s)
- Circuit breaker
- Exponential backoff retry
- Automatic OMDb fallback

### Cache Not Working
**Fix**: Automatically uses memory cache. Redis is optional.

---

## 📚 More Documentation

- **📖 INTEGRATION_GUIDE.md** - Complete usage guide
- **📊 FINAL_STATUS_REPORT.md** - Project status
- **🏗️ DATA_LAYER_COMPLETE.md** - Technical architecture
- **📝 FINAL_IMPLEMENTATION_SUMMARY.md** - Complete summary

---

## ✅ What's Working

- ✅ All 9 phases complete (Foundation → Testing)
- ✅ 15+ React Query hooks
- ✅ Server Actions for RSC
- ✅ Infinite scroll
- ✅ Search with debouncing
- ✅ Prefetching on hover
- ✅ Error boundaries
- ✅ Loading skeletons
- ✅ Rate limiting
- ✅ Circuit breaker
- ✅ Dual-layer caching
- ✅ Telemetry & Web Vitals
- ✅ 35+ tests

---

## 🎉 You're Ready!

**Start building:**
```bash
npm run dev
```

**Then create your first movie page using the examples above!**

---

**Questions?** Read `INTEGRATION_GUIDE.md` for detailed examples.

**Built with ❤️ using Next.js 13 + React Server Components + TanStack Query**
