import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const ALLOWED_DOMAIN = '@develeap.com';
// External accounts allowed outside the develeap domain
const ALLOWED_EMAILS = ['izhaklatovski@gmail.com'];

// Convert Firebase errors to user-friendly messages
function getFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred';
  }

  const message = error.message.toLowerCase();

  // Firebase auth errors
  if (message.includes('popup-closed-by-user')) {
    return 'Sign in was cancelled';
  }
  if (message.includes('popup-blocked')) {
    return 'Pop-up was blocked. Please allow pop-ups for this site';
  }
  if (message.includes('network-request-failed')) {
    return 'Network error. Please check your connection';
  }
  if (message.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later';
  }
  if (message.includes('configuration-not-found')) {
    return 'Authentication is not configured properly';
  }
  if (message.includes('unauthorized-domain')) {
    return 'This domain is not authorized for authentication';
  }

  // Generic error - remove "Firebase: Error (auth/...)" prefix
  const cleanMessage = error.message.replace(/^Firebase:\s*Error\s*\(auth\/[^)]+\)\.?\s*/i, '');
  return cleanMessage || 'Failed to sign in';
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    return { user: null, isLoading: true, error: null };
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Validate email domain
        const email = firebaseUser.email ?? '';
        if (!email.endsWith(ALLOWED_DOMAIN) && !ALLOWED_EMAILS.includes(email)) {
          firebaseSignOut(auth);
          setState({
            user: null,
            isLoading: false,
            error: `Only ${ALLOWED_DOMAIN} emails are allowed`,
          });
          return;
        }

        setState({
          user: {
            uid: firebaseUser.uid,
            email,
            displayName: firebaseUser.displayName || email.split('@')[0],
            photoURL: firebaseUser.photoURL,
          },
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (error: unknown) {
      const errorMsg = getFriendlyErrorMessage(error);
      setState((prev) => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isLoggedIn: !!state.user,
    signInWithGoogle,
    signOut,
    clearError,
  };
}
