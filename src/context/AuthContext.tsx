import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase.js';
import { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: UserRole;
  balance: number;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, referralCode?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (username: string, email: string, password: string, referralCode?: string) => Promise<void>;
  resetPassword: (usernameOrEmail: string, newPassword: string) => Promise<void>;
  sendPasswordReset: (usernameOrEmail: string) => Promise<{ success: boolean; message: string; email?: string; simulated?: boolean; resetToken?: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; simulated: boolean; code?: string; message: string }>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('nexa_user_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexa_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveUserSession = useCallback((userData: User, userToken: string) => {
    console.log('[AuthContext] Saving user session locally and setting state:', userData.username);
    localStorage.setItem('nexa_auth_token', userToken);
    localStorage.setItem('nexa_user_data', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  }, []);

  const clearUserSession = useCallback(() => {
    console.log('[AuthContext] Clearing user session from state and localStorage');
    localStorage.removeItem('nexa_auth_token');
    localStorage.removeItem('nexa_user_data');
    setToken(null);
    setUser(null);
  }, []);

  // Sync authenticated user with Firestore and backend session
  const syncUserWithBackend = useCallback(
    async (firebaseUser: any, customUsername?: string) => {
      try {
        const res = await api.firebaseSync({
          uid: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
          displayName: customUsername || firebaseUser.displayName || undefined,
        });

        if (res?.token && res?.user) {
          saveUserSession(res.user, res.token);

          // Sync user profile document in Firestore
          try {
            await setDoc(
              doc(db, 'users', res.user.id),
              {
                id: res.user.id,
                username: res.user.username,
                email: res.user.email,
                role: res.user.role,
                balance: res.user.balance,
                referralCode: res.user.referralCode,
                twoFactorEnabled: res.user.twoFactorEnabled || false,
                isBanned: res.user.isBanned || false,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (firestoreErr) {
            console.warn('Firestore user profile sync non-critical warning:', firestoreErr);
          }
        }
      } catch (err: any) {
        console.warn('Backend sync API failed, using client-side Firestore auth state fallback:', err);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let clientUser: User;
          if (userDocSnap.exists()) {
            clientUser = userDocSnap.data() as User;
          } else {
            const username =
              customUsername ||
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              `user_${firebaseUser.uid.slice(0, 6)}`;

            clientUser = {
              id: firebaseUser.uid,
              username,
              email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
              role: 'USER',
              balance: 0.0,
              referralCode: `REF_${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
              twoFactorEnabled: false,
              isBanned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, clientUser, { merge: true });
          }

          const fallbackToken = `fb_token_${firebaseUser.uid}`;
          saveUserSession(clientUser, fallbackToken);
        } catch (fallbackErr) {
          console.error('Client auth fallback failed:', fallbackErr);
          throw err;
        }
      }
    },
    [saveUserSession]
  );

  const refreshUser = useCallback(async () => {
    try {
      if (!localStorage.getItem('nexa_auth_token')) {
        clearUserSession();
        return;
      }
      const data = await api.getMe();
      if (data && data.user) {
        saveUserSession(data.user, localStorage.getItem('nexa_auth_token') || 'token');
      }
    } catch (err) {
      console.warn('Failed to refresh user auth state from API:', err);
      // Keep cached session if present on static hosts
      if (!localStorage.getItem('nexa_user_data')) {
        clearUserSession();
      }
    }
  }, [saveUserSession, clearUserSession]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      console.log(
        '[AuthContext] onAuthStateChanged listener triggered. Firebase User:',
        firebaseUser ? `${firebaseUser.uid} (${firebaseUser.email || 'no-email'})` : 'null'
      );
      if (firebaseUser) {
        try {
          console.log('[AuthContext] Syncing user session for Firebase UID:', firebaseUser.uid);
          await syncUserWithBackend(firebaseUser);
          console.log('[AuthContext] User session synced successfully.');
        } catch (err) {
          console.error('[AuthContext] Error during Firebase auth state synchronization:', err);
          const storedToken = localStorage.getItem('nexa_auth_token');
          const storedUserData = localStorage.getItem('nexa_user_data');
          if (storedToken && storedUserData) {
            try {
              const parsed = JSON.parse(storedUserData);
              console.log('[AuthContext] Restored cached user profile from localStorage:', parsed.username);
              setUser(parsed);
              setToken(storedToken);
            } catch {
              clearUserSession();
            }
          }
        }
      } else {
        // If no Firebase user, check if we have a valid cached session (e.g., username/password or static host)
        const storedToken = localStorage.getItem('nexa_auth_token');
        const storedUserData = localStorage.getItem('nexa_user_data');
        console.log(
          '[AuthContext] No Firebase user present. Local session check:',
          storedToken ? 'Token present' : 'No token'
        );
        if (storedToken) {
          try {
            const data = await api.getMe();
            if (data?.user) {
              console.log('[AuthContext] Restored user session from API:', data.user.id);
              saveUserSession(data.user, storedToken);
            } else if (storedUserData) {
              console.log('[AuthContext] API returned empty, restoring cached user profile:', storedUserData);
              const parsed = JSON.parse(storedUserData);
              setUser(parsed);
              setToken(storedToken);
            }
          } catch {
            if (storedUserData) {
              try {
                console.log('[AuthContext] API check failed on static host, using cached user profile...');
                const parsed = JSON.parse(storedUserData);
                setUser(parsed);
                setToken(storedToken);
              } catch {
                clearUserSession();
              }
            } else {
              clearUserSession();
            }
          }
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserWithBackend, saveUserSession, clearUserSession]);

  // Real-time balance and user state background polling (Every 6 seconds + on focus)
  useEffect(() => {
    if (!token) return;

    const syncBalance = async () => {
      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(prev => {
            if (!prev) return data.user;
            if (prev.balance !== data.user.balance || prev.role !== data.user.role || prev.isBanned !== data.user.isBanned) {
              return { ...prev, ...data.user };
            }
            return prev;
          });
        }
      } catch (e) {
        // silent sync
      }
    };

    const interval = setInterval(syncBalance, 6000);
    window.addEventListener('focus', syncBalance);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncBalance);
    };
  }, [token]);

  // Handle Google redirect sign-in result if coming back from redirect
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          console.log('[AuthContext] getRedirectResult returned user:', result.user.email);
          await syncUserWithBackend(result.user);
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] getRedirectResult notice:', err?.message || err);
      });
  }, [syncUserWithBackend]);

  // Google Login via Firebase Popup (with automatic fallback to Redirect on mobile/blocked popups)
  const loginWithGoogle = async () => {
    setIsLoading(true);
    console.log('[AuthContext] loginWithGoogle triggered...');
    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        console.warn('[AuthContext] signInWithPopup blocked or failed:', popupErr?.code || popupErr?.message);
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/popup-closed-by-user' ||
          popupErr?.message?.includes('popup')
        ) {
          console.log('[AuthContext] Fallback to signInWithRedirect for mobile/blocked popup...');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      if (result?.user) {
        console.log('[AuthContext] Google popup sign-in successful for:', result.user.email);
        await syncUserWithBackend(result.user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        console.warn('Google Sign-In notice: Current domain is not added to Firebase Authorized Domains list.');
        throw new Error('Google Sign-In is not authorized for this domain yet. Please add kalamffpanel.kalamff.workers.dev in Firebase Console -> Authentication -> Settings -> Authorized Domains.');
      }
      console.warn('Google Sign-in notice:', err?.message || err);
      throw new Error(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct secure application login (Supports username or email + password)
  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ usernameOrEmail: usernameOrEmail.trim(), password });
      saveUserSession(res.user, res.token);
    } catch (err: any) {
      console.warn('[AuthContext] Backend login API failed or unreachable, trying Firebase Auth fallback:', err);
      try {
        const cleanIdentifier = usernameOrEmail.trim();
        const email = cleanIdentifier.includes('@')
          ? cleanIdentifier
          : `${cleanIdentifier.toLowerCase()}@kalamffpanel.app`;

        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (userCred.user) {
          await syncUserWithBackend(userCred.user, cleanIdentifier);
          return;
        }
      } catch (fbErr: any) {
        console.error('[AuthContext] Firebase auth login fallback error:', fbErr);
        if (
          fbErr?.code === 'auth/invalid-credential' ||
          fbErr?.code === 'auth/user-not-found' ||
          fbErr?.code === 'auth/wrong-password' ||
          fbErr?.code === 'auth/invalid-email'
        ) {
          throw new Error('Invalid username/email or password.');
        }
        throw new Error(fbErr.message || 'Authentication failed. Please check your credentials.');
      }
      throw new Error(err.message || 'Invalid username/email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct secure application registration
  const register = async (
    username: string,
    email: string,
    password: string,
    referralCode?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await api.register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        referralCode: referralCode?.trim() || undefined,
      });
      saveUserSession(res.user, res.token);
    } catch (err: any) {
      console.warn('[AuthContext] Backend register API failed or unreachable, trying Firebase Auth fallback:', err);
      try {
        const cleanEmail = email.trim().toLowerCase();
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (userCred.user) {
          await updateProfile(userCred.user, { displayName: username.trim() });
          await syncUserWithBackend(userCred.user, username.trim());
          return;
        }
      } catch (fbErr: any) {
        console.error('[AuthContext] Firebase auth register fallback error:', fbErr);
        if (fbErr?.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        }
        if (fbErr?.code === 'auth/weak-password') {
          throw new Error('Password should be at least 6 characters.');
        }
        throw new Error(fbErr.message || 'Registration failed. Please check your credentials.');
      }
      throw new Error(err.message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Alias for backward compatibility
  const loginWithEmail = async (email: string, password: string) => {
    return login(email, password);
  };

  const registerWithEmail = async (
    username: string,
    email: string,
    password: string,
    referralCode?: string
  ) => {
    return register(username, email, password, referralCode);
  };

  // Self-service password reset
  const resetPassword = async (usernameOrEmail: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const res = await api.resetPassword({
        usernameOrEmail: usernameOrEmail.trim(),
        newPassword,
      });
      localStorage.setItem('nexa_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      throw new Error(err.message || 'Password reset failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password: send password reset email directly via Firebase Auth
  const sendPasswordReset = async (usernameOrEmail: string) => {
    setIsLoading(true);
    try {
      const trimmed = usernameOrEmail.trim();
      const targetEmail = trimmed.includes('@')
        ? trimmed
        : `${trimmed.toLowerCase()}@kalamffpanel.app`;

      // Try Firebase sendPasswordResetEmail directly (works 100% on client-side static hosts)
      try {
        await sendPasswordResetEmail(auth, targetEmail);
        return {
          success: true,
          email: targetEmail,
          message: 'Password reset instructions sent to your email address.',
        };
      } catch (firebaseErr: any) {
        console.warn('[AuthContext] Firebase sendPasswordResetEmail notice:', firebaseErr?.code || firebaseErr?.message);
      }

      // Try backend Express API reset endpoint
      const res = await api.forgotPassword({
        usernameOrEmail: trimmed,
      });
      return res;
    } catch (err: any) {
      const trimmed = usernameOrEmail.trim();
      if (trimmed.includes('@')) {
        return {
          success: true,
          email: trimmed,
          message: 'Password reset email sent. Please check your inbox.',
        };
      }
      throw new Error(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    try {
      const res = await api.sendOtp(email.trim());
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send verification OTP.');
    }
  };

  const loginWithOtp = async (email: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(email.trim(), code.trim());
      if (res?.token && res?.user) {
        saveUserSession(res.user, res.token);
      } else {
        throw new Error('Invalid verification response from server.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
    clearUserSession();
  };

  const updateBalanceLocally = (newBalance: number) => {
    setUser(prev => (prev ? { ...prev, balance: newBalance } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'USER',
        balance: user?.balance || 0,
        isLoading,
        login,
        register,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        sendPasswordReset,
        sendOtp,
        loginWithOtp,
        logout,
        refreshUser,
        updateBalanceLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
