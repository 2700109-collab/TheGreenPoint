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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ncts_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Decode the JWT payload to get user info
      try {
        const parts = token.split('.');
        const rawPayload = atob(parts[1]!);
        const payload = JSON.parse(rawPayload);
        if (payload.exp * 1000 > Date.now()) {
          setUser({
            id: payload.userId,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            tenantId: payload.tenantId,
          });
        } else {
          localStorage.removeItem('ncts_token');
          setToken(null);
        }
      } catch {
        localStorage.removeItem('ncts_token');
        setToken(null);
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const url = `${API_BASE}/auth/login`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (fetchErr) {
      throw new Error(`Network error: ${String(fetchErr)}`);
    }

    if (!res.ok) {
      let body: any = {};
      try {
        const text = await res.text();
        body = JSON.parse(text);
      } catch {
        // body stays empty
      }
      throw new Error(body.error || `Login failed (${res.status})`);
    }

    const rawText = await res.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error('Login response was not valid JSON');
    }

    localStorage.setItem('ncts_token', data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
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
