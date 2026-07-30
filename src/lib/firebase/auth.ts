import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  // Sign up with email/password
  signUp: async (email: string, password: string, displayName: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  },

  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const userCredential = await signInWithPopup(auth, googleProvider);
    return userCredential.user;
  },

  // Sign out
  signOut: async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await firebaseSignOut(auth);
  },

  // Password reset
  resetPassword: async (email: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await sendPasswordResetEmail(auth, email);
  },

  // Get current user
  getCurrentUser: (): User | null => {
    if (!auth) return null;
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
};
