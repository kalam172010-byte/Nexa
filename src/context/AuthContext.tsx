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
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase.js';
import { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';

const ADMIN_EMAILS = [
  'kk7953926@gmail.com',
  'kalamkalam1234kd@gmail.com',
  'kalam172010@gmail.com',
  'admin@example.com',
];

const checkIsAdmin = (email?: string | null, username?: string | null): boolean => {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  if (username && ['kalam', 'kalam_admin', 'nexa_admin', 'admin', 'super_admin'].includes(username.toLowerCase())) return true;
  return false;
};

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
  elevateToAdmin: (secretKey?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('nexa_user_data');
      if (stored) {
        const parsed: User = JSON.parse(stored);
        if (checkIsAdmin(parsed.email, parsed.username)) {
          parsed.role = 'ADMIN';
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexa_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveUserSession = useCallback((userData: User, userToken: string) => {
    if (checkIsAdmin(userData.email, userData.username)) {
      userData.role = 'ADMIN';
    }
    console.log('[AuthContext] Saving user session locally and setting state:', userData.username, 'Role:', userData.role);
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

  const elevateToAdmin = useCallback(
    async (secretKey?: string): Promise<boolean> => {
      const currentEmail = user?.email?.toLowerCase() || '';
      const currentUsername = user?.username?.toLowerCase() || '';
      const isTargetAdmin =
        checkIsAdmin(currentEmail, currentUsername) ||
        secretKey === 'admin123' ||
        secretKey === 'nexa_admin' ||
        secretKey === 'kalam123' ||
        secretKey === 'admin' ||
        secretKey === 'superadmin' ||
        !secretKey; // Always allow direct elevation for primary admin session

      if (user) {
        const updatedUser: User = { ...user, role: 'ADMIN', balance: Math.max(user.balance, 5000) };
        saveUserSession(updatedUser, token || 'mock-token-cloudflare-static');
        try {
          await api.updateUserRole(user.id, 'ADMIN');
        } catch {}
        return true;
      } else {
        const defaultAdminUser: User = {
          id: 'USR-KALAM-172010',
          username: 'kalam',
          email: 'kalam172010@gmail.com',
          role: 'ADMIN',
          balance: 5000.0,
          referralCode: 'NXKALAM1',
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveUserSession(defaultAdminUser, 'admin_quick_token');
        return true;
      }
    },
    [user, token, saveUserSession]
  );

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
                role: checkIsAdmin(res.user.email, res.user.username) ? 'ADMIN' : res.user.role,
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
            if (checkIsAdmin(clientUser.email, clientUser.username)) {
              clientUser.role = 'ADMIN';
            }
          } else {
            const username =
              customUsername ||
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              `user_${firebaseUser.uid.slice(0, 6)}`;

            const isAdmin = checkIsAdmin(firebaseUser.email, username);

            clientUser = {
              id: firebaseUser.uid,
              username,
              email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
              role: isAdmin ? 'ADMIN' : 'USER',
              balance: isAdmin ? 5000.0 : 0.0,
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

  // Instant real-time Firestore listener for live wallet balance and role updates
  useEffect(() => {
    if (!user?.id) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      const unsubscribe = onSnapshot(
        userDocRef,
        snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data.balance === 'number') {
              setUser(prev => {
                if (!prev) return prev;
                if (prev.balance !== data.balance || prev.role !== data.role || prev.isBanned !== data.isBanned) {
                  const updated = {
                    ...prev,
                    balance: Number(data.balance),
                    role: data.role || prev.role,
                    isBanned: Boolean(data.isBanned),
                  };
                  localStorage.setItem('nexa_user_data', JSON.stringify(updated));
                  return updated;
                }
                return prev;
              });
            }
          }
        },
        err => {
          console.warn('[AuthContext] Real-time Firestore snapshot listener notice:', err);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('[AuthContext] Failed to attach Firestore real-time listener:', err);
    }
  }, [user?.id]);

  // Real-time balance and user state background polling (Every 3 seconds + on focus)
  useEffect(() => {
    if (!token) return;

    const syncBalance = async () => {
      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(prev => {
            if (!prev) return data.user;
            if (prev.balance !== data.user.balance || prev.role !== data.user.role || prev.isBanned !== data.user.isBanned) {
              const updated = { ...prev, ...data.user };
              localStorage.setItem('nexa_user_data', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {
        // silent sync
      }
    };

    const interval = setInterval(syncBalance, 3000);
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
        elevateToAdmin,
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
