import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  mfaSetup: () => [...authKeys.all, 'mfa-setup'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string | null;
  };
  requiresMfa?: boolean;
}

interface MfaVerifyPayload {
  code: string;
  sessionToken: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<LoginResponse>('/auth/login', credentials),
  });
}

export function useVerifyMfa() {
  return useMutation({
    mutationFn: (payload: MfaVerifyPayload) =>
      apiClient.post<LoginResponse>('/auth/mfa/verify', payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      apiClient.post<{ message: string }>('/auth/reset-password', payload),
  });
}

export function useRefreshSession() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ accessToken: string }>('/auth/refresh', {}),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ message: string }>('/auth/change-password', payload),
  });
}

export function useSetupMfa() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ qrCodeUrl: string; secret: string }>('/auth/mfa/setup', {}),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>('/auth/logout', {}),
  });
}

interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
}

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => apiClient.get<CurrentUser>('/auth/me'),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
