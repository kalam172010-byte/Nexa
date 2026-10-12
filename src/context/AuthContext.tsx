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
  resetPassword: (usernameOrEmail: string, newPassword: string) => Promise<void>;
  sendOtp: (email: string) => Promise<{ success: boolean; simulated: boolean; code?: string; message: string }>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
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
          const storedToken = localStorage.getItem('nexa_auth_token');
          if (storedToken) {
            try {
              const data = await api.getMe();
              if (data?.user) {
                setUser(data.user);
                setToken(storedToken);
              } else {
                setUser(null);
                setToken(null);
                localStorage.removeItem('nexa_auth_token');
              }
            } catch {
              setUser(null);
              setToken(null);
              localStorage.removeItem('nexa_auth_token');
            }
          } else {
            setUser(null);
            setToken(null);
          }
        }
      } else {
        // If no Firebase user, check if we have a valid backend session token (e.g., Demo or password login)
        const storedToken = localStorage.getItem('nexa_auth_token');
        if (storedToken) {
          try {
            const data = await api.getMe();
            if (data?.user) {
              setUser(data.user);
              setToken(storedToken);
            } else {
              setUser(null);
              setToken(null);
              localStorage.removeItem('nexa_auth_token');
            }
          } catch {
            setUser(null);
            setToken(null);
            localStorage.removeItem('nexa_auth_token');
          }
        } else {
          setUser(null);
          setToken(null);
        }
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
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        console.warn('Google Sign-In notice: Current domain is not added to Firebase Authorized Domains list.');
        throw new Error('Google Sign-In is not enabled for this preview domain. Please sign in or register below using your Username or Email with password.');
      }
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        console.warn('Google Sign-In notice: popup blocked by browser.');
        throw new Error('Google Sign-In popup was blocked by browser. Please enable popups or sign in with your Username/Email.');
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In popup was closed. Please try again or use Username/Email login.');
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
      localStorage.setItem('nexa_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
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
      localStorage.setItem('nexa_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
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
        localStorage.setItem('nexa_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
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
        resetPassword,
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
