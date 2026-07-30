import { Timestamp } from 'firebase/firestore';

// User Profile
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  theme: 'light' | 'dark' | 'system';
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Watchlist - Only store TMDB IDs
export interface Watchlist {
  id: string;
  userId: string;
  movieIds: number[];
  tvShowIds: number[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Favorites - Only store TMDB IDs
export interface Favorites {
  id: string;
  userId: string;
  movieIds: number[];
  tvShowIds: number[];
  actorIds: number[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Review - Store only movieId/tvId, not full data
export interface Review {
  id: string;
  userId: string;
  movieId?: number;
  tvShowId?: number;
  rating: number; // 1-10
  review: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Recently Viewed - Only store TMDB IDs with timestamp
export interface RecentlyViewed {
  id: string;
  userId: string;
  items: RecentlyViewedItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecentlyViewedItem {
  id: number;
  type: 'movie' | 'tv' | 'person';
  viewedAt: Timestamp;
}

// Search History
export interface SearchHistory {
  id: string;
  userId: string;
  queries: SearchQuery[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SearchQuery {
  query: string;
  searchedAt: Timestamp;
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: Timestamp;
}

// Firestore Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  WATCHLISTS: 'watchlists',
  FAVORITES: 'favorites',
  REVIEWS: 'reviews',
  RECENTLY_VIEWED: 'recentlyViewed',
  SEARCH_HISTORY: 'searchHistory',
  NOTIFICATIONS: 'notifications',
} as const;
