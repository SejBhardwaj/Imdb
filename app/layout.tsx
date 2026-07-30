import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers/Providers';
import { WatchlistAnnouncer, OfflineBanner } from '@/components/watchlist/WatchlistAnnouncer';
import { ServiceWorkerInitializer } from '@/components/ServiceWorkerInitializer';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#080808] text-white antialiased`}>
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
