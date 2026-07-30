/**
 * Firebase Admin SDK Initialization
 * 
 * Server-side only - for API routes
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export async function initAdmin(): Promise<App | null> {
  // Return existing instance if available
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    // Check for service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!serviceAccount || !projectId) {
      console.warn('[Firebase Admin] No service account credentials found');
      return null;
    }

    // Parse service account JSON
    const credentials = JSON.parse(serviceAccount);

    // Initialize admin app
    adminApp = initializeApp({
      credential: cert(credentials),
      projectId,
    });

    console.log('[Firebase Admin] Initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error);
    return null;
  }
}

/**
 * Get Firebase Admin Auth
 */
export async function getAdminAuth() {
  const app = await initAdmin();
  if (!app) return null;
  return getAuth(app);
}

/**
 * Get Firebase Admin Firestore
 */
export async function getAdminFirestore() {
  const app = await initAdmin();
  if (!app) return null;
  return getFirestore(app);
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(token: string) {
  const auth = await getAdminAuth();
  if (!auth) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('[Firebase Admin] Token verification failed:', error);
    throw new Error('Invalid token');
  }
}
