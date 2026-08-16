# IMDb Clone - Next.js Movie Database

A production-grade movie database application built with Next.js 13, featuring real-time movie data from TMDb API, advanced theming system, and enterprise-level architecture.

## 🚀 Live Demo

**[View Live Site](https://imdb-six-kappa.vercel.app)**

## ✨ Features

### Core Functionality
- **Movie Discovery**: Browse trending, popular, top-rated, and upcoming movies
- **Detailed Movie Pages**: View comprehensive movie information, cast, trailers, and recommendations
- **Real-time Data**: Integration with The Movie Database (TMDb) API
- **Responsive Design**: Optimized for all devices with mobile-first approach
- **Next.js Image Optimization**: Automatic WebP/AVIF conversion, lazy loading, blur placeholders

### Enterprise Theme System
- **Multiple Theme Modes**: Light, Dark, High Contrast, System (auto)
- **Zero-Flash SSR**: Server-side rendering with inline script prevents theme flash
- **Multi-Device Sync**: Real-time theme synchronization across devices via Server-Sent Events (SSE)
- **Cross-Tab Sync**: Instant theme updates across browser tabs using BroadcastChannel API
- **Database Persistence**: Theme preferences stored in Supabase with automatic sync
- **30+ CSS Variables**: Comprehensive semantic color system with WCAG 2.1 AA accessibility
- **Smooth Animations**: Polished transitions and micro-interactions

### Advanced Architecture
- **Provider Pattern**: Abstracted data providers (TMDb, potential future sources)
- **Repository Pattern**: Clean separation between data fetching and business logic
- **Resilience Layer**: Circuit breaker, exponential backoff retry, token bucket rate limiting
- **Caching Strategy**: LRU memory cache with tag-based invalidation
- **TanStack Query**: Advanced server state management with prefetching and optimistic updates
- **Type-Safe**: Full TypeScript coverage with strict mode enabled

### Developer Experience
- **Playwright E2E Tests**: Comprehensive test coverage with accessibility testing
- **Prisma ORM**: Type-safe database access with migrations
- **ESLint + TypeScript**: Strict linting and type checking
- **Hot Module Replacement**: Fast development with Next.js Fast Refresh

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 13.5.1 (App Router)
- **UI Library**: React 18.2.0
- **Styling**: Tailwind CSS 3.3.3
- **Component Library**: Radix UI primitives
- **Animations**: Framer Motion
- **State Management**: Redux Toolkit, TanStack Query

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma 6.3.0
- **API**: TMDb REST API
- **Real-time**: Server-Sent Events (SSE)

### Development
- **Language**: TypeScript 5.2.2
- **Testing**: Playwright with @axe-core/playwright
- **Package Manager**: npm with legacy peer deps support
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- TMDb API key (optional - app works with graceful fallbacks)
- Supabase account (for theme sync and user data)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/SejBhardwaj/Imdb.git
cd Imdb
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
# TMDb API (optional)
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key

# Supabase (required for theme sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

Run Playwright tests:
```bash
npm run test
```

Run tests in UI mode:
```bash
npm run test:ui
```

Run accessibility tests:
```bash
npm run test -- tests/theme/accessibility.spec.ts
```

## 📁 Project Structure

```
├── app/                      # Next.js app router pages
│   ├── api/                  # API routes
│   │   ├── reviews/          # Review system endpoints
│   │   ├── user/             # User preferences and theme sync
│   │   └── watchlist/        # Watchlist management
│   ├── movies/[id]/          # Dynamic movie detail pages
│   └── settings/             # User settings pages
├── components/               # React components
│   ├── images/               # Image optimization components
│   ├── movies/               # Movie-specific components
│   ├── theme/                # Theme system components
│   └── ui/                   # Reusable UI components (Radix)
├── src/
│   ├── lib/
│   │   ├── theme/            # Theme system (context, sync, utilities)
│   │   ├── images/           # Image URL builders and helpers
│   │   └── query/            # TanStack Query hooks and client
│   ├── providers/            # Data providers (TMDb, registry)
│   ├── repositories/         # Repository pattern implementations
│   └── types/                # TypeScript type definitions
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets (placeholders, icons)
├── tests/                    # Playwright E2E tests
└── scripts/                  # Utility scripts
```

## 🎨 Theme System

The app features an enterprise-grade theme system with:

- **4 Theme Modes**: Light, Dark, High Contrast, System (follows OS preference)
- **SSR Support**: Themes render correctly on first load with zero flash
- **Persistence Layers**: 
  - Cookie (SSR + client)
  - localStorage (client-side backup)
  - Supabase (cross-device sync)
- **Real-time Sync**: 
  - BroadcastChannel API for same-device cross-tab sync
  - SSE for cross-device synchronization
- **Accessibility**: WCAG 2.1 AA compliant with high contrast mode

Access theme settings at `/settings/appearance`

## 🚢 Deployment

### Vercel (Recommended)

The app is configured for Vercel deployment with automatic builds on push.

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The `vercel.json` includes custom build commands with `--legacy-peer-deps` flag.

### Environment Variables

Required for production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (app works without):
- `NEXT_PUBLIC_TMDB_API_KEY`

## 📝 License

MIT

## 👤 Author

**Sejal Bhardwaj**
- GitHub: [@SejBhardwaj](https://github.com/SejBhardwaj)

## 🙏 Acknowledgments

- [The Movie Database (TMDb)](https://www.themoviedb.org/) for movie data
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Vercel](https://vercel.com/) for hosting and deployment
