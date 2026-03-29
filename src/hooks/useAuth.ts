import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { isDevMode, getActiveMockUserKey, MOCK_USERS_MAP, seedDevData } from '../data/mockUsers';

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
    // Check URL param on first render to activate dev mode
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('dev') === 'true') {
        localStorage.setItem('dcr-dev-mode', 'true');
        // Remove ?dev=true from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('dev');
        window.history.replaceState({}, '', url.toString());
      }
    }
    // In dev mode, resolve the mock user synchronously
    if (isDevMode()) {
      const key = getActiveMockUserKey();
      const mockUser = key ? MOCK_USERS_MAP[key] : null;
      return {
        user: mockUser?.authUser ?? null,
        isLoading: false,
        error: null,
      };
    }
    return { user: null, isLoading: true, error: null };
  });

  useEffect(() => {
    // In dev mode: seed Firestore with mock user docs so cross-user queries work,
    // then skip Firebase auth entirely.
    if (isDevMode()) {
      seedDevData().catch((e) => console.error('[DevMode] Failed to seed dev data:', e));
      return;
    }

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
    if (isDevMode()) {
      // In dev mode, sign-in is a no-op (use DevPanel to switch users)
      return { success: true };
    }
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
    if (isDevMode()) {
      localStorage.removeItem('dcr-mock-user');
      setState({ user: null, isLoading: false, error: null });
      window.location.reload();
      return;
    }
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
