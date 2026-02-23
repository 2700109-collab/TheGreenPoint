import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isOperator: boolean;
  isRegulator: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api/v1';

// ── DEBUG HELPER ───────────────────────────────────────────────────
const DEBUG_PREFIX = '[AUTH-DEBUG]';
function authDebug(step: string, data?: unknown) {
  console.log(`${DEBUG_PREFIX} ${step}`, data !== undefined ? data : '');
}
// ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('ncts_token');
    authDebug('INIT token from localStorage', t ? `${t.substring(0, 30)}...` : null);
    return t;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authDebug('TOKEN-EFFECT triggered', { hasToken: !!token });
    if (token) {
      // Decode the JWT payload to get user info
      try {
        const parts = token.split('.');
        authDebug('JWT parts count', parts.length);
        const rawPayload = atob(parts[1]!);
        authDebug('JWT raw payload', rawPayload);
        const payload = JSON.parse(rawPayload);
        authDebug('JWT decoded payload', { ...payload, exp: payload.exp, expDate: new Date(payload.exp * 1000).toISOString(), now: new Date().toISOString() });
        if (payload.exp * 1000 > Date.now()) {
          const userObj = {
            id: payload.userId,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            tenantId: payload.tenantId,
          };
          authDebug('SET user from JWT', userObj);
          setUser(userObj);
        } else {
          authDebug('TOKEN EXPIRED — clearing', { exp: new Date(payload.exp * 1000).toISOString() });
          localStorage.removeItem('ncts_token');
          setToken(null);
        }
      } catch (err) {
        authDebug('JWT DECODE ERROR', { error: String(err), tokenPreview: token.substring(0, 50) });
        localStorage.removeItem('ncts_token');
        setToken(null);
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const url = `${API_BASE}/auth/login`;
    authDebug('LOGIN START', { url, email, passwordLength: password.length });
    authDebug('LOGIN window.location', { origin: window.location.origin, href: window.location.href });

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (fetchErr) {
      authDebug('LOGIN FETCH NETWORK ERROR', { error: String(fetchErr), url });
      throw new Error(`Network error: ${String(fetchErr)}`);
    }

    authDebug('LOGIN RESPONSE', { status: res.status, statusText: res.statusText, url: res.url, headers: Object.fromEntries(res.headers.entries()) });

    if (!res.ok) {
      let body: any = {};
      try {
        const text = await res.text();
        authDebug('LOGIN ERROR BODY (raw)', text);
        body = JSON.parse(text);
      } catch (parseErr) {
        authDebug('LOGIN ERROR BODY PARSE FAIL', String(parseErr));
      }
      throw new Error(body.error || `Login failed (${res.status})`);
    }

    const rawText = await res.text();
    authDebug('LOGIN SUCCESS BODY (raw)', rawText);
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      authDebug('LOGIN SUCCESS BODY PARSE FAIL', { error: String(parseErr), raw: rawText.substring(0, 200) });
      throw new Error('Login response was not valid JSON');
    }
    authDebug('LOGIN PARSED DATA', { hasAccessToken: !!data.accessToken, tokenPreview: data.accessToken?.substring(0, 30), user: data.user });

    localStorage.setItem('ncts_token', data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    authDebug('LOGIN COMPLETE — token stored, user set');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ncts_token');
    setToken(null);
    setUser(null);
  }, []);

  const isOperator = user?.role === 'operator_admin' || user?.role === 'operator_staff';
  const isRegulator = user?.role === 'regulator' || user?.role === 'inspector';

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isOperator, isRegulator }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
