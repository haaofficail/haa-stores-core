// Auth API client — TASK-0038 / marketplace hardening P0-#1
//
// Wires the storefront to the existing /api/auth/* backend.
// The backend endpoints (POST /auth/register, POST /auth/login,
// GET /auth/me) were already implemented in apps/api/src/routes/auth.ts,
// but the storefront was never wired — the login form was hardcoded
// to show "قريبًا" (coming soon). This file closes that gap.
//
// Token storage: localStorage. Sufficient for a B2B merchant dashboard
// where the merchant owns the device. For higher security, switch to
// HttpOnly cookies via a /auth/set-cookie endpoint (Phase 7 follow-up).

import { request } from './api';

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  tenantId: number;
  activeStoreId: number;
  roles: string[];
  permissions: string[];
};

export type Store = {
  id: number;
  name: string;
  slug: string;
};

export type AuthSession = {
  token: string;
  user: User;
  store: Store | null;
};

const TOKEN_KEY = 'haa.auth.token';
const SESSION_KEY = 'haa.auth.session';

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const session = await request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    persistSession(session);
    return session;
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    storeName: string;
    storeSlug: string;
  }): Promise<AuthSession> {
    const session = await request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    persistSession(session);
    return session;
  },

  async me(): Promise<User | null> {
    const token = getToken();
    if (!token) return null;
    try {
      return await request<User>('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Token expired or invalid — clear session silently.
      clearSession();
      return null;
    }
  },

  logout(): void {
    clearSession();
  },

  getToken,
  getSession,
};

function persistSession(session: AuthSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to no persistence.
    // The session is still valid for the current page lifetime via the in-memory
    // response, but the user will need to log in again after a refresh.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}
