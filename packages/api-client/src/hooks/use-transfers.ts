import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Transfer,
  PaginatedResponse,
  CreateTransferDto,
  AcceptTransferDto,
  RejectTransferDto,
} from '@ncts/shared-types';
import { apiClient } from '../client';

export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...transferKeys.lists(), params] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
};

export function useTransfers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: transferKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<Transfer>>('/transfers', params),
  });
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => apiClient.get<Transfer>(`/transfers/${id}`),
    enabled: !!id,
  });
}

export function useInitiateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferDto) => apiClient.post<Transfer>('/transfers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: transferKeys.lists() }); },
  });
}

export function useAcceptTransfer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AcceptTransferDto) => apiClient.patch<Transfer>(`/transfers/${id}/accept`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferKeys.detail(id) });
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

export function useRejectTransfer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RejectTransferDto) => apiClient.patch<Transfer>(`/transfers/${id}/reject`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferKeys.detail(id) });
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}
