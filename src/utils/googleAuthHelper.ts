import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth, isRealFirebase } from '../firebase';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = (typeof window !== 'undefined') ? localStorage.getItem('google_access_token') : null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!isRealFirebase || !auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: any) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try reading from local storage
        const savedToken = localStorage.getItem('google_access_token');
        if (savedToken) {
          cachedAccessToken = savedToken;
          if (onAuthSuccess) onAuthSuccess(user, savedToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!isRealFirebase || !auth) {
    throw new Error('ระบบเซิร์ฟเวอร์ยังไม่ได้เชื่อมต่อ Firebase คลาวด์');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Sign-In');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem('google_access_token');
  }
  return cachedAccessToken;
};

export const setAccessTokenDirectly = (token: string) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('google_access_token', token);
  }
};

export const logoutGoogle = async () => {
  if (isRealFirebase && auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_access_token');
  }
};
