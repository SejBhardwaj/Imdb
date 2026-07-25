import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cineverse.app'),
  title: 'CineVerse — Premium Movie Discovery',
  description: 'Discover movies, TV shows, actors and more. Your premium cinematic universe.',
  openGraph: {
    title: 'CineVerse — Premium Movie Discovery',
    description: 'Discover movies, TV shows, actors and more.',
    images: [{ url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#080808] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
