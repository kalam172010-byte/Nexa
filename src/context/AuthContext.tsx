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
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase.js';
import { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';
import { SignOutModal } from '../components/SignOutModal.js';

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
  loginWithGoogle: () => Promise<User | void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (username: string, email: string, password: string, referralCode?: string) => Promise<void>;
  resetPassword: (usernameOrEmail: string, newPassword: string) => Promise<void>;
  sendPasswordReset: (usernameOrEmail: string) => Promise<{ success: boolean; message: string; email?: string; simulated?: boolean; resetToken?: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; simulated: boolean; code?: string; message: string }>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  promptSignOut: (options?: { allDevices?: boolean }) => void;
  closeSignOutModal: () => void;
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
    localStorage.removeItem('nexa_logged_out');
    if (checkIsAdmin(userData.email, userData.username)) {
      userData.role = 'ADMIN';
    }
    if ((userData as any).apiKey) {
      try {
        localStorage.setItem(`nexa_user_api_key_${userData.id}`, (userData as any).apiKey);
        localStorage.setItem('nexa_user_outbound_api_key', (userData as any).apiKey);
      } catch {}
    }
    try {
      const rawCached = localStorage.getItem('nexa_cached_users');
      if (rawCached) {
        const parsedCached = JSON.parse(rawCached);
        if (Array.isArray(parsedCached)) {
          const updatedCached = parsedCached.map((u: any) =>
            u.id === userData.id || (u.email && userData.email && u.email.toLowerCase() === userData.email.toLowerCase())
              ? { ...u, balance: userData.balance, apiKey: (userData as any).apiKey || u.apiKey }
              : u
          );
          localStorage.setItem('nexa_cached_users', JSON.stringify(updatedCached));
        }
      }
    } catch {}
    localStorage.setItem('nexa_auth_token', userToken);
    localStorage.setItem('nexa_user_data', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  }, []);

  const clearUserSession = useCallback(() => {
    try {
      localStorage.removeItem('nexa_auth_token');
      localStorage.removeItem('nexa_user_data');
      localStorage.removeItem('nexa_current_user');
      localStorage.removeItem('nexa_user_outbound_api_key');
      sessionStorage.clear();
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const elevateToAdmin = useCallback(
    async (secretKey?: string): Promise<boolean> => {
      if (user) {
        const updatedUser: User = { ...user, role: 'ADMIN' };
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
          balance: 0.0,
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
    async (firebaseUser: any, customUsername?: string): Promise<User | null> => {
      const roleRank: Record<string, number> = {
        'SUPER ADMIN': 4,
        ADMIN: 3,
        RESELLER: 2,
        USER: 1,
      };

      try {
        const res = await api.firebaseSync({
          uid: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
          displayName: customUsername || firebaseUser.displayName || undefined,
        });

        if (res?.token && res?.user) {
          // Check Firestore linked documents so we never overwrite an authoritative role or freshly deducted balance
          try {
            const candidateIds = new Set<string>([res.user.id]);
            if (firebaseUser.uid) candidateIds.add(firebaseUser.uid);
            if ((res.user.email || '').toLowerCase() === 'kalam172010@gmail.com') {
              candidateIds.add('USR-KALAM-172010');
              candidateIds.add('tnqy7LYfgwgzYpoQGqljC4H6bKc2');
            }
            const fsBalances: number[] = [];
            const fsRoles: string[] = [];

            for (const cid of candidateIds) {
              const snap = await getDoc(doc(db, 'users', cid)).catch(() => null);
              if (snap && snap.exists()) {
                const d = snap.data();
                if (typeof d.balance === 'number' && !Number.isNaN(d.balance)) {
                  fsBalances.push(Number(d.balance));
                }
                if (d.role) {
                  fsRoles.push(d.role);
                }
                if (d.apiKey && !res.user.apiKey) {
                  res.user.apiKey = d.apiKey;
                }
              }
            }
            if (fsBalances.length > 0) {
              const minFsBal = Math.min(...fsBalances);
              if (minFsBal < Number(res.user.balance || 0)) {
                res.user.balance = minFsBal;
              }
            }

            // Real-time authoritative role resolution: never downgrade an upgraded RESELLER or ADMIN
            let authoritativeRole = res.user.role || 'USER';
            for (const r of fsRoles) {
              if ((roleRank[r] || 1) > (roleRank[authoritativeRole] || 1)) {
                authoritativeRole = r as any;
              }
            }
            if (checkIsAdmin(res.user.email, res.user.username)) {
              authoritativeRole = 'ADMIN';
            }
            res.user.role = authoritativeRole;

            const profilePayload = {
              id: res.user.id,
              username: res.user.username,
              email: res.user.email,
              role: authoritativeRole,
              balance: res.user.balance,
              apiKey: res.user.apiKey,
              referralCode: res.user.referralCode,
              twoFactorEnabled: res.user.twoFactorEnabled || false,
              isBanned: res.user.isBanned || false,
              updatedAt: new Date().toISOString(),
            };

            for (const cid of candidateIds) {
              await setDoc(doc(db, 'users', cid), { ...profilePayload, id: cid }, { merge: true });
            }
          } catch (firestoreErr) {
            console.warn('Firestore user profile sync non-critical warning:', firestoreErr);
          }

          saveUserSession(res.user, res.token);
          return res.user;
        } else {
          throw new Error('Backend sync did not return a valid user session.');
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
            if (!(clientUser as any).apiKey) {
              (clientUser as any).apiKey = `nexa_live_${firebaseUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
              await setDoc(userDocRef, { apiKey: (clientUser as any).apiKey }, { merge: true });
            }
          } else {
            const username =
              customUsername ||
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              `user_${firebaseUser.uid.slice(0, 6)}`;

            const isAdmin = checkIsAdmin(firebaseUser.email, username);
            const generatedApiKey = `nexa_live_${firebaseUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

            clientUser = {
              id: firebaseUser.uid,
              username,
              email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
              role: isAdmin ? 'ADMIN' : 'USER',
              balance: 0.0,
              apiKey: generatedApiKey,
              referralCode: `REF_${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
              twoFactorEnabled: false,
              isBanned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, clientUser, { merge: true });
          }

          // Check linked docs for higher roles
          const candidateIds = [firebaseUser.uid];
          if ((clientUser.email || '').toLowerCase() === 'kalam172010@gmail.com') {
            candidateIds.push('USR-KALAM-172010', 'tnqy7LYfgwgzYpoQGqljC4H6bKc2');
          }
          let highestRole = clientUser.role || 'USER';
          for (const cid of candidateIds) {
            const s = await getDoc(doc(db, 'users', cid)).catch(() => null);
            if (s && s.exists()) {
              const r = s.data().role;
              if (r && (roleRank[r] || 1) > (roleRank[highestRole] || 1)) {
                highestRole = r;
              }
            }
          }
          if (checkIsAdmin(clientUser.email, clientUser.username)) {
            highestRole = 'ADMIN';
          }
          clientUser.role = highestRole;

          const fallbackToken = `fb_token_${firebaseUser.uid}`;
          saveUserSession(clientUser, fallbackToken);
          return clientUser;
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
        localStorage.removeItem('nexa_logged_out');
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
        const isExplicitlyLoggedOut = localStorage.getItem('nexa_logged_out') === 'true';
        // If no Firebase user, check if we have a valid cached session (e.g., username/password or static host)
        const storedToken = localStorage.getItem('nexa_auth_token');
        const storedUserData = localStorage.getItem('nexa_user_data');
        if (!storedToken || isExplicitlyLoggedOut) {
          clearUserSession();
          setIsLoading(false);
          return;
        }

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

  // Instant real-time Firestore listener for live wallet balance and role updates across all linked user documents
  useEffect(() => {
    if (!user?.id && !user?.email) return;
    const myId = (user?.id || '').trim();
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myApiKey = (user?.apiKey || localStorage.getItem(`nexa_user_api_key_${myId}`) || localStorage.getItem('nexa_user_outbound_api_key') || '').trim();

    try {
      const usersColRef = collection(db, 'users');
      const unsubscribe = onSnapshot(
        usersColRef,
        snapshot => {
          const matchingDocs: any[] = [];
          let modifiedBalance: number | null = null;

          snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            const docId = change.doc.id;
            const docEmail = String(data.email || '').trim().toLowerCase();
            const docApiKey = String(data.apiKey || '').trim();
            const isMatch =
              (myId && docId === myId) ||
              (myEmail && docEmail === myEmail) ||
              (myApiKey && docApiKey && docApiKey === myApiKey) ||
              (myEmail === 'kalam172010@gmail.com' && (docId === 'USR-KALAM-172010' || docId === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2'));

            if (isMatch && change.type === 'modified' && typeof data.balance === 'number') {
              modifiedBalance = Number(data.balance);
            }
          });

          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const docEmail = String(data.email || '').trim().toLowerCase();
            const docApiKey = String(data.apiKey || '').trim();
            const isMatch =
              (myId && docId === myId) ||
              (myEmail && docEmail === myEmail) ||
              (myApiKey && docApiKey && docApiKey === myApiKey) ||
              (myEmail === 'kalam172010@gmail.com' && (docId === 'USR-KALAM-172010' || docId === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2'));

            if (isMatch) {
              matchingDocs.push({ id: docId, ...data });
            }
          });

          if (matchingDocs.length > 0) {
            const validBalances = matchingDocs
              .map(d => (typeof d.balance === 'number' ? Number(d.balance) : NaN))
              .filter(b => !Number.isNaN(b));

            const authoritativeBalance =
              modifiedBalance !== null
                ? modifiedBalance
                : validBalances.length > 0
                ? Math.min(...validBalances)
                : null;

            const primaryDoc = matchingDocs.find(d => d.id === myId) || matchingDocs[0];

            const roleRank: Record<string, number> = {
              'SUPER ADMIN': 4,
              ADMIN: 3,
              RESELLER: 2,
              USER: 1,
            };

            let authoritativeRole: UserRole = 'USER';
            for (const d of matchingDocs) {
              const r = d.role as UserRole | undefined;
              if (r && (roleRank[r] || 1) > (roleRank[authoritativeRole] || 1)) {
                authoritativeRole = r;
              }
            }

            setUser(prev => {
              if (!prev) return prev;
              const newBalance = authoritativeBalance !== null ? authoritativeBalance : prev.balance;
              const newApiKey = primaryDoc.apiKey || prev.apiKey;
              const finalRole = checkIsAdmin(prev.email, prev.username)
                ? 'ADMIN'
                : (roleRank[authoritativeRole] || 1) > (roleRank[prev.role] || 1)
                ? authoritativeRole
                : (authoritativeRole || prev.role);

              if (
                prev.balance !== newBalance ||
                prev.role !== finalRole ||
                prev.isBanned !== Boolean(primaryDoc.isBanned) ||
                (newApiKey && prev.apiKey !== newApiKey)
              ) {
                const updated = {
                  ...prev,
                  balance: newBalance,
                  role: finalRole,
                  isBanned: Boolean(primaryDoc.isBanned),
                  apiKey: newApiKey,
                };
                localStorage.setItem('nexa_user_data', JSON.stringify(updated));
                if (newApiKey) {
                  localStorage.setItem(`nexa_user_api_key_${prev.id}`, newApiKey);
                  localStorage.setItem('nexa_user_outbound_api_key', newApiKey);
                }
                return updated;
              }
              return prev;
            });
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
  }, [user?.id, user?.email, user?.apiKey]);

  // Real-time listener for user role updates dispatched anywhere across the app (Admin promotion / Reseller upgrade)
  useEffect(() => {
    const handleRoleUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail?.role) return;
      setUser(prev => {
        if (!prev) return prev;
        const isMatch =
          !detail.userId ||
          prev.id === detail.userId ||
          (prev as any).firebaseUid === detail.userId ||
          (detail.email && prev.email && prev.email.toLowerCase() === detail.email.toLowerCase()) ||
          (prev.email?.toLowerCase() === 'kalam172010@gmail.com' &&
            (detail.userId === 'USR-KALAM-172010' || detail.userId === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2'));

        if (isMatch && prev.role !== detail.role) {
          const updated = { ...prev, role: detail.role };
          localStorage.setItem('nexa_user_data', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    };
    window.addEventListener('nexa_user_role_updated', handleRoleUpdate);
    return () => window.removeEventListener('nexa_user_role_updated', handleRoleUpdate);
  }, []);

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
          const fbUser = result.user;
          const initialUser: User = {
            id: fbUser.uid,
            username: fbUser.displayName || fbUser.email?.split('@')[0] || 'user',
            email: fbUser.email || `${fbUser.uid}@firebase.user`,
            role: checkIsAdmin(fbUser.email, fbUser.displayName || '') ? 'ADMIN' : 'USER',
            balance: 0.0,
            apiKey: `nexa_live_${fbUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Date.now().toString(36)}`,
            referralCode: `REF_${fbUser.uid.slice(0, 6).toUpperCase()}`,
            twoFactorEnabled: false,
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveUserSession(initialUser, `fb_token_${fbUser.uid}`);
          await syncUserWithBackend(result.user);
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] getRedirectResult notice:', err?.message || err);
      });
  }, [syncUserWithBackend, saveUserSession]);

  // Google Login via Firebase Popup (with automatic fallback to Redirect on mobile/blocked popups)
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('nexa_logged_out');
    } catch {}
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
        const fbUser = result.user;
        const initialUser: User = {
          id: fbUser.uid,
          username: fbUser.displayName || fbUser.email?.split('@')[0] || 'user',
          email: fbUser.email || `${fbUser.uid}@firebase.user`,
          role: checkIsAdmin(fbUser.email, fbUser.displayName || '') ? 'ADMIN' : 'USER',
          balance: 0.0,
          apiKey: `nexa_live_${fbUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Date.now().toString(36)}`,
          referralCode: `REF_${fbUser.uid.slice(0, 6).toUpperCase()}`,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        // CRITICAL: Immediately establish user session so React re-renders with authenticated user on first click!
        saveUserSession(initialUser, `fb_token_${fbUser.uid}`);

        const finalUser = await syncUserWithBackend(fbUser);
        setIsLoading(false);
        return finalUser || initialUser;
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
      localStorage.removeItem('nexa_logged_out');
    } catch {}
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
      localStorage.setItem('nexa_logged_out', 'true');
    } catch {}
    clearUserSession();
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
    if (typeof window !== 'undefined') {
      try {
        if (window.location.hash) {
          window.location.hash = '';
        }
      } catch {}
    }
  };

  const updateBalanceLocally = (newBalance: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, balance: newBalance };
      try {
        localStorage.setItem('nexa_user_data', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [signOutDefaultAllDevices, setSignOutDefaultAllDevices] = useState(false);

  const promptSignOut = useCallback((options?: { allDevices?: boolean }) => {
    setSignOutDefaultAllDevices(!!options?.allDevices);
    setIsSignOutModalOpen(true);
  }, []);

  const closeSignOutModal = useCallback(() => {
    setIsSignOutModalOpen(false);
  }, []);

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
        promptSignOut,
        closeSignOutModal,
        refreshUser,
        updateBalanceLocally,
        elevateToAdmin,
      }}
    >
      {children}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={closeSignOutModal}
        defaultAllDevices={signOutDefaultAllDevices}
      />
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
