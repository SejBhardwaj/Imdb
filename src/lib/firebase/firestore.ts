import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  COLLECTIONS,
  UserProfile,
  Watchlist,
  Favorites,
  Review,
  RecentlyViewed,
  RecentlyViewedItem,
  SearchHistory,
  Notification,
} from '@/types/firestore';

// User Profile
export const userProfileService = {
  create: async (uid: string, data: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userData: UserProfile = {
      uid,
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(userRef, userData);
    return userData;
  },

  get: async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
  },

  update: async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },
};

// Watchlist Service - Only stores TMDB IDs
export const watchlistService = {
  get: async (userId: string): Promise<Watchlist | null> => {
    const watchlistRef = doc(db, COLLECTIONS.WATCHLISTS, userId);
    const watchlistSnap = await getDoc(watchlistRef);
    return watchlistSnap.exists() ? (watchlistSnap.data() as Watchlist) : null;
  },

  addMovie: async (userId: string, movieId: number) => {
    const watchlistRef = doc(db, COLLECTIONS.WATCHLISTS, userId);
    const watchlist = await watchlistService.get(userId);

    if (!watchlist) {
      await setDoc(watchlistRef, {
        id: userId,
        userId,
        movieIds: [movieId],
        tvShowIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(watchlistRef, {
        movieIds: arrayUnion(movieId),
        updatedAt: serverTimestamp(),
      });
    }
  },

  removeMovie: async (userId: string, movieId: number) => {
    const watchlistRef = doc(db, COLLECTIONS.WATCHLISTS, userId);
    await updateDoc(watchlistRef, {
      movieIds: arrayRemove(movieId),
      updatedAt: serverTimestamp(),
    });
  },

  addTVShow: async (userId: string, tvShowId: number) => {
    const watchlistRef = doc(db, COLLECTIONS.WATCHLISTS, userId);
    const watchlist = await watchlistService.get(userId);

    if (!watchlist) {
      await setDoc(watchlistRef, {
        id: userId,
        userId,
        movieIds: [],
        tvShowIds: [tvShowId],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(watchlistRef, {
        tvShowIds: arrayUnion(tvShowId),
        updatedAt: serverTimestamp(),
      });
    }
  },

  removeTVShow: async (userId: string, tvShowId: number) => {
    const watchlistRef = doc(db, COLLECTIONS.WATCHLISTS, userId);
    await updateDoc(watchlistRef, {
      tvShowIds: arrayRemove(tvShowId),
      updatedAt: serverTimestamp(),
    });
  },

  isInWatchlist: async (userId: string, itemId: number, type: 'movie' | 'tv'): Promise<boolean> => {
    const watchlist = await watchlistService.get(userId);
    if (!watchlist) return false;
    
    return type === 'movie' 
      ? watchlist.movieIds.includes(itemId)
      : watchlist.tvShowIds.includes(itemId);
  },
};

// Favorites Service - Only stores TMDB IDs
export const favoritesService = {
  get: async (userId: string): Promise<Favorites | null> => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    const favoritesSnap = await getDoc(favoritesRef);
    return favoritesSnap.exists() ? (favoritesSnap.data() as Favorites) : null;
  },

  addMovie: async (userId: string, movieId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    const favorites = await favoritesService.get(userId);

    if (!favorites) {
      await setDoc(favoritesRef, {
        id: userId,
        userId,
        movieIds: [movieId],
        tvShowIds: [],
        actorIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(favoritesRef, {
        movieIds: arrayUnion(movieId),
        updatedAt: serverTimestamp(),
      });
    }
  },

  removeMovie: async (userId: string, movieId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    await updateDoc(favoritesRef, {
      movieIds: arrayRemove(movieId),
      updatedAt: serverTimestamp(),
    });
  },

  addTVShow: async (userId: string, tvShowId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    const favorites = await favoritesService.get(userId);

    if (!favorites) {
      await setDoc(favoritesRef, {
        id: userId,
        userId,
        movieIds: [],
        tvShowIds: [tvShowId],
        actorIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(favoritesRef, {
        tvShowIds: arrayUnion(tvShowId),
        updatedAt: serverTimestamp(),
      });
    }
  },

  removeTVShow: async (userId: string, tvShowId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    await updateDoc(favoritesRef, {
      tvShowIds: arrayRemove(tvShowId),
      updatedAt: serverTimestamp(),
    });
  },

  addActor: async (userId: string, actorId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    const favorites = await favoritesService.get(userId);

    if (!favorites) {
      await setDoc(favoritesRef, {
        id: userId,
        userId,
        movieIds: [],
        tvShowIds: [],
        actorIds: [actorId],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(favoritesRef, {
        actorIds: arrayUnion(actorId),
        updatedAt: serverTimestamp(),
      });
    }
  },

  removeActor: async (userId: string, actorId: number) => {
    const favoritesRef = doc(db, COLLECTIONS.FAVORITES, userId);
    await updateDoc(favoritesRef, {
      actorIds: arrayRemove(actorId),
      updatedAt: serverTimestamp(),
    });
  },

  isFavorite: async (userId: string, itemId: number, type: 'movie' | 'tv' | 'actor'): Promise<boolean> => {
    const favorites = await favoritesService.get(userId);
    if (!favorites) return false;
    
    switch (type) {
      case 'movie':
        return favorites.movieIds.includes(itemId);
      case 'tv':
        return favorites.tvShowIds.includes(itemId);
      case 'actor':
        return favorites.actorIds.includes(itemId);
      default:
        return false;
    }
  },
};

// Reviews Service
export const reviewsService = {
  create: async (data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    const reviewData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(reviewsRef, reviewData);
    return { id: docRef.id, ...reviewData };
  },

  update: async (reviewId: string, data: Partial<Review>) => {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await updateDoc(reviewRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  delete: async (reviewId: string) => {
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await deleteDoc(reviewRef);
  },

  getByUser: async (userId: string): Promise<Review[]> => {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    const q = query(reviewsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review));
  },

  getByMovie: async (movieId: number): Promise<Review[]> => {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    const q = query(reviewsRef, where('movieId', '==', movieId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review));
  },

  getUserReviewForMovie: async (userId: string, movieId: number): Promise<Review | null> => {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    const q = query(reviewsRef, where('userId', '==', userId), where('movieId', '==', movieId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Review;
  },
};

// Recently Viewed Service
export const recentlyViewedService = {
  add: async (userId: string, item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    const recentlyViewedRef = doc(db, COLLECTIONS.RECENTLY_VIEWED, userId);
    const recentlyViewed = await recentlyViewedService.get(userId);

    const newItem: RecentlyViewedItem = {
      ...item,
      viewedAt: Timestamp.now(),
    };

    if (!recentlyViewed) {
      await setDoc(recentlyViewedRef, {
        id: userId,
        userId,
        items: [newItem],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      // Remove existing entry if present, then add new one at the beginning
      const filteredItems = recentlyViewed.items.filter((i) => !(i.id === item.id && i.type === item.type));
      const updatedItems = [newItem, ...filteredItems].slice(0, 50); // Keep only last 50 items

      await updateDoc(recentlyViewedRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });
    }
  },

  get: async (userId: string): Promise<RecentlyViewed | null> => {
    const recentlyViewedRef = doc(db, COLLECTIONS.RECENTLY_VIEWED, userId);
    const recentlyViewedSnap = await getDoc(recentlyViewedRef);
    return recentlyViewedSnap.exists() ? (recentlyViewedSnap.data() as RecentlyViewed) : null;
  },

  clear: async (userId: string) => {
    const recentlyViewedRef = doc(db, COLLECTIONS.RECENTLY_VIEWED, userId);
    await updateDoc(recentlyViewedRef, {
      items: [],
      updatedAt: serverTimestamp(),
    });
  },
};

// Search History Service
export const searchHistoryService = {
  add: async (userId: string, query: string) => {
    const searchHistoryRef = doc(db, COLLECTIONS.SEARCH_HISTORY, userId);
    const searchHistory = await searchHistoryService.get(userId);

    const newQuery = {
      query,
      searchedAt: Timestamp.now(),
    };

    if (!searchHistory) {
      await setDoc(searchHistoryRef, {
        id: userId,
        userId,
        queries: [newQuery],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      // Remove duplicate queries and add new one at the beginning
      const filteredQueries = searchHistory.queries.filter((q) => q.query !== query);
      const updatedQueries = [newQuery, ...filteredQueries].slice(0, 20); // Keep only last 20 queries

      await updateDoc(searchHistoryRef, {
        queries: updatedQueries,
        updatedAt: serverTimestamp(),
      });
    }
  },

  get: async (userId: string): Promise<SearchHistory | null> => {
    const searchHistoryRef = doc(db, COLLECTIONS.SEARCH_HISTORY, userId);
    const searchHistorySnap = await getDoc(searchHistoryRef);
    return searchHistorySnap.exists() ? (searchHistorySnap.data() as SearchHistory) : null;
  },

  clear: async (userId: string) => {
    const searchHistoryRef = doc(db, COLLECTIONS.SEARCH_HISTORY, userId);
    await updateDoc(searchHistoryRef, {
      queries: [],
      updatedAt: serverTimestamp(),
    });
  },
};

// Notifications Service
export const notificationsService = {
  create: async (data: Omit<Notification, 'id' | 'createdAt'>) => {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const notificationData = {
      ...data,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(notificationsRef, notificationData);
    return { id: docRef.id, ...notificationData };
  },

  markAsRead: async (notificationId: string) => {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  delete: async (notificationId: string) => {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await deleteDoc(notificationRef);
  },

  getByUser: async (userId: string, limitCount: number = 20): Promise<Notification[]> => {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification));
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  },
};
