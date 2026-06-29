import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authApi, setToken as saveToken, clearToken, getStoreId, getToken, type AuthPersistenceMode } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  tenantId: number;
  activeStoreId: number;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  storeId: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((u) => {
        if (abortController.signal.aborted) return;
        setUser(u);
        localStorage.setItem('active_store_id', String(u.activeStoreId));
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        clearToken();
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
    return () => abortController.abort();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const result = await authApi.login(email, password);
    const mode: AuthPersistenceMode = rememberMe ? 'local' : 'session';
    saveToken(result.token, mode);
    setUser(result.user);
    localStorage.setItem('active_store_id', String(result.user.activeStoreId));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('active_store_id');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const sid = getStoreId();
  const parsedSid = sid ? Number(sid) : NaN;
  const storeId = (!Number.isNaN(parsedSid) && parsedSid > 0) ? parsedSid : user?.activeStoreId ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, storeId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
