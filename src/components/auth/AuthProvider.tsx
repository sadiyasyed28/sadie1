import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthSession,
  AuthUser,
  fetchAuthUser,
  getStoredAuthSession,
  refreshAuthSession,
  signInWithPassword,
  signOutFromSupabase,
  storeAuthSession,
  supabaseAuthConfigured,
} from "../../services/auth";

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    storeAuthSession(null);
    setSession(null);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    if (!supabaseAuthConfigured) {
      setLoading(false);
      return;
    }

    const stored = getStoredAuthSession();
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const validSession = stored.expires_at * 1000 <= Date.now() + 60_000
        ? await refreshAuthSession(stored)
        : stored;
      const currentUser = await fetchAuthUser(validSession);
      const nextSession = { ...validSession, user: currentUser };
      storeAuthSession(nextSession);
      setSession(nextSession);
      setUser(currentUser);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!supabaseAuthConfigured) return;
    const refreshTimer = window.setInterval(async () => {
      const current = getStoredAuthSession();
      if (!current || current.expires_at * 1000 > Date.now() + 120_000) return;
      try {
        const refreshed = await refreshAuthSession(current);
        setSession(refreshed);
        setUser(refreshed.user);
      } catch {
        clearSession();
      }
    }, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithPassword(email, password);
    const currentUser = await fetchAuthUser(nextSession);
    const finalSession = { ...nextSession, user: currentUser };
    storeAuthSession(finalSession);
    setSession(finalSession);
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    const current = session || getStoredAuthSession();
    try {
      await signOutFromSupabase(current);
    } finally {
      clearSession();
    }
  }, [clearSession, session]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isConfigured: supabaseAuthConfigured,
    isDemoMode: !supabaseAuthConfigured,
    login,
    logout,
  }), [user, session, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
