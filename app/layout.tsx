import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import { WatchlistAnnouncer, OfflineBanner } from '@/components/watchlist/WatchlistAnnouncer';
import { ServiceWorkerInitializer } from '@/components/ServiceWorkerInitializer';
import { ThemeScript, ThemeNoScript } from '@/components/theme/ThemeScript';

export const metadata: Metadata = {
  metadataBase: new URL('https://imdb-clone.app'),
  title: 'IMDB — Discover Movies, TV Shows & Actors',
  description: 'Discover movies, TV shows, actors and more. Your ultimate entertainment database.',
  openGraph: {
    title: 'IMDB — Discover Movies, TV Shows & Actors',
    description: 'Discover movies, TV shows, actors and more.',
    images: [{ url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Flash-free theme initialization */}
        <ThemeScript />
        <ThemeNoScript />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {/* Accessibility: ARIA-live announcements for screen readers */}
          <WatchlistAnnouncer />
          
          {/* Visual offline/online indicator */}
          <OfflineBanner />
          
          {/* Service Worker initialization for background sync */}
          <ServiceWorkerInitializer />
          
          {children}
        </Providers>
      </body>
    </html>
  );
}

