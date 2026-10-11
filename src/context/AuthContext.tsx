import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
  demoLogin: (role: 'USER' | 'RESELLER' | 'ADMIN') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexa_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync authenticated user with Firestore and backend session
  const syncUserWithBackend = useCallback(async (firebaseUser: any, customUsername?: string) => {
    try {
      const res = await api.firebaseSync({
        uid: firebaseUser.uid,
        email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
        displayName: customUsername || firebaseUser.displayName || undefined,
      });

      if (res?.token && res?.user) {
        localStorage.setItem('nexa_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);

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
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
      throw err;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (!localStorage.getItem('nexa_auth_token')) {
        setUser(null);
        return;
      }
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user auth state:', err);
      localStorage.removeItem('nexa_auth_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await syncUserWithBackend(firebaseUser);
        } catch (err) {
          console.error('Error during Firebase auth state synchronization:', err);
          setUser(null);
          setToken(null);
          localStorage.removeItem('nexa_auth_token');
        }
      } else {
        // When not signed in via Firebase, strictly require user to log in first
        setUser(null);
        setToken(null);
        localStorage.removeItem('nexa_auth_token');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserWithBackend]);

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

  // Google Login via Firebase Popup
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserWithBackend(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (err?.code === 'auth/network-request-failed' || err?.message?.includes('network-request-failed') || err?.message?.includes('network')) {
        throw new Error('Google Sign-in network request failed (preview network restriction). Please use Email & Password login or Demo Login.');
      }
      throw new Error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase Email/Password Sign-In
  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        await syncUserWithBackend(result.user);
      }
    } catch (err: any) {
      console.error('Firebase Email sign-in failed:', err);
      // If Firebase email/password login fails (e.g. provider not yet enabled in console), try backend login
      try {
        const res = await api.login({ usernameOrEmail: email, password });
        localStorage.setItem('nexa_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      } catch (backendErr) {
        throw new Error(err.message || 'Login failed with the provided email and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase Email/Password Registration
  const registerWithEmail = async (
    username: string,
    email: string,
    password: string,
    referralCode?: string
  ) => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        await updateProfile(result.user, { displayName: username.trim() });
        await syncUserWithBackend(result.user, username.trim());
      }
    } catch (err: any) {
      console.error('Firebase Email registration failed:', err);
      // Fallback to backend registration if Firebase email provider needs activation
      try {
        const res = await api.register({ username, email, password, referralCode });
        localStorage.setItem('nexa_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      } catch (backendErr) {
        throw new Error(err.message || 'Registration failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Unified login
  const login = async (usernameOrEmail: string, password: string) => {
    if (usernameOrEmail.includes('@')) {
      await loginWithEmail(usernameOrEmail, password);
    } else {
      setIsLoading(true);
      try {
        const res = await api.login({ usernameOrEmail, password });
        localStorage.setItem('nexa_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Unified register
  const register = async (username: string, email: string, password: string, referralCode?: string) => {
    await registerWithEmail(username, email, password, referralCode);
  };

  const demoLogin = async (targetRole: 'USER' | 'RESELLER' | 'ADMIN') => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(targetRole);
      localStorage.setItem('nexa_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
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
    localStorage.removeItem('nexa_auth_token');
    setToken(null);
    setUser(null);
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
        demoLogin,
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
