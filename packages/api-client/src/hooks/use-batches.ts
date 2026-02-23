import { useQuery } from '@tanstack/react-query';
import type { Batch, PaginatedResponse } from '@ncts/shared-types';
import { apiClient } from '../client';

export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...batchKeys.lists(), params] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
};

export function useBatches(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: batchKeys.list(params ?? {}),
    queryFn: () => apiClient.get<PaginatedResponse<Batch>>('/batches', params),
    staleTime: 60_000,
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: () => apiClient.get<Batch>(`/batches/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}
