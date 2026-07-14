import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AuthSession,
  completeNewPassword as completeCognitoNewPassword,
  NewPasswordChallenge,
  refreshAuthSession,
  signInWithPassword,
} from '@/services/cognito';
import {
  deleteStoredValue,
  getStoredValue,
  setStoredValue,
} from '@/services/storage';

const SESSION_STORAGE_KEY = 'investment-retro-auth-session-v1';
const REFRESH_EARLY_MS = 60_000;

type AuthContextValue = {
  session: AuthSession | null;
  initializing: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<NewPasswordChallenge | null>;
  completeNewPassword: (
    challenge: NewPasswordChallenge,
    newPassword: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthSession> | null>(null);

  const persistSession = useCallback(async (nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);

    if (nextSession) {
      await setStoredValue(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    } else {
      await deleteStoredValue(SESSION_STORAGE_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    const current = sessionRef.current;

    if (!current) {
      throw new Error('尚未登入。');
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refreshAuthSession(current)
        .then(async (nextSession) => {
          await persistSession(nextSession);
          return nextSession;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, [persistSession]);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const raw = await getStoredValue(SESSION_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const restored = JSON.parse(raw) as AuthSession;
        sessionRef.current = restored;

        if (restored.expiresAt > Date.now() + REFRESH_EARLY_MS) {
          if (active) {
            setSession(restored);
          }
          return;
        }

        const refreshed = await refreshAuthSession(restored);

        if (active) {
          await persistSession(refreshed);
        }
      } catch {
        if (active) {
          await persistSession(null);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, [persistSession]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const result = await signInWithPassword(username.trim(), password);

      if (result.type === 'NEW_PASSWORD_REQUIRED') {
        return result;
      }

      await persistSession(result.session);
      return null;
    },
    [persistSession]
  );

  const completeNewPassword = useCallback(
    async (challenge: NewPasswordChallenge, newPassword: string) => {
      const nextSession = await completeCognitoNewPassword(challenge, newPassword);
      await persistSession(nextSession);
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    await persistSession(null);
  }, [persistSession]);

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current;

    if (!current) {
      throw new Error('尚未登入。');
    }

    if (current.expiresAt <= Date.now() + REFRESH_EARLY_MS) {
      const refreshed = await refresh();
      return refreshed.accessToken;
    }

    return current.accessToken;
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      isAuthenticated: Boolean(session),
      signIn,
      completeNewPassword,
      signOut,
      getAccessToken,
    }),
    [session, initializing, signIn, completeNewPassword, signOut, getAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
